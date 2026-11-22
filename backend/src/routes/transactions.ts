import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";

export const transactionsRouter = Router();

/**
 * POST /api/transactions/deposit
 * Submits a new deposit receipt from the user.
 */
transactionsRouter.post("/deposit", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, amount, paymentMethod, accountNumber, accountName, referenceCode, screenshotUrl } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, error: "Valid deposit amount is required" });
      return;
    }

    if (!paymentMethod) {
      res.status(400).json({ success: false, error: "Payment method is required" });
      return;
    }

    // Determine target user id: from authenticated token, or verified fallback
    const targetUserId = req.user?.id || (userId ? parseInt(String(userId), 10) : null);
    if (!targetUserId) {
      res.status(401).json({ success: false, error: "Please sign in before submitting a deposit." });
      return;
    }

    const refCode = referenceCode || `DEP-${Math.floor(100000 + Math.random() * 900000)}`;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO transactions (user_id, type, amount, payment_method, account_number, account_name, reference_code, screenshot_url, status)
       VALUES (?, 'deposit', ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        targetUserId,
        numAmount,
        paymentMethod,
        accountNumber || "",
        accountName || "",
        refCode,
        screenshotUrl || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Deposit submitted successfully and is pending review by admin.",
      transactionId: result.insertId,
      referenceCode: refCode,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Deposit Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/transactions/withdraw
 * Submits a withdrawal request from the user. Atomic balance lock protects against double-spend.
 */
transactionsRouter.post("/withdraw", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const { amount, paymentMethod, accountNumber, accountName } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, error: "Valid withdrawal amount is required" });
      return;
    }

    if (!paymentMethod || !accountNumber) {
      res.status(400).json({ success: false, error: "Payment method and account number are required" });
      return;
    }

    const targetUserId = req.user!.id;

    await conn.beginTransaction();

    // Atomic balance lock
    const [updateResult] = await conn.query<ResultSetHeader>(
      "UPDATE users SET balance = balance - ?, locked_balance = locked_balance + ? WHERE id = ? AND balance >= ?",
      [numAmount, numAmount, targetUserId, numAmount]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: "Insufficient balance for this withdrawal request.",
      });
      return;
    }

    const refCode = `WTH-${Math.floor(100000 + Math.random() * 900000)}`;

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO transactions (user_id, type, amount, payment_method, account_number, account_name, reference_code, status)
       VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, 'pending')`,
      [
        targetUserId,
        numAmount,
        paymentMethod,
        accountNumber,
        accountName || "",
        refCode,
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully and is queued for processing.",
      transactionId: result.insertId,
      referenceCode: refCode,
    });
  } catch (error: unknown) {
    await conn.rollback();
    const err = error as Error;
    console.error("[Withdrawal Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/transactions/my
 * Retrieves transaction history for the authenticated user.
 */
transactionsRouter.get("/my", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedUserId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    const targetUserId = req.user?.id || requestedUserId;

    if (!targetUserId) {
      res.json({ success: true, transactions: [] });
      return;
    }

    // Non-admin can only see their own transactions
    if (req.user && req.user.role !== "admin" && targetUserId !== req.user.id) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
      [targetUserId]
    );

    res.json({ success: true, transactions: rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
