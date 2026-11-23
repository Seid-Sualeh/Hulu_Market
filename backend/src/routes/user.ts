import { Router, Request, Response } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";

export const userRouter = Router();

/**
 * GET /api/user/stats
 * Returns live financial and listing statistics for the authenticated user dashboard.
 */
userRouter.get("/stats", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === "admin";
    const targetUserId = isAdmin && req.query.userId ? parseInt(String(req.query.userId), 10) : req.user!.id;

    // 1. Fetch user's wallet balance & locked balance
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT balance, locked_balance FROM users WHERE id = ? LIMIT 1",
      [targetUserId]
    );

    const balance = userRows.length > 0 ? Number(userRows[0].balance) || 0 : 0;
    const lockedBalance = userRows.length > 0 ? Number(userRows[0].locked_balance) || 0 : 0;

    // 2. Fetch channel listings stats for this user as seller
    const [channelStats] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS totalChannels,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingChannels,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeChannels,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS soldChannels,
        COALESCE(SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END), 0) AS totalSalesVolume
       FROM channels
       WHERE seller_id = ?`,
      [targetUserId]
    );

    // 3. Fetch deposit transactions stats for this user
    const [depositStats] = await pool.query<RowDataPacket[]>(
      `SELECT
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedDeposits,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingDeposits,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejectedDeposits,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS totalDeposited
       FROM transactions
       WHERE user_id = ? AND type = 'deposit'`,
      [targetUserId]
    );

    // 4. Fetch withdrawal transactions stats for this user
    const [withdrawalStats] = await pool.query<RowDataPacket[]>(
      `SELECT
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedWithdrawals,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingWithdrawals,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejectedWithdrawals,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS totalWithdrawn
       FROM transactions
       WHERE user_id = ? AND type = 'withdrawal'`,
      [targetUserId]
    );

    // 5. Total earned income from sold channels
    const income = Number(channelStats[0]?.totalSalesVolume) || 0;

    res.json({
      success: true,
      stats: {
        balance,
        lockedBalance,
        income,
        soldChannels: Number(channelStats[0]?.soldChannels) || 0,
        totalChannels: Number(channelStats[0]?.totalChannels) || 0,
        pendingChannels: Number(channelStats[0]?.pendingChannels) || 0,
        activeChannels: Number(channelStats[0]?.activeChannels) || 0,
        approvedDeposits: Number(depositStats[0]?.approvedDeposits) || 0,
        pendingDeposits: Number(depositStats[0]?.pendingDeposits) || 0,
        rejectedDeposits: Number(depositStats[0]?.rejectedDeposits) || 0,
        totalDeposited: Number(depositStats[0]?.totalDeposited) || 0,
        approvedWithdrawals: Number(withdrawalStats[0]?.approvedWithdrawals) || 0,
        pendingWithdrawals: Number(withdrawalStats[0]?.pendingWithdrawals) || 0,
        rejectedWithdrawals: Number(withdrawalStats[0]?.rejectedWithdrawals) || 0,
        totalWithdrawn: Number(withdrawalStats[0]?.totalWithdrawn) || 0,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[User Stats Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/user/profile
 */
userRouter.get("/profile", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === "admin";
    const targetUserId = isAdmin && req.query.userId ? parseInt(String(req.query.userId), 10) : req.user!.id;

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, first_name, last_name, email, phone, balance, locked_balance, role, created_at FROM users WHERE id = ? LIMIT 1",
      [targetUserId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, user: rows[0] });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/user/profile
 * Updates user profile details in MySQL strictly for the authenticated user.
 */
userRouter.patch("/profile", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, email } = req.body;
    const targetUserId = req.user!.id;

    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, email FROM users WHERE id = ? LIMIT 1",
      [targetUserId]
    );

    if (userRows.length === 0) {
      res.status(404).json({ success: false, error: "User not found." });
      return;
    }

    // If updating email, ensure it's not taken by another user
    if (email && email.trim().toLowerCase() !== userRows[0].email.toLowerCase()) {
      const [emailCheck] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1",
        [email.trim().toLowerCase(), targetUserId]
      );
      if (emailCheck.length > 0) {
        res.status(409).json({ success: false, error: "Email is already in use by another account." });
        return;
      }
    }

    await pool.query(
      `UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        updated_at = NOW()
       WHERE id = ?`,
      [
        firstName || null,
        lastName || null,
        phone || null,
        email ? email.trim().toLowerCase() : null,
        targetUserId,
      ]
    );

    const [updatedRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, first_name, last_name, email, phone, balance, locked_balance, role FROM users WHERE id = ? LIMIT 1",
      [targetUserId]
    );

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedRows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/user/favorites
 * Returns channels favorited by the authenticated user from MySQL database.
 */
userRouter.get("/favorites", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.user!.id;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.*,
        f.id AS favorite_id,
        f.created_at AS favorited_at
       FROM user_favorites f
       JOIN channels c ON f.channel_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.id DESC`,
      [targetUserId]
    );

    res.json({ success: true, favorites: rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/user/favorites
 * Adds a channel to user's favorites in MySQL.
 */
userRouter.post("/favorites", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.body;
    const targetUserId = req.user!.id;
    const cleanChan = String(channelId || "").replace(/^db-/, "").trim();
    const targetChannelId = cleanChan ? parseInt(cleanChan, 10) : null;

    if (!targetChannelId) {
      res.status(400).json({ success: false, error: "channelId is required" });
      return;
    }

    await pool.query(
      "INSERT IGNORE INTO user_favorites (user_id, channel_id) VALUES (?, ?)",
      [targetUserId, targetChannelId]
    );

    res.status(201).json({ success: true, message: "Added to favorites." });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/user/favorites/:channelId
 * Removes a channel from user's favorites in MySQL.
 */
userRouter.delete("/favorites/:channelId", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanChan = String(req.params.channelId || "").replace(/^db-/, "").trim();
    const channelId = cleanChan ? parseInt(cleanChan, 10) : null;
    const targetUserId = req.user!.id;

    if (!channelId) {
      res.status(400).json({ success: false, error: "channelId is required" });
      return;
    }

    await pool.query(
      "DELETE FROM user_favorites WHERE user_id = ? AND channel_id = ?",
      [targetUserId, channelId]
    );

    res.json({ success: true, message: "Removed from favorites." });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/user/notifications
 */
userRouter.get("/notifications", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.user!.id;

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50",
      [targetUserId]
    );

    res.json({ success: true, notifications: rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/user/notifications/unread-count
 * Returns fast count of unread notifications for the header badge.
 */
userRouter.get("/notifications/unread-count", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.user!.id;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [targetUserId]
    );
    res.json({ success: true, count: Number(rows[0]?.count) || 0 });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/user/notifications/:id/read
 */
userRouter.patch("/notifications/:id/read", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const notifId = parseInt(req.params.id as string, 10);
    const targetUserId = req.user!.id;

    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?", [notifId, targetUserId]);

    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/user/admin-status
 * Returns the online/last-seen status of the most recently active admin.
 * Used by the Admin Support chat modal header.
 */
userRouter.get("/admin-status", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT last_seen FROM users WHERE role = 'admin' ORDER BY last_seen DESC LIMIT 1"
    );

    const lastSeenVal: string | null = rows[0]?.last_seen ?? null;
    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

    let isOnline = false;
    let label = "Offline";

    if (lastSeenVal) {
      const ts = new Date(lastSeenVal).getTime();
      const diffMs = now - ts;
      isOnline = diffMs < ONLINE_THRESHOLD_MS;
      if (isOnline) {
        label = "Online";
      } else {
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) label = `Last seen ${diffMins}m ago`;
        else if (diffMins < 1440) label = `Last seen ${Math.floor(diffMins / 60)}h ago`;
        else label = "Last seen a while ago";
      }
    }

    res.json({ success: true, admin: { isOnline, lastSeen: lastSeenVal, label } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
