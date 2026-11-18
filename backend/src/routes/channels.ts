import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";

export const channelsRouter = Router();

/**
 * GET /api/channels
 * Returns public channel listings.
 */
channelsRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const platform = req.query.platform ? String(req.query.platform) : null;
    let query = "SELECT * FROM channels WHERE status = 'active'";
    const params: string[] = [];

    if (platform && platform !== "all") {
      query += " AND LOWER(platform) = LOWER(?)";
      params.push(platform);
    }

    query += " ORDER BY id DESC LIMIT 100";

    const [channels] = await pool.query<RowDataPacket[]>(query, params);
    res.json({ success: true, channels });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/channels
 * Allows a seller to list a channel for sale. Created with status = 'pending'.
 */
channelsRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sellerId,
      name,
      platform,
      category,
      subscribers,
      views_or_likes,
      price,
      link_url,
      screenshot_url,
      supporting_screenshots,
      description,
      seller_username,
      seller_phone,
      agreed_declaration,
    } = req.body;

    if (!name || !platform || !price) {
      res.status(400).json({ success: false, error: "Channel name, platform, and price are required." });
      return;
    }

    if (!agreed_declaration && agreed_declaration !== undefined) {
      res.status(400).json({ success: false, error: "You must accept the seller permission declaration to submit." });
      return;
    }

    const targetSellerId = sellerId ? parseInt(String(sellerId), 10) : null;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (
        seller_id, name, platform, category, subscribers, views_or_likes,
        price, link_url, screenshot_url, supporting_screenshots, description,
        seller_username, seller_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        targetSellerId,
        name,
        platform,
        category || "General",
        subscribers ? String(subscribers) : "0",
        views_or_likes ? String(views_or_likes) : "0",
        Number(price),
        link_url || "",
        screenshot_url || null,
        supporting_screenshots ? (typeof supporting_screenshots === "string" ? supporting_screenshots : JSON.stringify(supporting_screenshots)) : null,
        description || null,
        seller_username || null,
        seller_phone || null,
      ]
    );

    const channelId = result.insertId;

    // Create a notification for the seller
    if (targetSellerId) {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
           VALUES (?, 'marketplace', 'Channel Listing Submitted for Review', ?, '/my-marketplace', 'View Listing')`,
          [
            targetSellerId,
            `Your channel listing "${name}" (${platform}) has been submitted and is currently pending review by administrators.`,
          ]
        );
      } catch { /* ignore notification errors */ }
    }

    res.status(201).json({
      success: true,
      message: "Channel submitted successfully and is pending review by admin.",
      channelId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Create Channel Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/channels/:id/resubmit
 * Allows a seller to correct and resubmit a rejected channel listing for review.
 */
channelsRouter.patch("/:id/resubmit", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = parseInt(req.params.id as string, 10);
    const {
      name,
      platform,
      category,
      subscribers,
      views_or_likes,
      price,
      link_url,
      screenshot_url,
      supporting_screenshots,
      description,
      seller_username,
      seller_phone,
      sellerId,
    } = req.body;

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM channels WHERE id = ? LIMIT 1",
      [channelId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, error: "Channel not found." });
      return;
    }

    const channel = existing[0];
    if (sellerId && channel.seller_id && Number(sellerId) !== Number(channel.seller_id)) {
      res.status(403).json({ success: false, error: "Unauthorized. You are not the owner of this listing." });
      return;
    }

    await pool.query(
      `UPDATE channels SET
        name = COALESCE(?, name),
        platform = COALESCE(?, platform),
        category = COALESCE(?, category),
        subscribers = COALESCE(?, subscribers),
        views_or_likes = COALESCE(?, views_or_likes),
        price = COALESCE(?, price),
        link_url = COALESCE(?, link_url),
        screenshot_url = COALESCE(?, screenshot_url),
        supporting_screenshots = COALESCE(?, supporting_screenshots),
        description = COALESCE(?, description),
        seller_username = COALESCE(?, seller_username),
        seller_phone = COALESCE(?, seller_phone),
        status = 'pending',
        rejection_reason = NULL,
        updated_at = NOW()
       WHERE id = ?`,
      [
        name || null,
        platform || null,
        category || null,
        subscribers || null,
        views_or_likes || null,
        price ? Number(price) : null,
        link_url || null,
        screenshot_url || null,
        supporting_screenshots ? (typeof supporting_screenshots === "string" ? supporting_screenshots : JSON.stringify(supporting_screenshots)) : null,
        description || null,
        seller_username || null,
        seller_phone || null,
        channelId,
      ]
    );

    res.json({
      success: true,
      message: "Channel listing updated and resubmitted for admin review.",
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Resubmit Channel Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/channels/my
 * Returns channels submitted by a particular seller.
 * Must be defined BEFORE /:id route in Express!
 */
channelsRouter.get("/my", async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.query.sellerId ? parseInt(String(req.query.sellerId), 10) : null;

    if (!sellerId || isNaN(sellerId)) {
      res.json({ success: true, channels: [] });
      return;
    }

    const [channels] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM channels WHERE seller_id = ? ORDER BY id DESC",
      [sellerId]
    );

    res.json({ success: true, channels });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/channels/:id
 * Returns single channel details.
 */
channelsRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = parseInt(req.params.id as string, 10);
    if (isNaN(channelId)) {
      res.status(400).json({ success: false, error: "Invalid channel ID." });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM channels WHERE id = ? LIMIT 1",
      [channelId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "Channel not found." });
      return;
    }

    res.json({ success: true, channel: rows[0] });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
