import { Router, Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

export const supportRouter = Router();

supportRouter.get("/conversations", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id AS user_id,
              CONCAT(u.first_name, ' ', u.last_name) AS user_name,
              u.email,
              latest.message AS last_message,
              latest.sender_role,
              latest.created_at,
              COALESCE(unread.unread_count, 0) AS unread_count
       FROM (
         SELECT user_id, MAX(id) AS latest_id
         FROM support_messages
         GROUP BY user_id
       ) conversations
       JOIN users u ON u.id = conversations.user_id AND u.role = 'user'
       JOIN support_messages latest ON latest.id = conversations.latest_id
       LEFT JOIN (
         SELECT user_id, COUNT(*) AS unread_count
         FROM support_messages
         WHERE sender_role = 'user' AND is_read = FALSE
         GROUP BY user_id
       ) unread ON unread.user_id = u.id
       ORDER BY latest.id DESC`
    );
    res.json({ success: true, conversations: rows });
  } catch (error: unknown) {
    console.error("[Support Conversations Error]:", error);
    res.status(500).json({ success: false, error: "Could not load support conversations." });
  }
});

supportRouter.get("/messages", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.role === "admin"
      ? Number.parseInt(String(req.query.userId || ""), 10)
      : req.user!.id;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      res.status(400).json({ success: false, error: "A valid user ID is required." });
      return;
    }

    if (req.user!.role === "admin") {
      const [users] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE id = ? AND role = 'user' LIMIT 1",
        [userId]
      );
      if (users.length === 0) {
        res.status(404).json({ success: false, error: "Support conversation not found." });
        return;
      }
    }

    const otherRole = req.user!.role === "admin" ? "user" : "admin";
    await pool.query(
      "UPDATE support_messages SET is_read = TRUE WHERE user_id = ? AND sender_role = ? AND is_read = FALSE",
      [userId, otherRole]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.id, m.user_id, m.sender_id, m.sender_role, m.message, m.is_read, m.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS sender_name
       FROM support_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.user_id = ?
       ORDER BY m.id DESC
       LIMIT 200`,
      [userId]
    );
    res.json({ success: true, messages: rows.reverse() });
  } catch (error: unknown) {
    console.error("[Support Messages Error]:", error);
    res.status(500).json({ success: false, error: "Could not load support messages." });
  }
});

supportRouter.post("/messages", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (message.length === 0 || message.length > 2000) {
      res.status(400).json({ success: false, error: "Message must be between 1 and 2000 characters." });
      return;
    }

    let targetUserId = req.user!.id;
    if (req.user!.role === "admin") {
      targetUserId = Number.parseInt(String(req.body?.userId || ""), 10);
      if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
        res.status(400).json({ success: false, error: "A valid conversation user ID is required." });
        return;
      }
    }

    const [senderRows] = await pool.query<RowDataPacket[]>(
      "SELECT CONCAT(first_name, ' ', last_name) AS sender_name FROM users WHERE id = ? LIMIT 1",
      [req.user!.id]
    );
    if (senderRows.length === 0) {
      res.status(401).json({ success: false, error: "Your account could not be verified." });
      return;
    }

    const [recipientRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ? AND role = 'user' LIMIT 1",
      [targetUserId]
    );
    if (recipientRows.length === 0) {
      res.status(404).json({ success: false, error: "Support conversation not found." });
      return;
    }

    const senderRole = req.user!.role;
    const [insertResult] = await pool.query<ResultSetHeader>(
      `INSERT INTO support_messages (user_id, sender_id, sender_role, message)
       VALUES (?, ?, ?, ?)`,
      [targetUserId, req.user!.id, senderRole, message]
    );
    const [messageRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id, sender_id, sender_role, message, is_read, created_at, ? AS sender_name
       FROM support_messages
       WHERE id = ?`,
      [senderRows[0].sender_name, insertResult.insertId]
    );

    res.status(201).json({ success: true, message: messageRows[0] });
  } catch (error: unknown) {
    console.error("[Support Message Send Error]:", error);
    res.status(500).json({ success: false, error: "Could not send your message." });
  }
});
