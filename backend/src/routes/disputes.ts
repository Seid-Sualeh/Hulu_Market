import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { getStorageAdapter } from "../services/storage.js";
import { recordFailedCleanup } from "../services/storageCleanup.js";
import { validateDigitalProductFile } from "../services/digitalFileValidator.js";
import { digitalFileUploadLimiter } from "./digitalFiles.js";
import { createNotification, notifyAdmins } from "../services/notifications.js";

export const disputesRouter = Router();

const VALID_CATEGORIES = new Set([
  "non_delivery",
  "file_corrupted_or_mismatch",
  "unauthorized_access",
  "payment_issue",
  "communication_issue",
  "other",
]);

const ACTIVE_DISPUTE_STATUSES = ["open", "under_review", "awaiting_information"] as const;
type DisputeStatus = "open" | "under_review" | "awaiting_information" | "resolved" | "rejected";

const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  open: ["under_review", "awaiting_information", "resolved", "rejected"],
  under_review: ["awaiting_information", "resolved", "rejected"],
  awaiting_information: ["under_review", "resolved", "rejected"],
  resolved: [],
  rejected: [],
};

const VALID_OUTCOMES = new Set([
  "none",
  "buyer_favor",
  "seller_favor",
  "mutual_agreement",
  "dismissed",
]);

const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10 MB

const tempUploadDir = path.resolve("storage/tmp_uploads");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true, mode: 0o700 });
}

const evidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempUploadDir),
    filename: (_req, _file, cb) => {
      cb(null, `disp_${crypto.randomBytes(20).toString("hex")}.tmp`);
    },
  }),
  limits: {
    fileSize: MAX_EVIDENCE_BYTES,
    files: MAX_EVIDENCE_FILES,
  },
});

const safeUnlinkAll = async (files?: Express.Multer.File[]): Promise<void> => {
  if (!files || files.length === 0) return;
  await Promise.all(
    files.map(async (f) => {
      if (f.path && fs.existsSync(f.path)) {
        try {
          await fs.promises.unlink(f.path);
        } catch {}
      }
    })
  );
};

/**
 * Strips potentially dangerous HTML/script tags from user-submitted plain text
 * as defense-in-depth against stored XSS.
 */
function sanitizePlainText(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Validates dispute evidence file (supports digital doc formats + PNG/JPG screenshots).
 */
function validateEvidenceFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  detectedFormat?: string;
  verifiedMimeType?: string;
  ext?: string;
} {
  const safeName = path.basename(originalFilename || "evidence").replace(/[^\w.\- ]+/g, "_");
  const ext = path.extname(safeName).toLowerCase();

  if (ext === ".png") {
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      return { valid: false, error: "Invalid PNG image: magic bytes do not match." };
    }
    return {
      valid: true,
      sanitizedFilename: safeName,
      detectedFormat: "PNG",
      verifiedMimeType: "image/png",
      ext: ".png",
    };
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, error: "Invalid JPEG image: magic bytes do not match." };
    }
    return {
      valid: true,
      sanitizedFilename: safeName,
      detectedFormat: "JPEG",
      verifiedMimeType: "image/jpeg",
      ext,
    };
  }

  // Fallback to existing strict digital file validator (PDF, TXT, DOCX, ZIP, etc.)
  const res = validateDigitalProductFile(buffer, originalFilename, mimeType);
  if (!res.valid) return { valid: false, error: res.error };
  return {
    valid: true,
    sanitizedFilename: res.sanitizedFilename,
    detectedFormat: res.detectedFormat,
    verifiedMimeType: res.verifiedMimeType,
    ext: path.extname(res.sanitizedFilename!).toLowerCase(),
  };
}

/**
 * POST /api/disputes
 * Buyer or seller submits a dispute for their own eligible (processing, non-closed) escrow order.
 * Does NOT release funds, refund funds, or close the escrow chat.
 */
disputesRouter.post("/", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const orderId = parseInt(String(req.body?.orderId ?? req.body?.order_id ?? ""), 10);
    const category = String(req.body?.category ?? "").trim();
    const rawDesc = String(req.body?.description ?? "");
    const description = sanitizePlainText(rawDesc);

    if (isNaN(orderId) || orderId <= 0) {
      res.status(400).json({ success: false, error: "A valid escrow order ID is required." });
      return;
    }

    if (!VALID_CATEGORIES.has(category)) {
      res.status(400).json({
        success: false,
        error: "Invalid dispute category.",
      });
      return;
    }

    if (description.length < 10 || description.length > 2000) {
      res.status(400).json({
        success: false,
        error: "Dispute description must be between 10 and 2000 characters.",
      });
      return;
    }

    const actorId = req.user!.id;

    await conn.beginTransaction();

    // Lock the order row to prevent concurrent duplicate active disputes
    const [orderRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, channel_id, channel_name, listing_type, buyer_id, seller_id, status, is_closed
       FROM escrow_orders
       WHERE id = ?
       LIMIT 1 FOR UPDATE`,
      [orderId]
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Escrow order not found." });
      return;
    }

    const order = orderRows[0];
    let submittedRole: "buyer" | "seller";
    if (Number(order.buyer_id) === actorId) {
      submittedRole = "buyer";
    } else if (order.seller_id && Number(order.seller_id) === actorId) {
      submittedRole = "seller";
    } else {
      await conn.rollback();
      res.status(403).json({
        success: false,
        error: "Access denied. Only the buyer or seller of this order can submit a dispute.",
      });
      return;
    }

    if (order.status !== "processing" || Boolean(order.is_closed)) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: `This order is not eligible for a new dispute (Status: ${order.status}${order.is_closed ? ", Closed" : ""}).`,
      });
      return;
    }

    // Prevent duplicate active dispute on the same order
    const [existing] = await conn.query<RowDataPacket[]>(
      `SELECT id, status FROM disputes
       WHERE order_id = ? AND status IN ('open', 'under_review', 'awaiting_information')
       LIMIT 1`,
      [orderId]
    );

    if (existing.length > 0) {
      await conn.rollback();
      res.status(409).json({
        success: false,
        error: `An active dispute (#${existing[0].id}) already exists for this order.`,
        disputeId: existing[0].id,
      });
      return;
    }

    const [dispRes] = await conn.query<ResultSetHeader>(
      `INSERT INTO disputes (order_id, listing_id, submitted_by, submitted_role, category, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [orderId, order.channel_id || null, actorId, submittedRole, category, description]
    );
    const disputeId = dispRes.insertId;

    await conn.query(
      `INSERT INTO dispute_history (dispute_id, actor_id, actor_role, action_type, from_status, to_status, note, is_internal)
       VALUES (?, ?, ?, 'created', NULL, 'open', ?, FALSE)`,
      [disputeId, actorId, submittedRole, `Dispute opened (${category}).`]
    );

    // Notify counterparty (never include private chat content)
    const otherPartyId = submittedRole === "buyer" ? Number(order.seller_id) : Number(order.buyer_id);
    if (otherPartyId) {
      await createNotification({
        userId: otherPartyId,
        type: "dispute",
        title: `Dispute Opened on Order #${orderId}`,
        message: `A dispute (#${disputeId}) was submitted by the ${submittedRole} for "${order.channel_name}". An admin will review this case.`,
        actionUrl: `/inbox?orderId=${orderId}`,
        actionLabel: "View Order",
        orderId,
        disputeId,
        eventKey: `dispute_created_party_${disputeId}`,
        conn,
      });
    }

    // Notify admins
    await notifyAdmins({
      type: "dispute",
      title: `New Dispute #${disputeId} Requires Review`,
      message: `${submittedRole.toUpperCase()} opened a "${category}" dispute on Escrow Order #${orderId} ("${order.channel_name}").`,
      actionUrl: `/admin`,
      actionLabel: "Review Dispute",
      orderId,
      disputeId,
      eventKey: `dispute_created_admin_${disputeId}`,
      conn,
    });

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Dispute submitted successfully. An administrator will review it shortly.",
      dispute: {
        id: disputeId,
        order_id: orderId,
        submitted_by: actorId,
        submitted_role: submittedRole,
        category,
        description,
        status: "open",
      },
    });
  } catch (error: unknown) {
    await conn.rollback();
    console.error("[Dispute Create Error]:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/disputes/my
 * Lists disputes belonging to the authenticated buyer or seller.
 */
disputesRouter.get("/my", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT d.id, d.order_id, d.listing_id, d.submitted_by, d.submitted_role,
              d.category, d.description, d.status, d.resolution_outcome, d.resolution_summary,
              d.resolved_at, d.created_at, d.updated_at,
              o.channel_name, o.amount, o.listing_type, o.status AS order_status, o.is_closed
       FROM disputes d
       JOIN escrow_orders o ON d.order_id = o.id
       WHERE o.buyer_id = ? OR o.seller_id = ?
       ORDER BY d.id DESC
       LIMIT 50`,
      [userId, userId]
    );
    res.json({ success: true, disputes: rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/disputes/admin
 * Admin list of all disputes with status & search filtering.
 */
disputesRouter.get("/admin", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status ? String(req.query.status).trim() : null;
    const orderId = req.query.orderId ? parseInt(String(req.query.orderId), 10) : null;
    const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status && ["open", "under_review", "awaiting_information", "resolved", "rejected"].includes(status)) {
      conditions.push("d.status = ?");
      params.push(status);
    }
    if (orderId && !isNaN(orderId)) {
      conditions.push("d.order_id = ?");
      params.push(orderId);
    }
    if (search) {
      conditions.push("(o.channel_name LIKE ? OR d.description LIKE ? OR d.category LIKE ?)");
      params.push(search, search, search);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT d.*,
              o.channel_name, o.platform, o.listing_type, o.amount,
              o.buyer_id, o.buyer_name, o.seller_id, o.seller_name,
              o.status AS order_status, o.buyer_confirmed, o.seller_confirmed, o.is_closed
       FROM disputes d
       JOIN escrow_orders o ON d.order_id = o.id
       ${where}
       ORDER BY FIELD(d.status, 'open', 'awaiting_information', 'under_review', 'resolved', 'rejected'), d.id DESC
       LIMIT 100`,
      params
    );

    res.json({ success: true, disputes: rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/disputes/:id
 * Returns dispute details, evidence metadata (no storage_key), and history.
 * Internal admin notes (is_internal = TRUE) are strictly hidden from non-admins.
 */
disputesRouter.get("/:id", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const disputeId = parseInt(req.params.id as string, 10);
    if (isNaN(disputeId) || disputeId <= 0) {
      res.status(400).json({ success: false, error: "Invalid dispute ID." });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT d.*,
              o.channel_name, o.platform, o.listing_type, o.amount,
              o.buyer_id, o.buyer_name, o.seller_id, o.seller_name,
              o.status AS order_status, o.buyer_confirmed, o.seller_confirmed, o.is_closed
       FROM disputes d
       JOIN escrow_orders o ON d.order_id = o.id
       WHERE d.id = ?
       LIMIT 1`,
      [disputeId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "Dispute not found." });
      return;
    }

    const dispute = rows[0];
    const currentUserId = req.user!.id;
    const isAdmin = req.user!.role === "admin";

    if (
      !isAdmin &&
      currentUserId !== Number(dispute.buyer_id) &&
      currentUserId !== Number(dispute.seller_id)
    ) {
      res.status(403).json({ success: false, error: "Access denied. You are not a participant in this dispute." });
      return;
    }

    const historyQuery = isAdmin
      ? "SELECT id, dispute_id, actor_id, actor_role, action_type, from_status, to_status, note, is_internal, created_at FROM dispute_history WHERE dispute_id = ? ORDER BY id ASC"
      : "SELECT id, dispute_id, actor_id, actor_role, action_type, from_status, to_status, note, is_internal, created_at FROM dispute_history WHERE dispute_id = ? AND is_internal = FALSE ORDER BY id ASC";

    const [history] = await pool.query<RowDataPacket[]>(historyQuery, [disputeId]);

    const [evidence] = await pool.query<RowDataPacket[]>(
      `SELECT id, dispute_id, order_id, uploaded_by, uploader_role,
              original_filename, file_format, mime_type, file_size_bytes, checksum_sha256, created_at
       FROM dispute_evidence
       WHERE dispute_id = ?
       ORDER BY id ASC`,
      [disputeId]
    );

    res.json({
      success: true,
      dispute,
      history,
      evidence,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/disputes/:id/info
 * Buyer or seller submits additional dispute information.
 */
disputesRouter.post("/:id/info", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const disputeId = parseInt(req.params.id as string, 10);
    const note = sanitizePlainText(String(req.body?.note ?? req.body?.content ?? ""));

    if (isNaN(disputeId) || disputeId <= 0) {
      res.status(400).json({ success: false, error: "Invalid dispute ID." });
      return;
    }
    if (note.length < 3 || note.length > 2000) {
      res.status(400).json({ success: false, error: "Information message must be between 3 and 2000 characters." });
      return;
    }

    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT d.*, o.buyer_id, o.seller_id, o.channel_name
       FROM disputes d
       JOIN escrow_orders o ON d.order_id = o.id
       WHERE d.id = ? LIMIT 1 FOR UPDATE`,
      [disputeId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Dispute not found." });
      return;
    }

    const dispute = rows[0];
    const actorId = req.user!.id;
    let actorRole: "buyer" | "seller";
    if (actorId === Number(dispute.buyer_id)) actorRole = "buyer";
    else if (actorId === Number(dispute.seller_id)) actorRole = "seller";
    else {
      await conn.rollback();
      res.status(403).json({ success: false, error: "Only dispute participants can submit additional information." });
      return;
    }

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      await conn.rollback();
      res.status(400).json({ success: false, error: "Cannot submit information on a closed dispute." });
      return;
    }

    const [histRes] = await conn.query<ResultSetHeader>(
      `INSERT INTO dispute_history (dispute_id, actor_id, actor_role, action_type, from_status, to_status, note, is_internal)
       VALUES (?, ?, ?, 'info_submitted', ?, ?, ?, FALSE)`,
      [disputeId, actorId, actorRole, dispute.status, dispute.status, note]
    );

    await notifyAdmins({
      type: "dispute",
      title: `New Info on Dispute #${disputeId}`,
      message: `The ${actorRole} submitted additional information on Dispute #${disputeId} (Order #${dispute.order_id}).`,
      actionUrl: `/admin`,
      actionLabel: "Review Dispute",
      orderId: Number(dispute.order_id),
      disputeId,
      eventKey: `dispute_info_${disputeId}_${histRes.insertId}`,
      conn,
    });

    await conn.commit();
    res.status(201).json({ success: true, message: "Additional information submitted." });
  } catch (error: unknown) {
    await conn.rollback();
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/disputes/:id/evidence
 * Upload 1..3 evidence files into private storage for an active dispute.
 */
disputesRouter.post(
  "/:id/evidence",
  authenticateToken,
  digitalFileUploadLimiter,
  (req: Request, res: Response): void => {
    evidenceUpload.array("files", MAX_EVIDENCE_FILES)(req, res, async (multerErr: unknown) => {
      const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];
      try {
        if (multerErr) {
          await safeUnlinkAll(uploadedFiles);
          res.status(400).json({ success: false, error: (multerErr as Error).message || "Evidence upload failed." });
          return;
        }

        const disputeId = parseInt(req.params.id as string, 10);
        if (isNaN(disputeId) || disputeId <= 0) {
          await safeUnlinkAll(uploadedFiles);
          res.status(400).json({ success: false, error: "Invalid dispute ID." });
          return;
        }

        if (uploadedFiles.length === 0) {
          res.status(400).json({ success: false, error: "Please attach at least one evidence file." });
          return;
        }

        const [dispRows] = await pool.query<RowDataPacket[]>(
          `SELECT d.*, o.buyer_id, o.seller_id
           FROM disputes d
           JOIN escrow_orders o ON d.order_id = o.id
           WHERE d.id = ? LIMIT 1`,
          [disputeId]
        );

        if (dispRows.length === 0) {
          await safeUnlinkAll(uploadedFiles);
          res.status(404).json({ success: false, error: "Dispute not found." });
          return;
        }

        const dispute = dispRows[0];
        const actorId = req.user!.id;
        const isAdmin = req.user!.role === "admin";
        let uploaderRole: "buyer" | "seller" | "admin";
        if (isAdmin) uploaderRole = "admin";
        else if (actorId === Number(dispute.buyer_id)) uploaderRole = "buyer";
        else if (actorId === Number(dispute.seller_id)) uploaderRole = "seller";
        else {
          await safeUnlinkAll(uploadedFiles);
          res.status(403).json({ success: false, error: "Access denied. You cannot upload evidence to this dispute." });
          return;
        }

        if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
          await safeUnlinkAll(uploadedFiles);
          res.status(400).json({ success: false, error: "Cannot upload evidence to a resolved or rejected dispute." });
          return;
        }

        const validated: Array<{
          buffer: Buffer;
          sanitizedFilename: string;
          detectedFormat: string;
          verifiedMimeType: string;
          ext: string;
        }> = [];

        for (const f of uploadedFiles) {
          const buf = await fs.promises.readFile(f.path);
          const v = validateEvidenceFile(buf, f.originalname, f.mimetype);
          if (!v.valid) {
            await safeUnlinkAll(uploadedFiles);
            res.status(400).json({ success: false, error: v.error || "Invalid evidence file." });
            return;
          }
          validated.push({
            buffer: buf,
            sanitizedFilename: v.sanitizedFilename!,
            detectedFormat: v.detectedFormat!,
            verifiedMimeType: v.verifiedMimeType!,
            ext: v.ext!,
          });
        }

        let storage: ReturnType<typeof getStorageAdapter>;
        const stored: Array<{
          entry: (typeof validated)[number];
          storageKey: string;
          bytesWritten: number;
          checksumSha256: string;
        }> = [];

        try {
          storage = getStorageAdapter();
          for (const entry of validated) {
            const putRes = await storage.putObject(entry.buffer, entry.ext);
            stored.push({
              entry,
              storageKey: putRes.storageKey,
              bytesWritten: putRes.bytesWritten,
              checksumSha256: putRes.checksumSha256,
            });
          }
        } catch (storageErr) {
          for (const s of stored) {
            try {
              await storage!.deleteObject(s.storageKey);
            } catch (delErr) {
              await recordFailedCleanup(s.storageKey, Number(dispute.listing_id) || null, (delErr as Error).message);
            }
          }
          res.status(500).json({ success: false, error: "Storage service temporarily unavailable." });
          return;
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          const createdEvidence: any[] = [];
          for (const s of stored) {
            const [evRes] = await conn.query<ResultSetHeader>(
              `INSERT INTO dispute_evidence (
                dispute_id, order_id, uploaded_by, uploader_role,
                original_filename, file_format, mime_type, file_size_bytes,
                storage_key, checksum_sha256
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                disputeId,
                dispute.order_id,
                actorId,
                uploaderRole,
                s.entry.sanitizedFilename,
                s.entry.detectedFormat,
                s.entry.verifiedMimeType,
                s.bytesWritten,
                s.storageKey,
                s.checksumSha256,
              ]
            );
            createdEvidence.push({
              id: evRes.insertId,
              original_filename: s.entry.sanitizedFilename,
              file_format: s.entry.detectedFormat,
              mime_type: s.entry.verifiedMimeType,
              file_size_bytes: s.bytesWritten,
              checksum_sha256: s.checksumSha256,
            });
          }

          const [histRes] = await conn.query<ResultSetHeader>(
            `INSERT INTO dispute_history (dispute_id, actor_id, actor_role, action_type, from_status, to_status, note, is_internal)
             VALUES (?, ?, ?, 'evidence_added', ?, ?, ?, FALSE)`,
            [
              disputeId,
              actorId,
              uploaderRole,
              dispute.status,
              dispute.status,
              `Uploaded ${createdEvidence.length} evidence file(s): ${createdEvidence.map((e) => e.original_filename).join(", ")}`,
            ]
          );

          if (uploaderRole !== "admin") {
            await notifyAdmins({
              type: "dispute",
              title: `Evidence Added to Dispute #${disputeId}`,
              message: `The ${uploaderRole} uploaded ${createdEvidence.length} evidence file(s) for Dispute #${disputeId}.`,
              actionUrl: `/admin`,
              actionLabel: "Review Evidence",
              orderId: Number(dispute.order_id),
              disputeId,
              eventKey: `dispute_evidence_${disputeId}_${histRes.insertId}`,
              conn,
            });
          }

          await conn.commit();
          res.status(201).json({ success: true, evidence: createdEvidence });
        } catch (dbErr) {
          await conn.rollback();
          for (const s of stored) {
            try {
              await storage!.deleteObject(s.storageKey);
            } catch (delErr) {
              await recordFailedCleanup(s.storageKey, Number(dispute.listing_id) || null, (delErr as Error).message);
            }
          }
          res.status(500).json({ success: false, error: "Failed to save evidence metadata." });
        } finally {
          conn.release();
        }
      } catch (err) {
        console.error("[Dispute Evidence Unexpected Error]:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: "Unexpected error uploading evidence." });
        }
      } finally {
        await safeUnlinkAll(uploadedFiles);
      }
    });
  }
);

/**
 * GET /api/disputes/:id/evidence/:evidenceId/download
 * Securely proxies dispute evidence to verified dispute participants or admins.
 */
disputesRouter.get(
  "/:id/evidence/:evidenceId/download",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const disputeId = parseInt(req.params.id as string, 10);
      const evidenceId = parseInt(req.params.evidenceId as string, 10);
      if (isNaN(disputeId) || disputeId <= 0 || isNaN(evidenceId) || evidenceId <= 0) {
        res.status(400).json({ success: false, error: "Invalid dispute or evidence ID." });
        return;
      }

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT de.*, o.buyer_id, o.seller_id
         FROM dispute_evidence de
         JOIN escrow_orders o ON de.order_id = o.id
         WHERE de.id = ? AND de.dispute_id = ?
         LIMIT 1`,
        [evidenceId, disputeId]
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: "Evidence file not found." });
        return;
      }

      const ev = rows[0];
      const actorId = req.user!.id;
      const isAdmin = req.user!.role === "admin";
      if (!isAdmin && actorId !== Number(ev.buyer_id) && actorId !== Number(ev.seller_id)) {
        res.status(403).json({ success: false, error: "Access denied. You cannot download this evidence." });
        return;
      }

      const storage = getStorageAdapter();
      const buffer = await storage.getObject(ev.storage_key);
      const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
      if (ev.checksum_sha256 && actualHash !== ev.checksum_sha256) {
        res.status(500).json({ success: false, error: "Evidence integrity verification failed." });
        return;
      }

      const safeName = path.basename(ev.original_filename || "evidence").replace(/[^\w.\- ]+/g, "_");
      res.setHeader("Content-Type", ev.mime_type || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
      res.end(buffer);
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

/**
 * PATCH /api/disputes/:id/status
 * Admin-only status transition with state machine validation, audit history, and notifications.
 * Does NOT release/refund funds or close escrow chat.
 */
disputesRouter.patch("/:id/status", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const disputeId = parseInt(req.params.id as string, 10);
    const targetStatus = String(req.body?.status ?? "").trim() as DisputeStatus;
    const note = req.body?.note ? sanitizePlainText(String(req.body.note)) : "";
    const resolutionOutcome = (req.body?.resolutionOutcome ?? req.body?.resolution_outcome)
      ? String(req.body.resolutionOutcome ?? req.body.resolution_outcome).trim()
      : "none";
    const resolutionSummary = (req.body?.resolutionSummary ?? req.body?.resolution_summary)
      ? sanitizePlainText(String(req.body.resolutionSummary ?? req.body.resolution_summary))
      : null;

    if (isNaN(disputeId) || disputeId <= 0) {
      res.status(400).json({ success: false, error: "Invalid dispute ID." });
      return;
    }

    if (!["under_review", "awaiting_information", "resolved", "rejected"].includes(targetStatus)) {
      res.status(400).json({ success: false, error: "Invalid target dispute status." });
      return;
    }

    if (!VALID_OUTCOMES.has(resolutionOutcome)) {
      res.status(400).json({ success: false, error: "Invalid resolution outcome." });
      return;
    }

    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT d.*, o.buyer_id, o.seller_id, o.channel_name
       FROM disputes d
       JOIN escrow_orders o ON d.order_id = o.id
       WHERE d.id = ? LIMIT 1 FOR UPDATE`,
      [disputeId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "Dispute not found." });
      return;
    }

    const dispute = rows[0];
    const currentStatus = dispute.status as DisputeStatus;

    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        error: `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`,
      });
      return;
    }

    const adminId = req.user!.id;
    const isTerminal = targetStatus === "resolved" || targetStatus === "rejected";

    if (isTerminal) {
      await conn.query(
        `UPDATE disputes
         SET status = ?, resolution_outcome = ?, resolution_summary = ?,
             assigned_admin_id = COALESCE(assigned_admin_id, ?),
             resolved_by = ?, resolved_at = NOW()
         WHERE id = ?`,
        [
          targetStatus,
          resolutionOutcome === "none" ? (targetStatus === "rejected" ? "dismissed" : "mutual_agreement") : resolutionOutcome,
          resolutionSummary || note || null,
          adminId,
          adminId,
          disputeId,
        ]
      );
    } else {
      await conn.query(
        `UPDATE disputes
         SET status = ?, assigned_admin_id = COALESCE(assigned_admin_id, ?)
         WHERE id = ?`,
        [targetStatus, adminId, disputeId]
      );
    }

    const actionType =
      targetStatus === "awaiting_information"
        ? "info_request"
        : targetStatus === "resolved"
        ? "resolved"
        : targetStatus === "rejected"
        ? "rejected"
        : "status_change";

    const [histRes] = await conn.query<ResultSetHeader>(
      `INSERT INTO dispute_history (dispute_id, actor_id, actor_role, action_type, from_status, to_status, note, is_internal)
       VALUES (?, ?, 'admin', ?, ?, ?, ?, FALSE)`,
      [
        disputeId,
        adminId,
        actionType,
        currentStatus,
        targetStatus,
        note || resolutionSummary || `Status changed from ${currentStatus} to ${targetStatus}.`,
      ]
    );

    // Notify buyer and seller
    const notifTitle =
      targetStatus === "awaiting_information"
        ? `Admin Requested Info on Dispute #${disputeId}`
        : isTerminal
        ? `Dispute #${disputeId} ${targetStatus === "resolved" ? "Resolved" : "Rejected"}`
        : `Dispute #${disputeId} Status Updated`;

    const notifMsg =
      isTerminal
        ? `Dispute #${disputeId} on Order #${dispute.order_id} ("${dispute.channel_name}") has been ${targetStatus} by admin.`
        : `Dispute #${disputeId} on Order #${dispute.order_id} ("${dispute.channel_name}") is now "${targetStatus.replace(/_/g, " ")}".`;

    await createNotification({
      userId: Number(dispute.buyer_id),
      type: "dispute",
      title: notifTitle,
      message: notifMsg,
      actionUrl: `/inbox?orderId=${dispute.order_id}`,
      actionLabel: "View Order",
      orderId: Number(dispute.order_id),
      disputeId,
      eventKey: `dispute_status_buyer_${disputeId}_${histRes.insertId}`,
      conn,
    });

    if (dispute.seller_id) {
      await createNotification({
        userId: Number(dispute.seller_id),
        type: "dispute",
        title: notifTitle,
        message: notifMsg,
        actionUrl: `/inbox?orderId=${dispute.order_id}`,
        actionLabel: "View Order",
        orderId: Number(dispute.order_id),
        disputeId,
        eventKey: `dispute_status_seller_${disputeId}_${histRes.insertId}`,
        conn,
      });
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Dispute #${disputeId} updated to '${targetStatus}'.`,
      status: targetStatus,
    });
  } catch (error: unknown) {
    await conn.rollback();
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/disputes/:id/notes
 * Admin-only internal note (is_internal = TRUE). Strictly hidden from buyers and sellers.
 */
disputesRouter.post("/:id/notes", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const disputeId = parseInt(req.params.id as string, 10);
    const note = sanitizePlainText(String(req.body?.note ?? req.body?.content ?? ""));
    if (isNaN(disputeId) || disputeId <= 0) {
      res.status(400).json({ success: false, error: "Invalid dispute ID." });
      return;
    }
    if (note.length < 2 || note.length > 2000) {
      res.status(400).json({ success: false, error: "Internal note must be between 2 and 2000 characters." });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, status FROM disputes WHERE id = ? LIMIT 1",
      [disputeId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "Dispute not found." });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO dispute_history (dispute_id, actor_id, actor_role, action_type, from_status, to_status, note, is_internal)
       VALUES (?, ?, 'admin', 'admin_note', ?, ?, ?, TRUE)`,
      [disputeId, req.user!.id, rows[0].status, rows[0].status, note]
    );

    res.status(201).json({
      success: true,
      noteId: result.insertId,
      message: "Internal admin note recorded.",
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
