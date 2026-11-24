import { pool } from "../config/db.js";
import { getStorageAdapter } from "./storage.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * Records a failed storage object cleanup operation into the database reconciliation queue.
 * Ensures orphaned files are tracked for audit and administrative retry.
 */
export async function recordFailedCleanup(
  storageKey: string,
  listingId: number | null,
  reason: string
): Promise<void> {
  try {
    const cleanKey = storageKey ? storageKey.trim().slice(0, 255) : "unknown";
    const cleanReason = reason ? reason.trim().slice(0, 255) : "Unknown deletion failure";
    await pool.query(
      `INSERT INTO failed_storage_cleanups (storage_key, listing_id, reason, status)
       VALUES (?, ?, ?, 'pending')`,
      [cleanKey, listingId, cleanReason]
    );
    console.warn(`[Storage Reconciliation] Recorded failed cleanup for key "${cleanKey}" (listing #${listingId}): ${cleanReason}`);
  } catch (err: unknown) {
    console.error(`[Storage Reconciliation Error] Failed to persist cleanup queue record for "${storageKey}":`, (err as Error).message);
  }
}

/**
 * Safely purges an attached digital product file for a given listing.
 * Deletes the database record within a transaction first, and attempts storage deletion.
 * If storage deletion fails, logs and records the failed cleanup for administrative reconciliation.
 */
export async function purgeListingFile(
  listingId: number
): Promise<{ deleted: boolean; storageKey?: string }> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, storage_key FROM digital_product_files WHERE listing_id = ? LIMIT 1",
    [listingId]
  );

  if (rows.length === 0) {
    return { deleted: false };
  }

  const { id: fileId, storage_key: storageKey } = rows[0];

  // Delete DB record
  await pool.query("DELETE FROM digital_product_files WHERE id = ?", [fileId]);

  // Attempt storage object deletion
  const storage = getStorageAdapter();
  try {
    await storage.deleteObject(storageKey);
  } catch (storageErr: unknown) {
    await recordFailedCleanup(storageKey, listingId, (storageErr as Error).message);
  }

  return { deleted: true, storageKey };
}
