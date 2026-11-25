import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

export const escrowRouter = Router();

/**
 * POST /api/escrow/order
 * Buyer initiates an escrow purchase of a channel.
 * Price and channel availability are verified directly against the database to prevent manipulation.
 * Identity is derived strictly from the verified JWT (req.user). Client buyerId is strictly ignored.
 */
escrowRouter.post("/order", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const {
      channelId,
      channelName,
      platform,
      sellerId,
      sellerName,
    } = req.body;

    // Derive buyer ID exclusively from the verified authenticated user
    const bId = req.user!.id;
    if (!bId) {
      res.status(401).json({ success: false, error: "Please sign in before initiating a purchase." });
      return;
    }

    const cId = channelId ? parseInt(String(channelId).replace(/^db-/, ""), 10) : null;
    if (!cId || isNaN(cId)) {
      res.status(400).json({ success: false, error: "A valid channel ID is required for purchase." });
      return;
    }

    await conn.beginTransaction();

    // 1. Fetch channel with row lock to check availability & true price
    const [channelRows] = await conn.query<RowDataPacket[]>(
      "SELECT id, name, platform, listing_type, price, seller_id, seller_username, status FROM channels WHERE id = ? FOR UPDATE",
      [cId]
    );

    if (channelRows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Channel listing not found." });
      return;
    }

    const channel = channelRows[0];

    // Ensure digital products cannot use the social-media channel purchase endpoint
    if (channel.listing_type === "ebooks-digital") {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: "Social-media purchase endpoint cannot be used for Ebooks & Digital Products. Please use the digital product purchase flow.",
      });
      return;
    }

    if (channel.status !== "active") {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: `Channel is currently not available for purchase (Status: ${channel.status}).`,
      });
      return;
    }

    const targetSellerId = channel.seller_id ? Number(channel.seller_id) : (sellerId ? Number(sellerId) : null);

    // Prevent buying own channel
    if (targetSellerId && targetSellerId === bId) {
      await conn.rollback();
      res.status(400).json({ success: false, error: "You cannot purchase your own channel listing." });
      return;
    }

    // Verify true price from database record
    const verifiedPrice = Number(channel.price);
    if (isNaN(verifiedPrice) || verifiedPrice <= 0) {
      await conn.rollback();
      res.status(400).json({ success: false, error: "Invalid listing price in database." });
      return;
    }

    // 2. Atomic balance check & deduction from buyer
    const [balanceUpdate] = await conn.query<ResultSetHeader>(
      "UPDATE users SET balance = balance - ?, locked_balance = locked_balance + ? WHERE id = ? AND balance >= ?",
      [verifiedPrice, verifiedPrice, bId, verifiedPrice]
    );

    if (balanceUpdate.affectedRows === 0) {
      await conn.rollback();
      const [uRows] = await conn.query<RowDataPacket[]>("SELECT balance FROM users WHERE id = ?", [bId]);
      const curBal = uRows.length > 0 ? Number(uRows[0].balance) : 0;
      res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ${curBal} ETB, Channel Price: ${verifiedPrice} ETB. Please deposit funds first.`,
      });
      return;
    }

    // 3. Mark channel as ongoing / in escrow
    await conn.query("UPDATE channels SET status = 'sold' WHERE id = ?", [cId]);

    // 4. Insert escrow order with authenticated buyer identity
    const actualBuyerName = req.user?.email ? req.user.email.split("@")[0] : `User #${bId}`;
    const actualSellerName = sellerName || channel.seller_username || "Seller";

    const [orderResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
      [
        cId,
        channel.name || channelName,
        channel.platform || platform,
        bId,
        actualBuyerName,
        targetSellerId,
        actualSellerName,
        verifiedPrice,
      ]
    );

    const orderId = orderResult.insertId;

    // 5. Insert initial automated escrow welcome message
    await conn.query(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
       VALUES (?, 0, 'Hulu Escrow Bot', 'admin', ?)`,
      [
        orderId,
        `Welcome to Hulu Market Escrow Protection! The buyer's payment of ${verifiedPrice} ETB is safely locked in escrow. Seller: please transfer channel ownership credentials and evidence to the buyer here. Admin is supervising this trade.`,
      ]
    );

    // 6. Notify seller
    if (targetSellerId) {
      try {
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
           VALUES (?, 'escrow', 'Buyer Initiated Channel Purchase! 🎉', ?, '/inbox', 'Open Escrow Chat')`,
          [
            targetSellerId,
            `A buyer has initiated a purchase of your channel "${channel.name}" for ${verifiedPrice} ETB. The payment is secured in escrow. Please open your Inbox to coordinate ownership transfer.`,
          ]
        );
      } catch {}
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Escrow trade initiated successfully. Funds are securely locked.",
      orderId,
    });
  } catch (error: unknown) {
    await conn.rollback();
    const err = error as Error;
    console.error("[Escrow Order Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/escrow/order/digital
 * Buyer initiates an escrow purchase of an approved digital product (ebook, study notes, etc.).
 * Price, availability, seller copyright declaration, and buyer identity are verified authoritatively against the database.
 * CRITICAL REUSABLE INVENTORY RULE: The digital product listing remains active and available for other buyers.
 */
escrowRouter.post("/order/digital", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const { channelId } = req.body;

    // 1. Authenticated buyer identity derived strictly from verified JWT
    const bId = req.user!.id;
    if (!bId) {
      res.status(401).json({ success: false, error: "Please sign in before initiating a purchase." });
      return;
    }

    const cId = channelId ? parseInt(String(channelId).replace(/^db-/, ""), 10) : null;
    if (!cId || isNaN(cId) || cId <= 0) {
      res.status(400).json({ success: false, error: "A valid digital product listing ID is required." });
      return;
    }

    await conn.beginTransaction();

    // 2. Fetch digital product listing with row lock
    const [channelRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, name, category, listing_type, subcategory, file_format, price,
              seller_id, seller_username, agreed_declaration, declared_at, status
       FROM channels
       WHERE id = ?
       FOR UPDATE`,
      [cId]
    );

    if (channelRows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Digital product listing not found." });
      return;
    }

    const channel = channelRows[0];

    // 3. Category & Listing Type Eligibility
    if (channel.listing_type !== "ebooks-digital") {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: "This endpoint is exclusively for purchasing Ebooks & Digital Products. Social media channels cannot be purchased here.",
      });
      return;
    }

    // 4. Approval Status Verification
    if (channel.status !== "active") {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: `This digital product is currently not available for purchase (Status: ${channel.status}).`,
      });
      return;
    }

    // 5. Mandatory Seller Distribution Rights Declaration
    if (channel.agreed_declaration !== 1 && channel.agreed_declaration !== true) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: "This listing cannot be purchased because the seller has not completed the mandatory copyright and distribution declaration.",
      });
      return;
    }

    const targetSellerId = Number(channel.seller_id);

    // 6. Prevent self-purchase
    if (targetSellerId && targetSellerId === bId) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: "You cannot purchase your own digital product listing.",
      });
      return;
    }

    // 7. Verify authoritative price from database
    const verifiedPrice = Number(channel.price);
    if (isNaN(verifiedPrice) || verifiedPrice <= 0) {
      await conn.rollback();
      res.status(400).json({ success: false, error: "Invalid digital product price in database." });
      return;
    }

    // 8. Idempotency & Duplicate Prevention
    // Prevent double-charging the buyer if they send concurrent requests or double-click
    const [existingOrders] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM escrow_orders WHERE channel_id = ? AND buyer_id = ? AND status = 'processing' LIMIT 1 FOR UPDATE",
      [cId, bId]
    );

    if (existingOrders.length > 0) {
      await conn.rollback();
      res.status(409).json({
        success: false,
        error: "You already have an active purchase in progress for this digital product. Please check your Inbox.",
        orderId: existingOrders[0].id,
      });
      return;
    }

    // 9. Atomic balance check & deduction from buyer wallet
    const [balanceUpdate] = await conn.query<ResultSetHeader>(
      "UPDATE users SET balance = balance - ?, locked_balance = locked_balance + ? WHERE id = ? AND balance >= ?",
      [verifiedPrice, verifiedPrice, bId, verifiedPrice]
    );

    if (balanceUpdate.affectedRows === 0) {
      await conn.rollback();
      const [uRows] = await conn.query<RowDataPacket[]>("SELECT balance FROM users WHERE id = ?", [bId]);
      const curBal = uRows.length > 0 ? Number(uRows[0].balance) : 0;
      res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ${curBal} ETB, Product Price: ${verifiedPrice} ETB. Please deposit funds first.`,
      });
      return;
    }

    // 10. CRITICAL BUSINESS RULE: Reusable Digital Inventory
    // Do NOT set channels.status = 'sold'!
    // The digital product listing remains active and available for future buyers.

    // 11. Insert distinct escrow order record
    const actualBuyerName = req.user?.email ? req.user.email.split("@")[0] : `User #${bId}`;
    const actualSellerName = channel.seller_username || "Verified Seller";
    const displayPlatform = (channel.file_format || "digital").toUpperCase();

    const [orderResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (
        channel_id, channel_name, platform, listing_type, buyer_id, buyer_name,
        seller_id, seller_name, amount, status
      ) VALUES (?, ?, ?, 'ebooks-digital', ?, ?, ?, ?, ?, 'processing')`,
      [
        cId,
        channel.name,
        displayPlatform,
        bId,
        actualBuyerName,
        targetSellerId,
        actualSellerName,
        verifiedPrice,
      ]
    );

    const orderId = orderResult.insertId;

    // 12. Insert initial transaction chat message
    await conn.query(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
       VALUES (?, 0, 'Hulu Escrow Bot', 'admin', ?)`,
      [
        orderId,
        `Welcome to Hulu Market Escrow Protection! The buyer's payment of ${verifiedPrice} ETB is safely locked in escrow for "${channel.name}". This transaction is supervised by Hulu Admin. Please coordinate in this chat.`,
      ]
    );

    // 13. Notify seller
    if (targetSellerId) {
      try {
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
           VALUES (?, 'escrow', 'New Digital Product Purchase! 🎉', ?, '/inbox', 'Open Trade Chat')`,
          [
            targetSellerId,
            `A buyer has purchased your digital product "${channel.name}" for ${verifiedPrice} ETB. The payment is held in escrow. Please open your Inbox to coordinate with the buyer.`,
          ]
        );
      } catch {}
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Digital product purchase initiated successfully. Funds are held in escrow.",
      orderId,
    });
  } catch (error: unknown) {
    await conn.rollback();
    const err = error as Error;
    console.error("[Digital Purchase Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/escrow/orders
 * Returns list of escrow orders.
 * Admin can see all orders; users only see orders where they are the verified buyer or seller.
 */
escrowRouter.get("/orders", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === "admin";
    const targetUserId = req.user!.id;

    let query = "SELECT * FROM escrow_orders";
    const params: (number | string)[] = [];

    if (!isAdmin) {
      query += " WHERE buyer_id = ? OR seller_id = ?";
      params.push(targetUserId, targetUserId);
    }

    query += " ORDER BY id DESC LIMIT 50";

    const [orders] = await pool.query<RowDataPacket[]>(query, params);
    res.json({ success: true, orders });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/escrow/unread-count
 * Returns count of UNREAD messages from other participants across all active escrow orders.
 * Uses escrow_order_reads table to track last-read timestamp per user per order.
 */
escrowRouter.get("/unread-count", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.user!.id;
    const isAdmin = req.user?.role === "admin";

    if (isAdmin) {
      // Admin sees count of active processing orders
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS count FROM escrow_orders WHERE status = 'processing' AND is_closed = FALSE"
      );
      res.json({ success: true, count: Number(rows[0]?.count) || 0 });
      return;
    }

    // Count messages that arrived AFTER the user last read each order chat
    // (messages from other participants only)
    const [unreadRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT m.id) AS unreadCount
       FROM escrow_messages m
       JOIN escrow_orders o ON m.order_id = o.id
       LEFT JOIN escrow_order_reads r ON r.order_id = m.order_id AND r.user_id = ?
       WHERE (o.buyer_id = ? OR o.seller_id = ?)
         AND m.sender_id != ?
         AND o.is_closed = FALSE
         AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)`,
      [targetUserId, targetUserId, targetUserId, targetUserId]
    );

    const count = Number(unreadRows[0]?.unreadCount) || 0;
    res.json({ success: true, count });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/escrow/orders/:id/messages
 * Retrieves chat history for a specific escrow trade.
 * Enforces participant check: only verified buyer, seller, or admin can read messages.
 */
escrowRouter.get("/orders/:id/messages", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    if (isNaN(orderId)) {
      res.status(400).json({ success: false, error: "Invalid order ID." });
      return;
    }

    const [orderRows] = await pool.query<RowDataPacket[]>(
      "SELECT buyer_id, seller_id FROM escrow_orders WHERE id = ? LIMIT 1",
      [orderId]
    );

    if (orderRows.length === 0) {
      res.status(404).json({ success: false, error: "Escrow trade not found." });
      return;
    }

    const order = orderRows[0];
    const currentUserId = req.user!.id;
    const isAdmin = req.user!.role === "admin";

    // Strict participant verification based solely on verified JWT
    if (!isAdmin && currentUserId !== Number(order.buyer_id) && currentUserId !== Number(order.seller_id)) {
      res.status(403).json({ success: false, error: "Access denied. You are not a participant in this trade." });
      return;
    }

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
 * POST /api/escrow/orders/:id/mark-read
 * Updates the user's last-read timestamp for an order chat (clears unread badge).
 */
escrowRouter.post("/orders/:id/mark-read", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    if (isNaN(orderId)) {
      res.status(400).json({ success: false, error: "Invalid order ID." });
      return;
    }

    const userId = req.user!.id;

    await pool.query(
      `INSERT INTO escrow_order_reads (order_id, user_id, last_read_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE last_read_at = NOW()`,
      [orderId, userId]
    );

    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/escrow/orders/:id/participants-status
 * Returns online/last-seen status for buyer, seller, and admin in a specific order.
 * Online = last_seen within last 2 minutes.
 */
escrowRouter.get("/orders/:id/participants-status", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    if (isNaN(orderId)) {
      res.status(400).json({ success: false, error: "Invalid order ID." });
      return;
    }

    const [orderRows] = await pool.query<RowDataPacket[]>(
      "SELECT buyer_id, seller_id FROM escrow_orders WHERE id = ? LIMIT 1",
      [orderId]
    );

    if (orderRows.length === 0) {
      res.status(404).json({ success: false, error: "Escrow order not found." });
      return;
    }

    const order = orderRows[0];
    const currentUserId = req.user!.id;
    const isAdmin = req.user!.role === "admin";

    // Only participants can see participant status
    if (!isAdmin && currentUserId !== Number(order.buyer_id) && currentUserId !== Number(order.seller_id)) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    const userIds = [order.buyer_id, order.seller_id].filter(Boolean);

    // Get buyer/seller last_seen
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, last_seen FROM users WHERE id IN (?)",
      [userIds.length > 0 ? userIds : [0]]
    );

    // Get admin last_seen (most recently active admin)
    const [adminRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, last_seen FROM users WHERE role = 'admin' ORDER BY last_seen DESC LIMIT 1"
    );

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

    function formatStatus(lastSeenVal: string | null): { isOnline: boolean; lastSeen: string | null; label: string } {
      if (!lastSeenVal) return { isOnline: false, lastSeen: null, label: "Offline" };
      const ts = new Date(lastSeenVal).getTime();
      const diffMs = now - ts;
      const isOnline = diffMs < ONLINE_THRESHOLD_MS;
      if (isOnline) return { isOnline: true, lastSeen: lastSeenVal, label: "Online" };
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return { isOnline: false, lastSeen: lastSeenVal, label: `Last seen ${diffMins}m ago` };
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return { isOnline: false, lastSeen: lastSeenVal, label: `Last seen ${diffHrs}h ago` };
      return { isOnline: false, lastSeen: lastSeenVal, label: "Last seen a while ago" };
    }

    const buyerRow = userRows.find((r) => Number(r.id) === Number(order.buyer_id));
    const sellerRow = userRows.find((r) => Number(r.id) === Number(order.seller_id));
    const adminRow = adminRows[0] || null;

    res.json({
      success: true,
      buyer: formatStatus(buyerRow?.last_seen ?? null),
      seller: formatStatus(sellerRow?.last_seen ?? null),
      admin: formatStatus(adminRow?.last_seen ?? null),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/escrow/orders/:id/messages
 * Sends a message in the 3-way escrow chat (buyer, seller, or admin).
 * Enforces sender role strictly based on verified user identity.
 */
escrowRouter.post("/orders/:id/messages", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const { message, messageType, attachmentUrl } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: "Message cannot be empty." });
      return;
    }

    // Fetch order to verify participation and status
    const [orderCheck] = await pool.query<RowDataPacket[]>(
      "SELECT buyer_id, seller_id, is_closed FROM escrow_orders WHERE id = ? LIMIT 1",
      [orderId]
    );

    if (orderCheck.length === 0) {
      res.status(404).json({ success: false, error: "Escrow order not found." });
      return;
    }

    const order = orderCheck[0];
    if (order.is_closed) {
      res.status(400).json({
        success: false,
        error: "This trade conversation is closed. No further messages can be sent.",
      });
      return;
    }

    // Determine sender identity and role strictly from verified JWT
    const currentUserId = req.user!.id;
    const isAdmin = req.user!.role === "admin";
    let actualRole: "buyer" | "seller" | "admin";

    if (isAdmin) {
      actualRole = "admin";
    } else if (currentUserId === Number(order.seller_id)) {
      actualRole = "seller";
    } else if (currentUserId === Number(order.buyer_id)) {
      actualRole = "buyer";
    } else {
      res.status(403).json({ success: false, error: "Only participants in this trade may send messages." });
      return;
    }

    const senderDisplayName = isAdmin
      ? "Hulu Admin"
      : req.user!.email ? req.user!.email.split("@")[0] : `User #${currentUserId}`;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message, message_type, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        currentUserId,
        senderDisplayName,
        actualRole,
        message.trim(),
        messageType || "text",
        attachmentUrl || null,
      ]
    );

    res.status(201).json({
      success: true,
      messageId: result.insertId,
      createdMessage: {
        id: result.insertId,
        order_id: orderId,
        sender_id: currentUserId,
        sender_name: senderDisplayName,
        sender_role: actualRole,
        message: message.trim(),
        message_type: messageType || "text",
        attachment_url: attachmentUrl || null,
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
 * Requires admin privileges and executes atomically.
 */
escrowRouter.patch("/orders/:id/action", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const { action, adminNotes } = req.body; // 'approve' | 'cancel'

    if (!action || !["approve", "cancel"].includes(action)) {
      res.status(400).json({ success: false, error: "Action must be 'approve' or 'cancel'." });
      return;
    }

    await conn.beginTransaction();

    const [orderRows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM escrow_orders WHERE id = ? FOR UPDATE",
      [orderId]
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Escrow order not found." });
      return;
    }

    const order = orderRows[0];
    if (order.status !== "processing") {
      await conn.rollback();
      res.status(400).json({ success: false, error: `Order is already ${order.status}.` });
      return;
    }

    if (action === "approve") {
      // 1. Release funds: Deduct buyer locked balance, credit seller balance
      await conn.query(
        "UPDATE users SET locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
        [order.amount, order.buyer_id]
      );

      if (order.seller_id) {
        await conn.query(
          "UPDATE users SET balance = balance + ? WHERE id = ?",
          [order.amount, order.seller_id]
        );
      }

      // 2. Mark channel as sold ONLY for social-media channels. Digital products remain active reusable inventory!
      if (order.channel_id) {
        const [chRows] = await conn.query<RowDataPacket[]>(
          "SELECT listing_type FROM channels WHERE id = ? LIMIT 1",
          [order.channel_id]
        );
        const isDigital = chRows.length > 0 && chRows[0].listing_type === "ebooks-digital";
        if (!isDigital) {
          await conn.query("UPDATE channels SET status = 'sold' WHERE id = ?", [order.channel_id]);
        }
      }

      // 3. Mark order as success
      await conn.query("UPDATE escrow_orders SET status = 'success' WHERE id = ?", [orderId]);

      // 4. Post admin message to chat
      await conn.query(
        `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
         VALUES (?, 0, 'Hulu Admin', 'admin', ?)`,
        [
          orderId,
          `Trade Approved! Hulu Admin has verified the transfer of channel credentials and released ${order.amount} ETB to the seller. Trade completed successfully.`,
        ]
      );

      await conn.commit();

      res.json({
        success: true,
        message: `Escrow Trade #${orderId} approved and funds released to seller.`,
      });
    } else if (action === "cancel") {
      // 1. Refund buyer: Return locked balance to available balance
      await conn.query(
        "UPDATE users SET balance = balance + ?, locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
        [order.amount, order.amount, order.buyer_id]
      );

      // 2. Mark channel back to active if social-media
      if (order.channel_id) {
        const [chRows] = await conn.query<RowDataPacket[]>(
          "SELECT listing_type FROM channels WHERE id = ? LIMIT 1",
          [order.channel_id]
        );
        const isDigital = chRows.length > 0 && chRows[0].listing_type === "ebooks-digital";
        if (!isDigital) {
          await conn.query("UPDATE channels SET status = 'active' WHERE id = ?", [order.channel_id]);
        }
      }

      // 3. Mark order as cancelled
      await conn.query("UPDATE escrow_orders SET status = 'cancelled' WHERE id = ?", [orderId]);

      // 4. Post admin message to chat
      await conn.query(
        `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message)
         VALUES (?, 0, 'Hulu Admin', 'admin', ?)`,
        [
          orderId,
          `Trade Cancelled by Admin. Reason: ${adminNotes || "Trade cancelled"}. All funds (${order.amount} ETB) have been refunded to the buyer's balance.`,
        ]
      );

      await conn.commit();

      res.json({
        success: true,
        message: `Escrow Trade #${orderId} cancelled and funds refunded to buyer.`,
      });
    }
  } catch (error: unknown) {
    await conn.rollback();
    const err = error as Error;
    console.error("[Escrow Action Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/escrow/orders/:id/request-confirmation
 * Administrator sends the official confirmation instruction to the buyer.
 * Requires admin privileges.
 */
escrowRouter.post("/orders/:id/request-confirmation", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);

    const [orderRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM escrow_orders WHERE id = ? LIMIT 1",
      [orderId]
    );

    if (orderRows.length === 0) {
      res.status(404).json({ success: false, error: "Escrow order not found." });
      return;
    }

    const order = orderRows[0];
    if (order.is_closed) {
      res.status(400).json({ success: false, error: "Trade conversation is already closed." });
      return;
    }

    // Set buyer_confirmation_requested flag
    await pool.query(
      "UPDATE escrow_orders SET buyer_confirmation_requested = TRUE WHERE id = ?",
      [orderId]
    );

    const instruction =
      "If you have successfully received the ownership of your purchased channel and verified everything, please click the Mark as Complete button.";

    const [msgResult] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message, message_type)
       VALUES (?, 0, 'Hulu Market Admin', 'admin', ?, 'text')`,
      [orderId, instruction]
    );

    res.json({
      success: true,
      message: "Confirmation instruction sent to buyer successfully.",
      instructionMessage: {
        id: msgResult.insertId,
        order_id: orderId,
        sender_id: 0,
        sender_name: "Hulu Market Admin",
        sender_role: "admin",
        message: instruction,
        message_type: "text",
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Request Confirmation Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/escrow/orders/:id/confirm
 * Buyer or seller confirms ownership transfer completion.
 * Enforces that only the verified authenticated buyer can confirm as buyer, and only verified seller can confirm as seller.
 * Identity is derived exclusively from the verified JWT (req.user.id).
 */
escrowRouter.patch("/orders/:id/confirm", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const { role } = req.body; // role: 'buyer' | 'seller'

    if (!role || !["buyer", "seller"].includes(role)) {
      res.status(400).json({ success: false, error: "Role must be 'buyer' or 'seller'." });
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
    if (order.is_closed) {
      res.status(400).json({ success: false, error: "This trade conversation is already closed." });
      return;
    }

    if (order.status !== "processing") {
      res.status(400).json({
        success: false,
        error: `Cannot confirm trade in '${order.status}' status. Confirmations are only accepted while processing.`,
      });
      return;
    }

    // Determine confirming user id strictly from verified JWT
    const currentUserId = req.user!.id;

    // Strict identity check: authenticated user MUST match the respective side of the trade
    if (role === "buyer") {
      if (Number(order.buyer_id) !== currentUserId) {
        res.status(403).json({ success: false, error: "Only the verified buyer of this trade can confirm as buyer." });
        return;
      }
      if (order.buyer_confirmed) {
        res.status(400).json({ success: false, error: "Buyer confirmation has already been recorded for this trade." });
        return;
      }
    } else if (role === "seller") {
      if (Number(order.seller_id) !== currentUserId) {
        res.status(403).json({ success: false, error: "Only the verified seller of this trade can confirm as seller." });
        return;
      }
      if (order.seller_confirmed) {
        res.status(400).json({ success: false, error: "Seller confirmation has already been recorded for this trade." });
        return;
      }
    }

    // Update the confirmation flag
    const field = role === "buyer" ? "buyer_confirmed" : "seller_confirmed";
    await pool.query(`UPDATE escrow_orders SET ${field} = TRUE WHERE id = ?`, [orderId]);

    // Post automated confirmation message
    const confirmMsg =
      role === "buyer"
        ? "✅ Buyer has confirmed successful receipt of the channel ownership. Waiting for seller confirmation..."
        : "✅ Seller has confirmed the ownership transfer is complete. Waiting for buyer confirmation...";

    await pool.query(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message, message_type)
       VALUES (?, 0, 'Hulu Escrow Bot', 'admin', ?, 'text')`,
      [orderId, confirmMsg]
    );

    // Check if both have confirmed
    const [updatedRows] = await pool.query<RowDataPacket[]>(
      "SELECT buyer_confirmed, seller_confirmed FROM escrow_orders WHERE id = ? LIMIT 1",
      [orderId]
    );
    const bothConfirmed = !!updatedRows[0]?.buyer_confirmed && !!updatedRows[0]?.seller_confirmed;

    if (bothConfirmed) {
      await pool.query(
        `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message, message_type)
         VALUES (?, 0, 'Hulu Escrow Bot', 'admin', ?, 'text')`,
        [orderId, "🎉 Both parties have confirmed! The admin can now finalize and close this trade."]
      );
    }

    res.json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} confirmation recorded.`,
      bothConfirmed,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Escrow Confirm Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/escrow/orders/:id/close
 * Admin closes the trade conversation after both parties have confirmed.
 * Requires admin privileges and executes atomically.
 */
escrowRouter.patch("/orders/:id/close", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const orderId = parseInt(req.params.id as string, 10);

    await conn.beginTransaction();

    const [orderRows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM escrow_orders WHERE id = ? FOR UPDATE",
      [orderId]
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Escrow order not found." });
      return;
    }

    const order = orderRows[0];

    if (order.is_closed) {
      await conn.rollback();
      res.status(400).json({ success: false, error: "Trade is already closed." });
      return;
    }

    if (!order.buyer_confirmed || !order.seller_confirmed) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: "Cannot close trade until both buyer and seller have confirmed completion.",
      });
      return;
    }

    // Close trade and mark as success
    await conn.query(
      "UPDATE escrow_orders SET is_closed = TRUE, closed_at = NOW(), status = 'success' WHERE id = ?",
      [orderId]
    );

    // Release funds from locked_balance to seller if not already released
    if (order.seller_id && order.status !== "success") {
      await conn.query(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        [order.amount, order.seller_id]
      );
      await conn.query(
        "UPDATE users SET locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?",
        [order.amount, order.buyer_id]
      );
    }

    // Mark channel as sold ONLY for social-media channels. Digital products remain active reusable inventory!
    if (order.channel_id) {
      const [chRows] = await conn.query<RowDataPacket[]>(
        "SELECT listing_type FROM channels WHERE id = ? LIMIT 1",
        [order.channel_id]
      );
      const isDigital = chRows.length > 0 && chRows[0].listing_type === "ebooks-digital";
      if (!isDigital) {
        await conn.query("UPDATE channels SET status = 'sold' WHERE id = ?", [order.channel_id]);
      }
    }

    // Post final closure message
    await conn.query(
      `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message, message_type)
       VALUES (?, 0, 'Hulu Market Admin', 'admin', ?, 'text')`,
      [
        orderId,
        `🔒 This trade has been officially closed by the administrator. Congratulations to both buyer and seller! The funds of ${order.amount} ETB have been released to the seller. This conversation is now read-only.`,
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: `Trade #${orderId} has been finalized and closed successfully.`,
    });
  } catch (error: unknown) {
    await conn.rollback();
    const err = error as Error;
    console.error("[Escrow Close Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});
