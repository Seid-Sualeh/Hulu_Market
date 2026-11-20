import { Router, Request, Response } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db.js";

export const userRouter = Router();

/**
 * GET /api/user/stats
 * Returns live financial and listing statistics for the user dashboard.
 */
userRouter.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;

    if (!userId) {
      res.json({
        success: true,
        stats: {
          balance: 0,
          lockedBalance: 0,
          income: 0,
          soldChannels: 0,
          totalChannels: 0,
          pendingChannels: 0,
          approvedDeposits: 0,
          pendingDeposits: 0,
          rejectedDeposits: 0,
          approvedWithdrawals: 0,
          pendingWithdrawals: 0,
          rejectedWithdrawals: 0,
        },
      });
      return;
    }

    // 1. Fetch user record
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, balance, locked_balance FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    const balance = userRows.length > 0 ? Number(userRows[0].balance) : 0;
    const lockedBalance = userRows.length > 0 ? Number(userRows[0].locked_balance) : 0;

    // 2. Fetch channel counts
    const [channelRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) AS totalChannels,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS soldChannels,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingChannels,
        COALESCE(SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END), 0) AS totalIncome
       FROM channels WHERE seller_id = ?`,
      [userId]
    );

    const totalChannels = Number(channelRows[0]?.totalChannels || 0);
    const soldChannels = Number(channelRows[0]?.soldChannels || 0);
    const pendingChannels = Number(channelRows[0]?.pendingChannels || 0);
    const totalIncome = Number(channelRows[0]?.totalIncome || 0);

    // 3. Fetch transaction metrics
    const [txRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'approved' THEN amount ELSE 0 END), 0) AS approvedDeposits,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'pending' THEN amount ELSE 0 END), 0) AS pendingDeposits,
        SUM(CASE WHEN type = 'deposit' AND status = 'rejected' THEN 1 ELSE 0 END) AS rejectedDeposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'approved' THEN amount ELSE 0 END), 0) AS approvedWithdrawals,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'pending' THEN amount ELSE 0 END), 0) AS pendingWithdrawals,
        SUM(CASE WHEN type = 'withdrawal' AND status = 'rejected' THEN 1 ELSE 0 END) AS rejectedWithdrawals
       FROM transactions WHERE user_id = ?`,
      [userId]
    );

    // 4. Fetch recent transactions
    const [recentTxRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, type, amount, payment_method, reference_code, status, created_at 
       FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 5`,
      [userId]
    );

    // 5. Fetch recent channel listings
    const [recentChannelRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, platform, category, subscribers, price, status, created_at 
       FROM channels WHERE seller_id = ? ORDER BY id DESC LIMIT 5`,
      [userId]
    );

    // 6. Fetch active escrow orders
    const [escrowRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, channel_name, platform, buyer_id, seller_id, amount, status, is_closed, buyer_confirmed, seller_confirmed, created_at
       FROM escrow_orders 
       WHERE (buyer_id = ? OR seller_id = ?) 
       ORDER BY id DESC LIMIT 5`,
      [userId, userId]
    );

    res.json({
      success: true,
      stats: {
        balance,
        lockedBalance,
        income: totalIncome,
        soldChannels,
        totalChannels,
        pendingChannels,
        approvedDeposits: Number(txRows[0]?.approvedDeposits || 0),
        pendingDeposits: Number(txRows[0]?.pendingDeposits || 0),
        rejectedDeposits: Number(txRows[0]?.rejectedDeposits || 0),
        approvedWithdrawals: Number(txRows[0]?.approvedWithdrawals || 0),
        pendingWithdrawals: Number(txRows[0]?.pendingWithdrawals || 0),
        rejectedWithdrawals: Number(txRows[0]?.rejectedWithdrawals || 0),
      },
      recentTransactions: recentTxRows,
      recentChannels: recentChannelRows,
      recentEscrows: escrowRows,
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
userRouter.get("/profile", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    if (!userId) {
      res.status(400).json({ success: false, error: "userId required" });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, first_name, last_name, email, phone, balance, locked_balance, role, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
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
 * GET /api/user/notifications
 */
userRouter.get("/notifications", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    if (!userId) {
      res.json({ success: true, notifications: [] });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50",
      [userId]
    );

    res.json({ success: true, notifications: rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/user/notifications/:id/read
 */
userRouter.patch("/notifications/:id/read", async (req: Request, res: Response): Promise<void> => {
  try {
    const notifId = parseInt(req.params.id as string, 10);
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = ?", [notifId]);
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
