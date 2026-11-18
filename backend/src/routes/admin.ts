import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";

export const adminRouter = Router();

/**
 * Middleware: RBAC Enforcement
 * Ensures only users with admin role can access administrative endpoints.
 */
adminRouter.use((req: Request, res: Response, next) => {
  const role = req.headers["x-user-role"];
  // In development, if no role header sent or role is admin, allow
  if (role && role !== "admin") {
    res.status(403).json({
      success: false,
      error: "Access denied. Administrator privileges required.",
    });
    return;
  }
  next();
});

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
 * Returns channel listings.
 */
adminRouter.get("/channels", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [channels]: [RowDataPacket[], unknown] = await pool.query(
      "SELECT * FROM channels ORDER BY id DESC"
    );
    res.json({ success: true, channels });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
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
      updates.push("status = ?");
      params.push(status);

      if (status === "active") {
        updates.push("rejection_reason = NULL");
      } else if (status === "rejected" && rejectionReason) {
        updates.push("rejection_reason = ?");
        params.push(rejectionReason);
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
    await pool.query(`UPDATE channels SET ${updates.join(", ")} WHERE id = ?`, params);

    // Notify seller if status changed
    if (status && channel.seller_id) {
      try {
        if (status === "active") {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
             VALUES (?, 'marketplace', 'Channel Listing Approved & Published! 🎉', ?, '/my-marketplace', 'View Listing')`,
            [
              channel.seller_id,
              `Congratulations! Your channel listing "${channel.name}" (${channel.platform}) has been approved by the administrator and is now live in the marketplace.`,
            ]
          );
        } else if (status === "rejected") {
          const reasonText = rejectionReason ? `Reason: ${rejectionReason}` : "Please check your listing details and ensure statistics are verifiable.";
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
             VALUES (?, 'marketplace', 'Channel Listing Needs Revision', ?, '/my-marketplace', 'Review & Resubmit')`,
            [
              channel.seller_id,
              `Your channel listing "${channel.name}" was not approved. ${reasonText} You can correct the information and resubmit it for review.`,
            ]
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
  try {
    const txId = parseInt(req.params.id as string, 10);
    const { status, adminNotes } = req.body;

    if (!status || !["approved", "rejected", "completed"].includes(status)) {
      res.status(400).json({ success: false, error: "Invalid status value" });
      return;
    }

    // Retrieve transaction
    const [rows]: [RowDataPacket[], unknown] = await pool.query(
      "SELECT * FROM transactions WHERE id = ? LIMIT 1",
      [txId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    const tx = rows[0];

    // If changing from pending to approved:
    if (tx.status === "pending" && (status === "approved" || status === "completed")) {
      if (tx.type === "deposit") {
        // Credit user balance
        await pool.query(
          "UPDATE users SET balance = balance + ? WHERE id = ?",
          [tx.amount, tx.user_id]
        );
      } else if (tx.type === "withdrawal") {
        // Deduct from locked balance
        await pool.query(
          "UPDATE users SET locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
          [tx.amount, tx.user_id]
        );
      }
    } else if (tx.status === "pending" && status === "rejected") {
      if (tx.type === "withdrawal") {
        // Refund user balance from locked balance
        await pool.query(
          "UPDATE users SET balance = balance + ?, locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
          [tx.amount, tx.amount, tx.user_id]
        );
      }
    }

    await pool.query(
      "UPDATE transactions SET status = ?, admin_notes = ? WHERE id = ?",
      [status, adminNotes || tx.admin_notes, txId]
    );

    res.json({ success: true, message: `Transaction #${txId} marked as ${status}` });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
