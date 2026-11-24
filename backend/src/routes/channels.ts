import { Router, Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  DIGITAL_PRODUCT_CATEGORY_NAME,
  DIGITAL_PRODUCT_CATEGORY_SLUG,
  DIGITAL_PRODUCT_SUBCATEGORIES,
  DIGITAL_PRODUCT_FILE_FORMATS,
  validateDigitalProductInput,
} from "../types/marketplace.js";

export const channelsRouter = Router();

/**
 * GET /api/channels
 * Returns public listings (social media channels and digital products).
 * Strictly filters to status = 'active' so pending/rejected listings are never exposed.
 * Supports filtering by platform, category, listing_type, subcategory, file_format, search, sort, and pagination.
 */
channelsRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const platform = req.query.platform ? String(req.query.platform).trim() : null;
    const category = req.query.category ? String(req.query.category).trim() : null;
    const listingType = req.query.listing_type ? String(req.query.listing_type).trim() : null;
    const subcategory = req.query.subcategory ? String(req.query.subcategory).trim() : null;
    const fileFormat = req.query.file_format ? String(req.query.file_format).trim() : null;
    const search = req.query.search || req.query.q ? String(req.query.search || req.query.q).trim() : null;
    const sort = req.query.sort ? String(req.query.sort).trim() : "newest";

    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10) || 1) : 1;
    const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 12)) : (req.query.page ? 12 : 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ["c.status = 'active'"];
    const params: (string | number)[] = [];

    if (platform && platform !== "all") {
      conditions.push("LOWER(c.platform) = LOWER(?)");
      params.push(platform);
    }

    if (category && category !== "all") {
      conditions.push("LOWER(c.category) = LOWER(?)");
      params.push(category);
    }

    if (listingType && listingType !== "all") {
      if (listingType.toLowerCase() === "social-media") {
        conditions.push("(LOWER(c.listing_type) = 'social-media' OR c.listing_type IS NULL)");
      } else {
        conditions.push("LOWER(c.listing_type) = LOWER(?)");
        params.push(listingType);
      }
    }

    if (subcategory && subcategory !== "all") {
      conditions.push("LOWER(c.subcategory) = LOWER(?)");
      params.push(subcategory);
    }

    if (fileFormat && fileFormat !== "all") {
      conditions.push("LOWER(c.file_format) = LOWER(?)");
      params.push(fileFormat);
    }

    if (search) {
      conditions.push("(LOWER(c.name) LIKE ? OR LOWER(c.description) LIKE ?)");
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 1. Count total matching rows for pagination
    const countSql = `SELECT COUNT(*) as total FROM channels c ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Determine sort order
    let orderClause = "ORDER BY c.id DESC";
    if (sort === "price_asc") {
      orderClause = "ORDER BY c.price ASC, c.id DESC";
    } else if (sort === "price_desc") {
      orderClause = "ORDER BY c.price DESC, c.id DESC";
    } else if (sort === "oldest") {
      orderClause = "ORDER BY c.id ASC";
    }

    // 3. Select public channels with safe public fields (excluding private moderation data)
    const selectSql = `
      SELECT c.id, c.seller_id, c.name, c.name as title, c.platform, c.category, c.listing_type,
             c.subcategory, c.file_format, c.page_count, c.language, c.price, c.description,
             c.subscribers, c.views_or_likes, c.link_url, c.status, c.created_at, c.updated_at,
             c.screenshot_url, c.supporting_screenshots, c.seller_username,
             u.first_name as seller_first_name, u.last_name as seller_last_name
      FROM channels c
      LEFT JOIN users u ON c.seller_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const [channels] = await pool.query<RowDataPacket[]>(selectSql, [...params, limit, offset]);

    res.json({
      success: true,
      channels,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/channels/categories
 * Returns marketplace categories, digital product subcategories, and supported file formats.
 * Placed before /:id route in Express.
 */
channelsRouter.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    categories: [
      {
        id: "social-media",
        name: "Social Media Channels",
        platforms: ["YouTube", "Instagram", "TikTok", "Telegram", "Facebook"],
      },
      {
        id: DIGITAL_PRODUCT_CATEGORY_SLUG,
        name: DIGITAL_PRODUCT_CATEGORY_NAME,
        subcategories: DIGITAL_PRODUCT_SUBCATEGORIES,
        fileFormats: DIGITAL_PRODUCT_FILE_FORMATS,
      },
    ],
  });
});

/**
 * POST /api/channels
 * Allows an authenticated seller to list a channel or digital product for sale. Created with status = 'pending'.
 * Server-side validates digital product metadata when category/listing_type is Ebooks & Digital Products.
 */
channelsRouter.post("/", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      title,
      platform,
      category,
      listing_type,
      subcategory,
      file_format,
      page_count,
      language,
      digital_metadata,
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

    const isDigitalProduct =
      listing_type === DIGITAL_PRODUCT_CATEGORY_SLUG ||
      listing_type === "digital" ||
      category === DIGITAL_PRODUCT_CATEGORY_NAME ||
      Boolean(subcategory) ||
      Boolean(file_format);

    const targetSellerId = req.user!.id;

    if (isDigitalProduct) {
      // 1. Digital Product server-side validation
      const validation = validateDigitalProductInput(req.body);
      if (!validation.valid || !validation.sanitized) {
        res.status(400).json({
          success: false,
          error: validation.errors[0] || "Invalid digital product listing data.",
          errors: validation.errors,
        });
        return;
      }

      if (agreed_declaration !== true) {
        res.status(400).json({ success: false, error: "You must accept the seller permission declaration to submit." });
        return;
      }

      const sanitized = validation.sanitized;

      // Construct metadata with declaration record
      let metaObj: Record<string, unknown> = {};
      if (sanitized.digital_metadata) {
        try {
          metaObj = JSON.parse(sanitized.digital_metadata);
        } catch {
          metaObj = {};
        }
      }
      metaObj.declaration = {
        agreed: true,
        declared_at: new Date().toISOString(),
      };
      const finalMetadata = JSON.stringify(metaObj);

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO channels (
          seller_id, name, platform, category, listing_type, subcategory,
          file_format, page_count, language, digital_metadata,
          subscribers, views_or_likes, price, link_url, screenshot_url,
          supporting_screenshots, description, seller_username, seller_phone,
          agreed_declaration, declared_at, status
        ) VALUES (?, ?, ?, ?, 'ebooks-digital', ?, ?, ?, ?, ?, '0', '0', ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), 'pending')`,
        [
          targetSellerId,
          sanitized.name,
          platform || sanitized.subcategory || "Digital",
          DIGITAL_PRODUCT_CATEGORY_NAME,
          sanitized.subcategory,
          sanitized.file_format,
          sanitized.page_count,
          sanitized.language,
          finalMetadata,
          sanitized.price,
          link_url || "",
          screenshot_url || null,
          supporting_screenshots
            ? (typeof supporting_screenshots === "string" ? supporting_screenshots : JSON.stringify(supporting_screenshots))
            : null,
          sanitized.description,
          seller_username || null,
          seller_phone || null,
        ]
      );

      const channelId = result.insertId;

      if (targetSellerId) {
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
             VALUES (?, 'marketplace', 'Digital Product Submitted for Review', ?, '/my-marketplace', 'View Listing')`,
            [
              targetSellerId,
              `Your digital product "${sanitized.name}" (${sanitized.subcategory}) has been submitted and is currently pending review by administrators.`,
            ]
          );
        } catch { /* ignore notification errors */ }
      }

      res.status(201).json({
        success: true,
        message: "Digital product submitted successfully and is pending review by admin.",
        channelId,
      });
      return;
    }

    // 2. Existing Social Media Channel Validation
    const resolvedName = (name || title || "").trim();
    if (!resolvedName || !platform || !price) {
      res.status(400).json({ success: false, error: "Channel name, platform, and price are required." });
      return;
    }

    if (agreed_declaration !== true) {
      res.status(400).json({ success: false, error: "You must accept the seller permission declaration to submit." });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (
        seller_id, name, platform, category, listing_type, subscribers, views_or_likes,
        price, link_url, screenshot_url, supporting_screenshots, description,
        seller_username, seller_phone, agreed_declaration, declared_at, status
      ) VALUES (?, ?, ?, ?, 'social-media', ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), 'pending')`,
      [
        targetSellerId,
        resolvedName,
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
            `Your channel listing "${resolvedName}" (${platform}) has been submitted and is currently pending review by administrators.`,
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
 * Allows an authenticated seller to correct and resubmit a rejected channel listing for review.
 */
channelsRouter.patch("/:id/resubmit", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = parseInt(req.params.id as string, 10);
    const {
      name,
      title,
      platform,
      category,
      subcategory,
      file_format,
      page_count,
      language,
      digital_metadata,
      subscribers,
      views_or_likes,
      price,
      link_url,
      screenshot_url,
      supporting_screenshots,
      description,
      seller_username,
      seller_phone,
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
    const currentUserId = req.user!.id;

    if (channel.seller_id && Number(channel.seller_id) !== currentUserId && req.user?.role !== "admin") {
      res.status(403).json({ success: false, error: "Unauthorized. You are not the owner of this listing." });
      return;
    }

    const resolvedName = (name || title || null)?.trim() || null;

    await pool.query(
      `UPDATE channels SET
        name = COALESCE(?, name),
        platform = COALESCE(?, platform),
        category = COALESCE(?, category),
        subcategory = COALESCE(?, subcategory),
        file_format = COALESCE(?, file_format),
        page_count = COALESCE(?, page_count),
        language = COALESCE(?, language),
        digital_metadata = COALESCE(?, digital_metadata),
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
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = NOW()
       WHERE id = ?`,
      [
        resolvedName,
        platform || null,
        category || null,
        subcategory || null,
        file_format || null,
        page_count !== undefined && page_count !== null ? Number(page_count) : null,
        language || null,
        digital_metadata ? (typeof digital_metadata === "string" ? digital_metadata : JSON.stringify(digital_metadata)) : null,
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
 * Returns channels submitted by the authenticated seller.
 * Must be defined BEFORE /:id route in Express!
 */
channelsRouter.get("/my", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === "admin";
    const sellerId = isAdmin && req.query.sellerId ? parseInt(String(req.query.sellerId), 10) : req.user!.id;

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
