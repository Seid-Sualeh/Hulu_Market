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
 * Allows a user to list a channel for sale. Created with status = 'pending'.
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
    } = req.body;

    if (!name || !platform || !price) {
      res.status(400).json({ success: false, error: "Name, platform, and price are required." });
      return;
    }

    const targetSellerId = sellerId ? parseInt(String(sellerId), 10) : null;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, name, platform, category, subscribers, views_or_likes, price, link_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        targetSellerId,
        name,
        platform,
        category || "General",
        subscribers ? String(subscribers) : "0",
        views_or_likes ? String(views_or_likes) : "0",
        Number(price),
        link_url || "",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Channel submitted successfully and is pending review by admin.",
      channelId: result.insertId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Create Channel Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/channels/my
 * Returns channels submitted by a particular seller.
 */
channelsRouter.get("/my", async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.query.sellerId ? parseInt(String(req.query.sellerId), 10) : null;

    if (!sellerId) {
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
