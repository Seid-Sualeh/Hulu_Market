import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";

export const escrowRouter = Router();

/**
 * POST /api/escrow/order
 * Buyer initiates an escrow purchase of a channel.
 */
escrowRouter.post("/order", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      channelId,
      channelName,
      platform,
      price,
      buyerId,
      buyerName,
      sellerId,
      sellerName,
    } = req.body;

    const numAmount = Number(price);
    if (!channelName || !platform || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, error: "Valid channel details and price required." });
      return;
    }

    const bId = buyerId ? parseInt(String(buyerId), 10) : 1;
    const sId = sellerId ? parseInt(String(sellerId), 10) : null;
    const cId = channelId ? parseInt(String(channelId), 10) : null;

    // Check if buyer has sufficient balance
    const [buyerRows] = await pool.query<RowDataPacket[]>(
      "SELECT balance FROM users WHERE id = ? LIMIT 1",
      [bId]
    );

    if (buyerRows.length > 0) {
      const currentBalance = Number(buyerRows[0].balance) || 0;
      if (currentBalance < numAmount) {
        res.status(400).json({
          success: false,
          error: `Insufficient balance. Available: ${currentBalance} ETB, Channel Price: ${numAmount} ETB. Please deposit funds first.`,
        });
        return;
      }

      // Lock the balance in escrow
      await pool.query(
        "UPDATE users SET balance = balance - ?, locked_balance = locked_balance + ? WHERE id = ?",
        [numAmount, numAmount, bId]
      );
    }

    // Insert escrow order
    const [orderResult] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
      [
        cId,
        channelName,
        platform,
        bId,
        buyerName || "Buyer",
        sId,
        sellerName || "Seller",
        numAmount,
      ]
    );

    const orderId = orderResult.insertId;

    // Insert initial automated escrow welcome message
    await pool.query(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
       VALUES (?, 0, 'Hulu Escrow Bot', 'admin', ?)`,
      [
        orderId,
        `Welcome to Hulu Market Escrow Protection! The buyer's payment of ${numAmount} ETB is safely locked. Seller: please transfer channel ownership or access credentials to the buyer here. Admin is supervising this trade.`,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Escrow trade initiated successfully. Funds are securely locked.",
      orderId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Escrow Order Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/escrow/orders
 * Returns list of escrow orders (filtered by userId or all for admin).
 */
escrowRouter.get("/orders", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    const role = req.query.role ? String(req.query.role) : "user";

    let query = "SELECT * FROM escrow_orders";
    const params: (number | string)[] = [];

    if (role !== "admin" && userId) {
      query += " WHERE buyer_id = ? OR seller_id = ?";
      params.push(userId, userId);
    }

    query += " ORDER BY id DESC LIMIT 50";

    const [orders] = await pool.query<RowDataPacket[]>(query, params);
    res.json({ success: true, orders });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/escrow/orders/:id/messages
 * Retrieves chat history for a specific escrow trade.
 */
escrowRouter.get("/orders/:id/messages", async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const [messages] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM escrow_messages WHERE order_id = ? ORDER BY id ASC",
      [orderId]
    );
    res.json({ success: true, messages });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/escrow/orders/:id/messages
 * Sends a message in the 3-way escrow chat (buyer, seller, or admin).
 */
escrowRouter.post("/orders/:id/messages", async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const { senderId, senderName, senderRole, message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: "Message cannot be empty." });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
       VALUES (?, ?, ?, ?, ?)`,
      [
        orderId,
        senderId || 0,
        senderName || "User",
        senderRole || "buyer",
        message.trim(),
      ]
    );

    res.status(201).json({
      success: true,
      messageId: result.insertId,
      createdMessage: {
        id: result.insertId,
        order_id: orderId,
        sender_id: senderId || 0,
        sender_name: senderName || "User",
        sender_role: senderRole || "buyer",
        message: message.trim(),
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/escrow/orders/:id/action
 * Admin resolves the escrow trade (Approve & Release OR Cancel & Refund).
 */
escrowRouter.patch("/orders/:id/action", async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const { action, adminNotes } = req.body; // 'approve' | 'cancel'

    if (!action || !["approve", "cancel"].includes(action)) {
      res.status(400).json({ success: false, error: "Action must be 'approve' or 'cancel'." });
      return;
    }

    const [orderRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM escrow_orders WHERE id = ? LIMIT 1",
      [orderId]
    );

    if (orderRows.length === 0) {
      res.status(404).json({ success: false, error: "Escrow order not found." });
      return;
    }

    const order = orderRows[0];
    if (order.status !== "processing") {
      res.status(400).json({ success: false, error: `Order is already ${order.status}.` });
      return;
    }

    if (action === "approve") {
      // 1. Release funds: Deduct buyer locked balance, credit seller balance
      await pool.query(
        "UPDATE users SET locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
        [order.amount, order.buyer_id]
      );

      if (order.seller_id) {
        await pool.query(
          "UPDATE users SET balance = balance + ? WHERE id = ?",
          [order.amount, order.seller_id]
        );
      }

      // 2. Mark channel as sold
      if (order.channel_id) {
        await pool.query(
          "UPDATE channels SET status = 'sold' WHERE id = ?",
          [order.channel_id]
        );
      }

      // 3. Mark order as success
      await pool.query(
        "UPDATE escrow_orders SET status = 'success' WHERE id = ?",
        [orderId]
      );

      // 4. Post admin message to chat
      await pool.query(
        `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
         VALUES (?, 0, 'Hulu Admin', 'admin', ?)`,
        [
          orderId,
          `Trade Approved! Hulu Admin has verified the transfer of channel credentials and released ${order.amount} ETB to the seller. Trade completed successfully.`,
        ]
      );

      res.json({
        success: true,
        message: `Escrow Trade #${orderId} approved and funds released to seller.`,
      });
    } else if (action === "cancel") {
      // 1. Refund buyer: Return locked balance to available balance
      await pool.query(
        "UPDATE users SET balance = balance + ?, locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
        [order.amount, order.amount, order.buyer_id]
      );

      // 2. Mark channel back to active
      if (order.channel_id) {
        await pool.query(
          "UPDATE channels SET status = 'active' WHERE id = ?",
          [order.channel_id]
        );
      }

      // 3. Mark order as cancelled
      await pool.query(
        "UPDATE escrow_orders SET status = 'cancelled' WHERE id = ?",
        [orderId]
      );

      // 4. Post admin message to chat
      await pool.query(
        `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
         VALUES (?, 0, 'Hulu Admin', 'admin', ?)`,
        [
          orderId,
          `Trade Cancelled by Admin. Reason: ${adminNotes || "Trade cancelled"}. All funds (${order.amount} ETB) have been refunded to the buyer's balance.`,
        ]
      );

      res.json({
        success: true,
        message: `Escrow Trade #${orderId} cancelled and funds refunded to buyer.`,
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Escrow Action Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
