import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";
import { getStorageAdapter } from "../services/storage.js";
import {
  validateDigitalProductFile,
  getMaxFileSizeLimit,
} from "../services/digitalFileValidator.js";

export const digitalFilesRouter = Router();

// Memory storage for digital files to validate completely before persisting to private storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: getMaxFileSizeLimit(),
  },
});

/**
 * POST /api/channels/:id/file
 * Allows an authenticated seller to upload or replace the original digital asset for their listing.
 * Validates ownership, format, binary signature, and stores in private object storage.
 */
digitalFilesRouter.post(
  "/:id/file",
  authenticateToken,
  (req: Request, res: Response): void => {
    upload.single("file")(req, res, async (multerErr: unknown) => {
      if (multerErr) {
        const err = multerErr as Error & { code?: string };
        if (err.code === "LIMIT_FILE_SIZE") {
          const mb = Math.round(getMaxFileSizeLimit() / (1024 * 1024));
          console.warn(`[Security Log] File upload rejected: size exceeded limit of ${mb}MB. User #${req.user?.id}`);
          res.status(400).json({
            success: false,
            error: `File size exceeds the maximum permitted limit of ${mb} MB.`,
          });
          return;
        }
        res.status(400).json({ success: false, error: err.message || "File upload failed." });
        return;
      }

      const channelId = parseInt(req.params.id as string, 10);
      if (isNaN(channelId) || channelId <= 0) {
        res.status(400).json({ success: false, error: "Invalid listing ID." });
        return;
      }

      if (!req.file || !req.file.buffer) {
        res.status(400).json({ success: false, error: "No file was uploaded." });
        return;
      }

      const sellerId = req.user!.id;
      const isAdmin = req.user!.role === "admin";

      // 1. Ownership & Listing Type Verification
      const [channelRows] = await pool.query<RowDataPacket[]>(
        "SELECT id, seller_id, name, listing_type, status, digital_metadata FROM channels WHERE id = ? LIMIT 1",
        [channelId]
      );

      if (channelRows.length === 0) {
        res.status(404).json({ success: false, error: "Listing not found." });
        return;
      }

      const channel = channelRows[0];

      // Reject uploads to social media channels
      if (channel.listing_type !== "ebooks-digital") {
        console.warn(`[Security Log] Rejected file upload attempt to non-digital listing #${channelId} by user #${sellerId}`);
        res.status(400).json({
          success: false,
          error: "Original file attachments are only supported for Ebooks & Digital Products listings.",
        });
        return;
      }

      // Enforce strict ownership check
      if (Number(channel.seller_id) !== sellerId && !isAdmin) {
        console.warn(`[Security Log] Ownership violation: User #${sellerId} attempted to upload file to listing #${channelId} owned by #${channel.seller_id}`);
        res.status(403).json({
          success: false,
          error: "Access denied. You do not own this digital product listing.",
        });
        return;
      }

      // 2. Comprehensive File Validation (Extension, Untrusted MIME, Magic Bytes, Archive Safety)
      const validation = validateDigitalProductFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      if (!validation.valid) {
        console.warn(`[Security Log] File validation failed for listing #${channelId}: ${validation.error}`);
        res.status(400).json({
          success: false,
          error: validation.error || "File validation failed.",
        });
        return;
      }

      const storage = getStorageAdapter();
      const ext = path.extname(validation.sanitizedFilename!).toLowerCase();

      // 3. Upload to Private Storage Adapter
      let uploadResult: { storageKey: string; bytesWritten: number; checksumSha256: string };
      try {
        uploadResult = await storage.putObject(req.file.buffer, ext);
      } catch (storageErr) {
        console.error(`[Security Log] Storage adapter write failure for listing #${channelId}:`, (storageErr as Error).message);
        res.status(500).json({
          success: false,
          error: "Storage service temporarily unavailable. Please try again.",
        });
        return;
      }

      // 4. Transactional Metadata Persistence with Safe Replacement
      const conn = await pool.getConnection();
      let oldStorageKeyToDelete: string | null = null;

      try {
        await conn.beginTransaction();

        // Check if previous file exists for this listing
        const [existingFiles] = await conn.query<RowDataPacket[]>(
          "SELECT id, storage_key FROM digital_product_files WHERE listing_id = ? LIMIT 1 FOR UPDATE",
          [channelId]
        );

        let fileRecordId: number;

        if (existingFiles.length > 0) {
          // Record replacement: mark old storage key for cleanup AFTER commit
          oldStorageKeyToDelete = existingFiles[0].storage_key;
          fileRecordId = existingFiles[0].id;

          await conn.query(
            `UPDATE digital_product_files SET
              original_filename = ?,
              file_format = ?,
              mime_type = ?,
              file_size_bytes = ?,
              storage_key = ?,
              checksum_sha256 = ?,
              status = 'uploaded',
              updated_at = NOW()
             WHERE id = ?`,
            [
              validation.sanitizedFilename,
              validation.detectedFormat,
              validation.verifiedMimeType,
              uploadResult.bytesWritten,
              uploadResult.storageKey,
              uploadResult.checksumSha256,
              fileRecordId,
            ]
          );
        } else {
          // Insert new file record
          const [insertRes] = await conn.query<ResultSetHeader>(
            `INSERT INTO digital_product_files (
              listing_id, seller_id, original_filename, file_format,
              mime_type, file_size_bytes, storage_key, checksum_sha256, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')`,
            [
              channelId,
              sellerId,
              validation.sanitizedFilename,
              validation.detectedFormat,
              validation.verifiedMimeType,
              uploadResult.bytesWritten,
              uploadResult.storageKey,
              uploadResult.checksumSha256,
            ]
          );
          fileRecordId = insertRes.insertId;
        }

        // Update channels.digital_metadata without leaking private storage key
        let metaObj: Record<string, unknown> = {};
        if (channel.digital_metadata) {
          try {
            metaObj = typeof channel.digital_metadata === "string" ? JSON.parse(channel.digital_metadata) : channel.digital_metadata;
          } catch {
            metaObj = {};
          }
        }
        metaObj.file_attached = true;
        metaObj.file_format = validation.detectedFormat;
        metaObj.file_size_bytes = uploadResult.bytesWritten;
        metaObj.original_filename = validation.sanitizedFilename;
        metaObj.file_updated_at = new Date().toISOString();

        await conn.query(
          "UPDATE channels SET digital_metadata = ? WHERE id = ?",
          [JSON.stringify(metaObj), channelId]
        );

        await conn.commit();

        console.log(`[Security Log] Digital file uploaded successfully: Listing #${channelId}, File #${fileRecordId}, Format: ${validation.detectedFormat}, Size: ${uploadResult.bytesWritten} bytes, Checksum: ${uploadResult.checksumSha256}`);

        // Delete old storage object ONLY after database transaction succeeded
        if (oldStorageKeyToDelete) {
          try {
            await storage.deleteObject(oldStorageKeyToDelete);
          } catch (delErr) {
            console.warn(`[Storage Warning] Could not delete replaced file object ${oldStorageKeyToDelete}:`, (delErr as Error).message);
          }
        }

        res.status(201).json({
          success: true,
          message: "Original digital product file uploaded securely.",
          file: {
            id: fileRecordId,
            listing_id: channelId,
            original_filename: validation.sanitizedFilename,
            file_format: validation.detectedFormat,
            file_size_bytes: uploadResult.bytesWritten,
            mime_type: validation.verifiedMimeType,
            checksum_sha256: uploadResult.checksumSha256,
          },
        });
      } catch (dbErr) {
        await conn.rollback();
        // Clean up newly uploaded storage object to prevent orphan file accumulation
        storage.deleteObject(uploadResult.storageKey).catch(() => {});
        console.error(`[Security Log] Database error persisting file for listing #${channelId}:`, (dbErr as Error).message);
        res.status(500).json({
          success: false,
          error: "Failed to persist file metadata. Storage was safely cleaned up.",
        });
      } finally {
        conn.release();
      }
    });
  }
);

/**
 * GET /api/channels/:id/file
 * Returns file metadata for the authenticated listing owner or administrator.
 * Excludes private storage keys or permanent download paths.
 */
digitalFilesRouter.get(
  "/:id/file",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const channelId = parseInt(req.params.id as string, 10);
      if (isNaN(channelId) || channelId <= 0) {
        res.status(400).json({ success: false, error: "Invalid listing ID." });
        return;
      }

      const sellerId = req.user!.id;
      const isAdmin = req.user!.role === "admin";

      // Verify listing ownership
      const [channels] = await pool.query<RowDataPacket[]>(
        "SELECT id, seller_id, listing_type FROM channels WHERE id = ? LIMIT 1",
        [channelId]
      );

      if (channels.length === 0) {
        res.status(404).json({ success: false, error: "Listing not found." });
        return;
      }

      const channel = channels[0];
      if (Number(channel.seller_id) !== sellerId && !isAdmin) {
        res.status(403).json({ success: false, error: "Access denied. You do not own this listing." });
        return;
      }

      // Fetch file metadata
      const [files] = await pool.query<RowDataPacket[]>(
        `SELECT id, listing_id, seller_id, original_filename, file_format,
                mime_type, file_size_bytes, checksum_sha256, status, created_at, updated_at
         FROM digital_product_files
         WHERE listing_id = ?
         LIMIT 1`,
        [channelId]
      );

      if (files.length === 0) {
        res.json({ success: true, file: null });
        return;
      }

      res.json({ success: true, file: files[0] });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

/**
 * DELETE /api/channels/:id/file
 * Allows the authenticated seller owner or administrator to remove an attached digital file.
 */
digitalFilesRouter.delete(
  "/:id/file",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const conn = await pool.getConnection();
    try {
      const channelId = parseInt(req.params.id as string, 10);
      if (isNaN(channelId) || channelId <= 0) {
        res.status(400).json({ success: false, error: "Invalid listing ID." });
        return;
      }

      const sellerId = req.user!.id;
      const isAdmin = req.user!.role === "admin";

      const [channels] = await conn.query<RowDataPacket[]>(
        "SELECT id, seller_id, digital_metadata FROM channels WHERE id = ? LIMIT 1",
        [channelId]
      );

      if (channels.length === 0) {
        res.status(404).json({ success: false, error: "Listing not found." });
        return;
      }

      const channel = channels[0];
      if (Number(channel.seller_id) !== sellerId && !isAdmin) {
        res.status(403).json({ success: false, error: "Access denied. You do not own this listing." });
        return;
      }

      await conn.beginTransaction();

      const [files] = await conn.query<RowDataPacket[]>(
        "SELECT id, storage_key FROM digital_product_files WHERE listing_id = ? LIMIT 1 FOR UPDATE",
        [channelId]
      );

      if (files.length === 0) {
        await conn.rollback();
        res.status(404).json({ success: false, error: "No file is currently attached to this listing." });
        return;
      }

      const fileRecord = files[0];

      await conn.query("DELETE FROM digital_product_files WHERE id = ?", [fileRecord.id]);

      // Update channels.digital_metadata
      let metaObj: Record<string, unknown> = {};
      if (channel.digital_metadata) {
        try {
          metaObj = typeof channel.digital_metadata === "string" ? JSON.parse(channel.digital_metadata) : channel.digital_metadata;
        } catch {
          metaObj = {};
        }
      }
      metaObj.file_attached = false;
      delete metaObj.file_format;
      delete metaObj.file_size_bytes;
      delete metaObj.original_filename;
      metaObj.file_deleted_at = new Date().toISOString();

      await conn.query("UPDATE channels SET digital_metadata = ? WHERE id = ?", [JSON.stringify(metaObj), channelId]);

      await conn.commit();

      // Delete from storage adapter
      const storage = getStorageAdapter();
      await storage.deleteObject(fileRecord.storage_key);

      console.log(`[Security Log] File deleted from listing #${channelId} by user #${sellerId}`);

      res.json({ success: true, message: "Digital file deleted successfully." });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, error: (err as Error).message });
    } finally {
      conn.release();
    }
  }
);
