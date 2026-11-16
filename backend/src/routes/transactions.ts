import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";

export const transactionsRouter = Router();

/**
 * POST /api/transactions/deposit
 * Submits a new deposit receipt from the user.
 */
transactionsRouter.post("/deposit", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, amount, paymentMethod, accountNumber, accountName, referenceCode } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, error: "Valid deposit amount is required" });
      return;
    }

    if (!paymentMethod) {
      res.status(400).json({ success: false, error: "Payment method is required" });
      return;
    }

    // Default to user id 1 if not provided or anonymous guest
    const targetUserId = userId ? parseInt(String(userId), 10) : 1;
    const refCode = referenceCode || `DEP-${Math.floor(100000 + Math.random() * 900000)}`;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO transactions (user_id, type, amount, payment_method, account_number, account_name, reference_code, status)
       VALUES (?, 'deposit', ?, ?, ?, ?, ?, 'pending')`,
      [
        targetUserId,
        numAmount,
        paymentMethod,
        accountNumber || "",
        accountName || "",
        refCode,
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
 * Submits a withdrawal request from the user.
 */
transactionsRouter.post("/withdraw", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, amount, paymentMethod, accountNumber, accountName } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, error: "Valid withdrawal amount is required" });
      return;
    }

    if (!paymentMethod || !accountNumber) {
      res.status(400).json({ success: false, error: "Payment method and account number are required" });
      return;
    }

    const targetUserId = userId ? parseInt(String(userId), 10) : 1;

    // Verify user balance
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT balance FROM users WHERE id = ? LIMIT 1",
      [targetUserId]
    );

    if (userRows.length > 0) {
      const currentBalance = Number(userRows[0].balance) || 0;
      if (currentBalance < numAmount) {
        res.status(400).json({
          success: false,
          error: `Insufficient balance. Available: ${currentBalance} ETB, Requested: ${numAmount} ETB`,
        });
        return;
      }

      // Lock the balance pending admin approval
      await pool.query(
        "UPDATE users SET balance = balance - ?, locked_balance = locked_balance + ? WHERE id = ?",
        [numAmount, numAmount, targetUserId]
      );
    }

    const refCode = `WTH-${Math.floor(100000 + Math.random() * 900000)}`;

    const [result] = await pool.query<ResultSetHeader>(
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

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully and is queued for processing.",
      transactionId: result.insertId,
      referenceCode: refCode,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Withdrawal Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/transactions/my
 * Retrieves transaction history for the user.
 */
transactionsRouter.get("/my", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;

    if (!userId) {
      res.json({ success: true, transactions: [] });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
      [userId]
    );

    res.json({ success: true, transactions: rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
