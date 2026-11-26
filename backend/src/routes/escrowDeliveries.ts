import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";
import { getStorageAdapter } from "../services/storage.js";
import { recordFailedCleanup } from "../services/storageCleanup.js";
import { digitalFileUploadLimiter } from "./digitalFiles.js";
import {
  validateDigitalProductFile,
  getMaxFileSizeLimit,
} from "../services/digitalFileValidator.js";
import rateLimit from "express-rate-limit";

/** Rate limiter for buyer file downloads: 20 requests per minute per IP. */
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many download requests. Try again soon." },
});

export const escrowDeliveriesRouter = Router();

const MAX_DELIVERY_FILES = 5;

// Controlled private temporary upload directory (isolated from public web serving)
const tempUploadDir = path.resolve("storage/tmp_uploads");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true, mode: 0o700 });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, _file, cb) => {
    const randomHex = crypto.randomBytes(24).toString("hex");
    cb(null, `del_${randomHex}.tmp`);
  },
});

const deliveryUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: getMaxFileSizeLimit(),
    files: MAX_DELIVERY_FILES,
  },
});

const safeUnlinkAll = async (files?: Express.Multer.File[]): Promise<void> => {
  if (!files || files.length === 0) return;
  await Promise.all(
    files.map(async (f) => {
      if (f.path && fs.existsSync(f.path)) {
        try {
          await fs.promises.unlink(f.path);
        } catch {
          // ignore cleanup failure on already removed temp file
        }
      }
    })
  );
};

const formatBytesHuman = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * POST /api/escrow/orders/:id/deliveries
 * Allows the authenticated seller of an eligible digital product escrow order
 * to upload 1..5 validated delivery files into private storage and notify the order chat.
 * Does NOT release funds, close escrow, or mark reusable digital listings as sold.
 */
escrowDeliveriesRouter.post(
  "/orders/:id/deliveries",
  authenticateToken,
  digitalFileUploadLimiter,
  (req: Request, res: Response): void => {
    deliveryUpload.array("files", MAX_DELIVERY_FILES)(req, res, async (multerErr: unknown) => {
      const uploadedTempFiles = (req.files as Express.Multer.File[] | undefined) || [];
      try {
        if (multerErr) {
          await safeUnlinkAll(uploadedTempFiles);
          const err = multerErr as Error & { code?: string };
          if (err.code === "LIMIT_FILE_SIZE") {
            const mb = Math.round(getMaxFileSizeLimit() / (1024 * 1024));
            console.warn(`[Security Log] Delivery upload rejected: size exceeded ${mb}MB. User #${req.user?.id}`);
            res.status(400).json({
              success: false,
              error: `Each file must not exceed the maximum permitted limit of ${mb} MB.`,
            });
            return;
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            res.status(400).json({
              success: false,
              error: `You can deliver at most ${MAX_DELIVERY_FILES} files per upload.`,
            });
            return;
          }
          res.status(400).json({ success: false, error: err.message || "Delivery file upload failed." });
          return;
        }

        const orderId = parseInt(req.params.id as string, 10);
        if (isNaN(orderId) || orderId <= 0) {
          await safeUnlinkAll(uploadedTempFiles);
          res.status(400).json({ success: false, error: "Invalid escrow order ID." });
          return;
        }

        if (uploadedTempFiles.length === 0) {
          res.status(400).json({ success: false, error: "Please select at least one digital product file to deliver." });
          return;
        }

        const actorUserId = req.user!.id;

        // 1. Verify order existence, digital type, seller ownership, and eligibility
        const [orderRows] = await pool.query<RowDataPacket[]>(
          `SELECT id, channel_id, channel_name, listing_type, buyer_id, seller_id, status, is_closed
           FROM escrow_orders
           WHERE id = ?
           LIMIT 1`,
          [orderId]
        );

        if (orderRows.length === 0) {
          await safeUnlinkAll(uploadedTempFiles);
          res.status(404).json({ success: false, error: "Escrow order not found." });
          return;
        }

        const order = orderRows[0];

        if (order.listing_type !== "ebooks-digital") {
          await safeUnlinkAll(uploadedTempFiles);
          res.status(400).json({
            success: false,
            error: "Digital file delivery is only supported for Ebooks & Digital Products orders.",
          });
          return;
        }

        // Strict seller-only authorization (buyers, unrelated sellers, and other users are denied)
        if (!order.seller_id || Number(order.seller_id) !== actorUserId) {
          await safeUnlinkAll(uploadedTempFiles);
          console.warn(
            `[Security Log] Unauthorized delivery attempt on order #${orderId} by user #${actorUserId} (seller is #${order.seller_id})`
          );
          res.status(403).json({
            success: false,
            error: "Access denied. Only the verified seller of this order can deliver files.",
          });
          return;
        }

        if (order.status !== "processing" || Boolean(order.is_closed)) {
          await safeUnlinkAll(uploadedTempFiles);
          res.status(400).json({
            success: false,
            error: `This order is no longer eligible for file delivery (Status: ${order.status}${order.is_closed ? ", Closed" : ""}).`,
          });
          return;
        }

        // Verify associated listing is a valid digital product listing
        const listingId = Number(order.channel_id);
        const [channelRows] = await pool.query<RowDataPacket[]>(
          "SELECT id, seller_id, listing_type FROM channels WHERE id = ? LIMIT 1",
          [listingId]
        );

        if (channelRows.length === 0 || channelRows[0].listing_type !== "ebooks-digital") {
          await safeUnlinkAll(uploadedTempFiles);
          res.status(400).json({
            success: false,
            error: "Associated listing is not a valid digital product listing.",
          });
          return;
        }

        // 2. Read & validate ALL uploaded files server-side before storing any
        interface ValidatedFileEntry {
          buffer: Buffer;
          sanitizedFilename: string;
          detectedFormat: string;
          verifiedMimeType: string;
          ext: string;
        }

        const validatedEntries: ValidatedFileEntry[] = [];
        for (const tempFile of uploadedTempFiles) {
          if (!tempFile.path || !fs.existsSync(tempFile.path)) {
            await safeUnlinkAll(uploadedTempFiles);
            res.status(400).json({ success: false, error: "Uploaded temporary file is missing." });
            return;
          }

          const fileBuffer = await fs.promises.readFile(tempFile.path);
          const validation = validateDigitalProductFile(
            fileBuffer,
            tempFile.originalname,
            tempFile.mimetype
          );

          if (!validation.valid) {
            await safeUnlinkAll(uploadedTempFiles);
            console.warn(
              `[Security Log] Delivery file validation failed for order #${orderId}: ${validation.error}`
            );
            res.status(400).json({
              success: false,
              error: validation.error || "File validation failed.",
            });
            return;
          }

          validatedEntries.push({
            buffer: fileBuffer,
            sanitizedFilename: validation.sanitizedFilename!,
            detectedFormat: validation.detectedFormat!,
            verifiedMimeType: validation.verifiedMimeType!,
            ext: path.extname(validation.sanitizedFilename!).toLowerCase(),
          });
        }

        // 3. Upload validated files to private storage adapter
        let storage: ReturnType<typeof getStorageAdapter>;
        const storedObjects: Array<{
          entry: ValidatedFileEntry;
          storageKey: string;
          bytesWritten: number;
          checksumSha256: string;
        }> = [];

        try {
          storage = getStorageAdapter();
          for (const entry of validatedEntries) {
            const putRes = await storage.putObject(entry.buffer, entry.ext);
            storedObjects.push({
              entry,
              storageKey: putRes.storageKey,
              bytesWritten: putRes.bytesWritten,
              checksumSha256: putRes.checksumSha256,
            });
          }
        } catch (storageErr) {
          // Roll back any objects already written in this batch
          for (const obj of storedObjects) {
            try {
              await storage!.deleteObject(obj.storageKey);
            } catch (delErr) {
              await recordFailedCleanup(obj.storageKey, listingId, (delErr as Error).message);
            }
          }
          await safeUnlinkAll(uploadedTempFiles);
          console.error(
            `[Security Log] Private storage write failure for order #${orderId}:`,
            (storageErr as Error).message
          );
          res.status(500).json({
            success: false,
            error: "Storage service temporarily unavailable. Please try again.",
          });
          return;
        }

        // 4. Persist delivery metadata and chat notification atomically
        const rawNote = typeof req.body?.deliveryNote === "string" ? req.body.deliveryNote.trim() : "";
        const deliveryNote = rawNote ? rawNote.slice(0, 500) : null;

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          // Re-verify order state under row lock
          const [lockedOrderRows] = await conn.query<RowDataPacket[]>(
            "SELECT id, seller_id, buyer_id, status, is_closed FROM escrow_orders WHERE id = ? FOR UPDATE",
            [orderId]
          );

          if (
            lockedOrderRows.length === 0 ||
            lockedOrderRows[0].status !== "processing" ||
            Boolean(lockedOrderRows[0].is_closed) ||
            Number(lockedOrderRows[0].seller_id) !== actorUserId
          ) {
            throw new Error("ORDER_STATE_INVALID");
          }

          const [delivRes] = await conn.query<ResultSetHeader>(
            `INSERT INTO digital_order_deliveries (
              order_id, listing_id, seller_id, buyer_id, file_count, delivery_note, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'delivered')`,
            [orderId, listingId, actorUserId, Number(order.buyer_id), storedObjects.length, deliveryNote]
          );
          const deliveryId = delivRes.insertId;

          const insertedFiles: Array<{
            id: number;
            original_filename: string;
            file_format: string;
            mime_type: string;
            file_size_bytes: number;
            checksum_sha256: string;
          }> = [];

          for (const obj of storedObjects) {
            const [fileRes] = await conn.query<ResultSetHeader>(
              `INSERT INTO digital_order_delivery_files (
                delivery_id, order_id, listing_id, seller_id,
                original_filename, file_format, mime_type, file_size_bytes,
                storage_key, checksum_sha256
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                deliveryId,
                orderId,
                listingId,
                actorUserId,
                obj.entry.sanitizedFilename,
                obj.entry.detectedFormat,
                obj.entry.verifiedMimeType,
                obj.bytesWritten,
                obj.storageKey,
                obj.checksumSha256,
              ]
            );
            insertedFiles.push({
              id: fileRes.insertId,
              original_filename: obj.entry.sanitizedFilename,
              file_format: obj.entry.detectedFormat,
              mime_type: obj.entry.verifiedMimeType,
              file_size_bytes: obj.bytesWritten,
              checksum_sha256: obj.checksumSha256,
            });
          }

          // Post order-scoped delivery notification into escrow_messages (no storage keys or paths)
          const fileSummary = insertedFiles
            .map((f) => `${f.original_filename} (${formatBytesHuman(f.file_size_bytes)})`)
            .join(", ");
          const chatNotification = deliveryNote
            ? `📦 Seller delivered ${insertedFiles.length} digital product file(s): ${fileSummary}. Note: "${deliveryNote}"`
            : `📦 Seller delivered ${insertedFiles.length} digital product file(s): ${fileSummary}.`;

          await conn.query(
            `INSERT INTO escrow_messages (order_id, sender_id, sender_name, sender_role, message, message_type)
             VALUES (?, 0, 'Hulu Escrow Bot', 'admin', ?, 'text')`,
            [orderId, chatNotification]
          );

          // Notify buyer (non-fatal)
          try {
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
               VALUES (?, 'escrow', 'Digital Product Files Delivered 📦', ?, ?, 'View Trade Chat')`,
              [
                Number(order.buyer_id),
                `The seller has delivered ${insertedFiles.length} file(s) for "${order.channel_name}" (Order #${orderId}).`,
                `/inbox?orderId=${orderId}`,
              ]
            );
          } catch {
            // ignore notification failure
          }

          await conn.commit();

          console.log(
            `[Security Log] Digital delivery #${deliveryId} recorded for order #${orderId} (${insertedFiles.length} file(s)) by seller #${actorUserId}`
          );

          res.status(201).json({
            success: true,
            message: `${insertedFiles.length} digital product file(s) delivered securely.`,
            delivery: {
              id: deliveryId,
              order_id: orderId,
              listing_id: listingId,
              seller_id: actorUserId,
              buyer_id: Number(order.buyer_id),
              file_count: insertedFiles.length,
              delivery_note: deliveryNote,
              status: "delivered",
              created_at: new Date().toISOString(),
              files: insertedFiles,
            },
          });
        } catch (dbErr: unknown) {
          await conn.rollback();
          // Clean up uploaded private storage objects so no orphaned files remain
          for (const obj of storedObjects) {
            try {
              await storage.deleteObject(obj.storageKey);
            } catch (delErr) {
              await recordFailedCleanup(obj.storageKey, listingId, (delErr as Error).message);
            }
          }

          const errMsg = (dbErr as Error).message;
          if (errMsg === "ORDER_STATE_INVALID") {
            res.status(400).json({
              success: false,
              error: "Order is no longer eligible for file delivery.",
            });
            return;
          }

          console.error(`[Security Log] Database persistence failure for delivery on order #${orderId}:`, errMsg);
          res.status(500).json({
            success: false,
            error: "Failed to save delivery metadata. Uploaded files were safely cleaned up.",
          });
        } finally {
          conn.release();
        }
      } catch (unexpectedErr: unknown) {
        console.error("[Delivery Upload Unexpected Error]:", unexpectedErr);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: "Unexpected error during file delivery. Please try again.",
          });
        }
      } finally {
        await safeUnlinkAll(uploadedTempFiles);
      }
    });
  }
);

/**
 * GET /api/escrow/orders/:id/deliveries
 * Returns sanitized delivery batches and file metadata for a specific escrow order.
 * Strictly restricted to the verified buyer, verified seller, or admin.
 * Private storage keys and filesystem paths are NEVER returned.
 */
escrowDeliveriesRouter.get(
  "/orders/:id/deliveries",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string, 10);
      if (isNaN(orderId) || orderId <= 0) {
        res.status(400).json({ success: false, error: "Invalid escrow order ID." });
        return;
      }

      const [orderRows] = await pool.query<RowDataPacket[]>(
        "SELECT id, buyer_id, seller_id, listing_type FROM escrow_orders WHERE id = ? LIMIT 1",
        [orderId]
      );

      if (orderRows.length === 0) {
        res.status(404).json({ success: false, error: "Escrow order not found." });
        return;
      }

      const order = orderRows[0];
      const currentUserId = req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (
        !isAdmin &&
        currentUserId !== Number(order.buyer_id) &&
        currentUserId !== Number(order.seller_id)
      ) {
        res.status(403).json({
          success: false,
          error: "Access denied. You are not a participant in this trade.",
        });
        return;
      }

      const [deliveryRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, order_id, listing_id, seller_id, buyer_id, file_count, delivery_note, status, created_at
         FROM digital_order_deliveries
         WHERE order_id = ?
         ORDER BY created_at DESC, id DESC`,
        [orderId]
      );

      if (deliveryRows.length === 0) {
        res.json({ success: true, deliveries: [] });
        return;
      }

      const [fileRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, delivery_id, order_id, listing_id, original_filename, file_format,
                mime_type, file_size_bytes, checksum_sha256, created_at
         FROM digital_order_delivery_files
         WHERE order_id = ?
         ORDER BY id ASC`,
        [orderId]
      );

      const filesByDelivery = new Map<number, RowDataPacket[]>();
      for (const f of fileRows) {
        const dId = Number(f.delivery_id);
        const list = filesByDelivery.get(dId) || [];
        list.push(f);
        filesByDelivery.set(dId, list);
      }

      const deliveries = deliveryRows.map((d) => ({
        id: d.id,
        order_id: d.order_id,
        listing_id: d.listing_id,
        file_count: d.file_count,
        delivery_note: d.delivery_note,
        status: d.status,
        created_at: d.created_at,
        files: filesByDelivery.get(Number(d.id)) || [],
      }));

      res.json({ success: true, deliveries });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

/**
 * GET /api/escrow/orders/:id/deliveries/:fileId/download
 * Buyer (or admin) securely downloads a delivered digital product file.
 * - Verifies buyer ownership of the order.
 * - Verifies file belongs to this order (server-side, never trusts client key).
 * - Verifies delivery status is 'delivered' (not revoked).
 * - Streams file via proxy (Buffer); never exposes storage key or public URL.
 * - SHA-256 integrity check before serving.
 * - Logs each download attempt to digital_order_file_downloads.
 * - Does NOT auto-confirm buyer or release funds.
 */
escrowDeliveriesRouter.get(
  "/orders/:id/deliveries/:fileId/download",
  authenticateToken,
  downloadLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const orderId = parseInt(req.params.id as string, 10);
    const fileId = parseInt(req.params.fileId as string, 10);

    if (isNaN(orderId) || orderId <= 0 || isNaN(fileId) || fileId <= 0) {
      res.status(400).json({ success: false, error: "Invalid order or file ID." });
      return;
    }

    try {
      // 1. Fetch order
      const [orderRows] = await pool.query<RowDataPacket[]>(
        "SELECT id, listing_type, buyer_id, seller_id, status, is_closed FROM escrow_orders WHERE id = ? LIMIT 1",
        [orderId]
      );
      if (orderRows.length === 0) {
        res.status(404).json({ success: false, error: "Order not found." });
        return;
      }
      const order = orderRows[0];

      // 2. Must be a digital product order
      if (order.listing_type !== "ebooks-digital") {
        res.status(400).json({ success: false, error: "File downloads are only available for digital product orders." });
        return;
      }

      // 3. Authorization: only the verified buyer or an admin may download
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;
      if (Number(order.buyer_id) !== currentUserId && currentUserRole !== "admin") {
        res.status(403).json({ success: false, error: "Only the buyer of this order may download its files." });
        return;
      }

      // 4. Fetch file record — binding validated server-side (order_id = orderId)
      const [fileRows] = await pool.query<RowDataPacket[]>(
        `SELECT f.id, f.delivery_id, f.original_filename, f.storage_key,
                f.mime_type, f.file_size_bytes, f.checksum_sha256
         FROM digital_order_delivery_files f
         WHERE f.id = ? AND f.order_id = ?
         LIMIT 1`,
        [fileId, orderId]
      );
      if (fileRows.length === 0) {
        res.status(404).json({ success: false, error: "File not found for this order." });
        return;
      }
      const fileRecord = fileRows[0];

      // 5. Check delivery status (must be 'delivered', not 'revoked')
      const [delivRows] = await pool.query<RowDataPacket[]>(
        "SELECT status FROM digital_order_deliveries WHERE id = ? LIMIT 1",
        [fileRecord.delivery_id]
      );
      if (delivRows.length === 0 || delivRows[0].status !== "delivered") {
        res.status(410).json({ success: false, error: "This delivery has been revoked and is no longer available." });
        return;
      }

      // 6. Retrieve file from storage (server-side key, never from client)
      const storage = getStorageAdapter();
      let fileBuffer: Buffer;
      try {
        fileBuffer = await storage.getObject(fileRecord.storage_key);
      } catch (storageErr: unknown) {
        const msg = (storageErr as Error).message || "";
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no such")) {
          res.status(404).json({ success: false, error: "File not found in storage." });
        } else {
          console.error("[Download] Storage retrieval error:", msg);
          res.status(500).json({ success: false, error: "Failed to retrieve file." });
        }
        return;
      }

      // 7. SHA-256 integrity check
      if (fileRecord.checksum_sha256) {
        const actualHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        if (actualHash !== fileRecord.checksum_sha256) {
          console.error(
            `[Download] Integrity check FAILED for file ${fileId}. Expected ${fileRecord.checksum_sha256}, got ${actualHash}`
          );
          res.status(500).json({ success: false, error: "File integrity check failed. Please contact support." });
          return;
        }
      }

      // 8. Log download audit record (non-fatal if fails)
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress || null;
      const userAgent = (req.headers["user-agent"] || "").substring(0, 255) || null;
      try {
        await pool.query(
          `INSERT INTO digital_order_file_downloads
             (order_id, delivery_id, file_id, buyer_id, ip_address, user_agent, status)
           VALUES (?, ?, ?, ?, ?, ?, 'success')`,
          [orderId, fileRecord.delivery_id, fileId, currentUserId, ipAddress, userAgent]
        );
      } catch (logErr) {
        console.error("[Download] Failed to log download audit:", (logErr as Error).message);
      }

      // 9. Sanitize filename for Content-Disposition (strip non-ASCII, quotes)
      const rawFilename = fileRecord.original_filename || "download";
      const safeFilename = rawFilename.replace(/[^\x20-\x7E]/g, "").replace(/["\\]/g, "").trim() || "download";

      // 10. Stream the buffer to client with security headers
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.setHeader("Content-Type", fileRecord.mime_type || "application/octet-stream");
      res.setHeader("Content-Length", String(fileBuffer.length));
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
      res.end(fileBuffer);
    } catch (error: unknown) {
      console.error("[Download] Unexpected error:", (error as Error).message);
      res.status(500).json({ success: false, error: "An unexpected error occurred." });
    }
  }
);
