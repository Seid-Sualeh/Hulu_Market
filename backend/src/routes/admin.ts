import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { requireAdmin } from "../middleware/auth.js";

export const adminRouter = Router();

/**
 * Middleware: RBAC Enforcement
 * Ensures only users with admin role can access administrative endpoints.
 */
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/overview
 * Returns platform analytics and overview counters.
 */
adminRouter.get("/overview", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [userCountRows]: [RowDataPacket[], unknown] = await pool.query(
      "SELECT COUNT(*) AS totalUsers, COALESCE(SUM(balance), 0) AS totalBalance FROM users"
    );

    const [channelCountRows]: [RowDataPacket[], unknown] = await pool.query(
      `SELECT 
        COUNT(*) AS totalChannels,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeChannels,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS soldChannels,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingChannels
       FROM channels`
    );

    const [txCountRows]: [RowDataPacket[], unknown] = await pool.query(
      `SELECT 
        COUNT(*) AS totalTransactions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingTransactions,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'approved' THEN amount ELSE 0 END), 0) AS totalDeposited,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'approved' THEN amount ELSE 0 END), 0) AS totalWithdrawn
       FROM transactions`
    );

    const [recentUsers]: [RowDataPacket[], unknown] = await pool.query(
      "SELECT id, first_name, last_name, email, phone, role, created_at FROM users ORDER BY id DESC LIMIT 5"
    );

    const [recentTx]: [RowDataPacket[], unknown] = await pool.query(
      `SELECT t.*, u.email as user_email, CONCAT(u.first_name, ' ', u.last_name) as user_name 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       ORDER BY t.id DESC LIMIT 5`
    );

    res.json({
      success: true,
      stats: {
        totalUsers: Number(userCountRows[0]?.totalUsers || 0),
        totalUserBalance: Number(userCountRows[0]?.totalBalance || 0),
        totalChannels: Number(channelCountRows[0]?.totalChannels || 0),
        activeChannels: Number(channelCountRows[0]?.activeChannels || 0),
        soldChannels: Number(channelCountRows[0]?.soldChannels || 0),
        pendingChannels: Number(channelCountRows[0]?.pendingChannels || 0),
        totalTransactions: Number(txCountRows[0]?.totalTransactions || 0),
        pendingTransactions: Number(txCountRows[0]?.pendingTransactions || 0),
        totalDeposited: Number(txCountRows[0]?.totalDeposited || 0),
        totalWithdrawn: Number(txCountRows[0]?.totalWithdrawn || 0),
      },
      recentUsers,
      recentTransactions: recentTx,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Admin Overview Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users
 * Returns list of registered users.
 */
adminRouter.get("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : null;
    let query = "SELECT id, first_name, last_name, email, phone, balance, locked_balance, role, created_at FROM users";
    const params: (string | number)[] = [];

    if (search) {
      query += " WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?";
      params.push(search, search, search, search);
    }

    query += " ORDER BY id DESC LIMIT 100";

    const [users]: [RowDataPacket[], unknown] = await pool.query(query, params);
    res.json({ success: true, users });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Updates role or balance for a user.
 */
adminRouter.patch("/users/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    const { role, balance } = req.body;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (role && (role === "admin" || role === "user")) {
      updates.push("role = ?");
      params.push(role);
    }

    if (balance !== undefined && !isNaN(Number(balance))) {
      updates.push("balance = ?");
      params.push(Number(balance));
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: "No valid fields to update" });
      return;
    }

    params.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    res.json({ success: true, message: `User #${userId} updated successfully` });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/admin/channels
 * Returns channel and digital product listings with seller details and filtering.
 */
adminRouter.get("/channels", async (req: Request, res: Response): Promise<void> => {
  try {
    const listingType = req.query.listing_type ? String(req.query.listing_type) : null;
    const status = req.query.status ? String(req.query.status) : null;

    let query = `
      SELECT c.*, 
             c.name as title,
             u.first_name as seller_first_name, 
             u.last_name as seller_last_name, 
             u.email as seller_email,
             u.phone as seller_registered_phone
      FROM channels c
      LEFT JOIN users u ON c.seller_id = u.id
    `;
    const conditions: string[] = [];
    const params: string[] = [];

    if (listingType && listingType !== "all") {
      if (listingType.toLowerCase() === "social-media") {
        conditions.push("(LOWER(c.listing_type) = 'social-media' OR c.listing_type IS NULL)");
      } else {
        conditions.push("LOWER(c.listing_type) = LOWER(?)");
        params.push(listingType);
      }
    }

    if (status && status !== "all") {
      conditions.push("LOWER(c.status) = LOWER(?)");
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY c.id DESC";

    const [channels]: [RowDataPacket[], unknown] = await pool.query(query, params);
    res.json({ success: true, channels });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/admin/channels/:id/approve
 * Atomically approves a pending listing (digital product or social media channel).
 * Requires admin role, runs inside a transaction, and records audit metadata.
 */
adminRouter.post("/channels/:id/approve", async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const channelId = parseInt(req.params.id as string, 10);
    if (isNaN(channelId)) {
      res.status(400).json({ success: false, error: "Invalid listing ID." });
      return;
    }

    const adminId = req.user!.id;

    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM channels WHERE id = ? FOR UPDATE",
      [channelId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Listing not found." });
      return;
    }

    const channel = rows[0];

    // Prevent repeated or conflicting review actions
    if (channel.status !== "pending") {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: `Listing #${channelId} cannot be approved because its current status is '${channel.status}'. Only pending listings can be approved.`,
      });
      return;
    }

    // Preserve and update digital_metadata with moderation audit
    let metaObj: Record<string, unknown> = {};
    if (channel.digital_metadata) {
      try {
        metaObj = JSON.parse(channel.digital_metadata);
      } catch {
        metaObj = {};
      }
    }
    metaObj.moderation = {
      admin_id: adminId,
      action: "approved",
      decision_at: new Date().toISOString(),
    };
    const updatedMetadata = JSON.stringify(metaObj);

    await conn.query(
      `UPDATE channels SET
        status = 'active',
        rejection_reason = NULL,
        reviewed_by = ?,
        reviewed_at = NOW(),
        digital_metadata = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [adminId, updatedMetadata, channelId]
    );

    await conn.commit();

    // Seller notification
    if (channel.seller_id) {
      try {
        const isDigital = channel.listing_type === "ebooks-digital";
        const title = isDigital
          ? "Digital Product Approved & Published! 🎉"
          : "Channel Listing Approved & Published! 🎉";
        const message = isDigital
          ? `Congratulations! Your digital product "${channel.name}" (${channel.subcategory || "Digital"}) has been approved by the administrator and is now live in the marketplace.`
          : `Congratulations! Your channel listing "${channel.name}" (${channel.platform}) has been approved by the administrator and is now live in the marketplace.`;

        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
           VALUES (?, 'marketplace', ?, ?, '/my-marketplace', 'View Listing')`,
          [channel.seller_id, title, message]
        );
      } catch { /* ignore notification errors */ }
    }

    res.json({
      success: true,
      message: `Listing #${channelId} approved and published successfully.`,
      channelId,
      status: "active",
      reviewed_by: adminId,
    });
  } catch (error: unknown) {
    await conn.rollback();
    const err = error as Error;
    console.error("[Admin Approve Channel Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/admin/channels/:id/reject
 * Atomically rejects a pending listing with a mandatory non-empty reason.
 * Requires admin role, runs inside a transaction, and records audit metadata.
 */
adminRouter.post("/channels/:id/reject", async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const channelId = parseInt(req.params.id as string, 10);
    if (isNaN(channelId)) {
      res.status(400).json({ success: false, error: "Invalid listing ID." });
      return;
    }

    const rawReason = req.body.reason || req.body.rejectionReason;
    const reason = typeof rawReason === "string" ? rawReason.trim() : "";

    if (!reason || reason.length < 3) {
      res.status(400).json({
        success: false,
        error: "A non-empty rejection reason (minimum 3 characters) is required to reject a listing.",
      });
      return;
    }

    if (reason.length > 1000) {
      res.status(400).json({
        success: false,
        error: "Rejection reason must not exceed 1,000 characters.",
      });
      return;
    }

    const adminId = req.user!.id;

    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM channels WHERE id = ? FOR UPDATE",
      [channelId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Listing not found." });
      return;
    }

    const channel = rows[0];

    // Prevent repeated or conflicting review actions
    if (channel.status !== "pending") {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: `Listing #${channelId} cannot be rejected because its current status is '${channel.status}'. Only pending listings can be reviewed.`,
      });
      return;
    }

    // Preserve and update digital_metadata with moderation audit
    let metaObj: Record<string, unknown> = {};
    if (channel.digital_metadata) {
      try {
        metaObj = JSON.parse(channel.digital_metadata);
      } catch {
        metaObj = {};
      }
    }
    metaObj.moderation = {
      admin_id: adminId,
      action: "rejected",
      reason: reason,
      decision_at: new Date().toISOString(),
    };
    const updatedMetadata = JSON.stringify(metaObj);

    await conn.query(
      `UPDATE channels SET
        status = 'rejected',
        rejection_reason = ?,
        reviewed_by = ?,
        reviewed_at = NOW(),
        digital_metadata = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [reason, adminId, updatedMetadata, channelId]
    );

    await conn.commit();

    // Seller notification
    if (channel.seller_id) {
      try {
        const isDigital = channel.listing_type === "ebooks-digital";
        const title = isDigital
          ? "Digital Product Needs Revision"
          : "Channel Listing Needs Revision";
        const message = isDigital
          ? `Your digital product "${channel.name}" was not approved. Reason: ${reason}. You can correct the information and resubmit it for review.`
          : `Your channel listing "${channel.name}" was not approved. Reason: ${reason}. You can correct the information and resubmit it for review.`;

        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
           VALUES (?, 'marketplace', ?, ?, '/my-marketplace', 'Review & Resubmit')`,
          [channel.seller_id, title, message]
        );
      } catch { /* ignore notification errors */ }
    }

    res.json({
      success: true,
      message: `Listing #${channelId} marked as rejected.`,
      channelId,
      status: "rejected",
      rejectionReason: reason,
      reviewed_by: adminId,
    });
  } catch (error: unknown) {
    await conn.rollback();
    const err = error as Error;
    console.error("[Admin Reject Channel Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/admin/channels
 * Creates a new channel listing.
 */
adminRouter.post("/channels", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, platform, category, subscribers, views_or_likes, price, link_url, status } = req.body;

    if (!name || !platform || !price) {
      res.status(400).json({ success: false, error: "Name, platform, and price are required" });
      return;
    }

    const [result]: [ResultSetHeader, unknown] = await pool.query(
      `INSERT INTO channels (name, platform, category, subscribers, views_or_likes, price, link_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        platform,
        category || "General",
        subscribers || "0",
        views_or_likes || "0",
        Number(price),
        link_url || "",
        status || "active",
      ]
    );

    res.status(201).json({ success: true, message: "Channel listing created", channelId: result.insertId });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/admin/channels/:id
 * Updates channel status ('active' / 'rejected'), rejection_reason, or price.
 */
adminRouter.patch("/channels/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = parseInt(req.params.id as string, 10);
    const { status, price, rejectionReason } = req.body;

    const [channelRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM channels WHERE id = ? LIMIT 1",
      [channelId]
    );

    if (channelRows.length === 0) {
      res.status(404).json({ success: false, error: "Channel not found" });
      return;
    }

    const channel = channelRows[0];

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      if (status === "rejected") {
        const trimmed = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
        if (!trimmed || trimmed.length < 3) {
          res.status(400).json({ success: false, error: "A valid rejection reason (minimum 3 characters) is required." });
          return;
        }
        updates.push("status = ?", "rejection_reason = ?", "reviewed_by = ?", "reviewed_at = NOW()");
        params.push("rejected", trimmed, req.user!.id);
      } else if (status === "active") {
        updates.push("status = ?", "rejection_reason = NULL", "reviewed_by = ?", "reviewed_at = NOW()");
        params.push("active", req.user!.id);
      } else {
        updates.push("status = ?");
        params.push(status);
      }
    }

    if (price !== undefined) {
      updates.push("price = ?");
      params.push(Number(price));
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    params.push(channelId);
    await pool.query(`UPDATE channels SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, params);

    // Notify seller if status changed
    if (status && channel.seller_id) {
      try {
        const isDigital = channel.listing_type === "ebooks-digital";
        if (status === "active") {
          const title = isDigital ? "Digital Product Approved & Published! 🎉" : "Channel Listing Approved & Published! 🎉";
          const message = isDigital
            ? `Congratulations! Your digital product "${channel.name}" (${channel.subcategory || "Digital"}) has been approved by the administrator and is now live in the marketplace.`
            : `Congratulations! Your channel listing "${channel.name}" (${channel.platform}) has been approved by the administrator and is now live in the marketplace.`;

          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
             VALUES (?, 'marketplace', ?, ?, '/my-marketplace', 'View Listing')`,
            [channel.seller_id, title, message]
          );
        } else if (status === "rejected") {
          const reasonText = rejectionReason ? `Reason: ${rejectionReason}` : "Please check your listing details and ensure information is verifiable.";
          const title = isDigital ? "Digital Product Needs Revision" : "Channel Listing Needs Revision";
          const message = isDigital
            ? `Your digital product "${channel.name}" was not approved. ${reasonText} You can correct the information and resubmit it for review.`
            : `Your channel listing "${channel.name}" was not approved. ${reasonText} You can correct the information and resubmit it for review.`;

          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
             VALUES (?, 'marketplace', ?, ?, '/my-marketplace', 'Review & Resubmit')`,
            [channel.seller_id, title, message]
          );
        }
      } catch { /* ignore notification failure */ }
    }

    res.json({ success: true, message: `Channel #${channelId} status set to ${status || 'updated'}` });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/channels/:id
 */
adminRouter.delete("/channels/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = parseInt(req.params.id as string, 10);
    await pool.query("DELETE FROM channels WHERE id = ?", [channelId]);
    res.json({ success: true, message: `Channel #${channelId} deleted` });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/admin/transactions
 * Returns all transactions for admin auditing.
 */
adminRouter.get("/transactions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [transactions]: [RowDataPacket[], unknown] = await pool.query(
      `SELECT t.*, u.email as user_email, CONCAT(u.first_name, ' ', u.last_name) as user_name 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       ORDER BY t.id DESC`
    );
    res.json({ success: true, transactions });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/admin/transactions/:id
 * Approves or Rejects a transaction (deposit, withdrawal).
 */
adminRouter.patch("/transactions/:id", async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const txId = parseInt(req.params.id as string, 10);
    const { status, adminNotes } = req.body;

    if (!status || !["approved", "rejected", "completed"].includes(status)) {
      res.status(400).json({ success: false, error: "Invalid status value" });
      return;
    }

    await conn.beginTransaction();

    // Lock transaction row with FOR UPDATE
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM transactions WHERE id = ? FOR UPDATE",
      [txId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    const tx = rows[0];

    // Prevent double processing
    if (tx.status !== "pending") {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: `Transaction #${txId} is already marked as ${tx.status}. Duplicate processing prevented.`,
      });
      return;
    }

    // Process transition
    if (status === "approved" || status === "completed") {
      if (tx.type === "deposit") {
        await conn.query(
          "UPDATE users SET balance = balance + ? WHERE id = ?",
          [tx.amount, tx.user_id]
        );
      } else if (tx.type === "withdrawal") {
        await conn.query(
          "UPDATE users SET locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
          [tx.amount, tx.user_id]
        );
      }
    } else if (status === "rejected") {
      if (tx.type === "withdrawal") {
        await conn.query(
          "UPDATE users SET balance = balance + ?, locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
          [tx.amount, tx.amount, tx.user_id]
        );
      }
    }

    await conn.query(
      "UPDATE transactions SET status = ?, admin_notes = ? WHERE id = ?",
      [status, adminNotes || tx.admin_notes, txId]
    );

    await conn.commit();
    res.json({ success: true, message: `Transaction #${txId} marked as ${status}` });
  } catch (error: unknown) {
    await conn.rollback();
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    conn.release();
  }
});
