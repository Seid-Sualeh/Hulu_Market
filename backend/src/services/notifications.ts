import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db.js";

export type NotificationCategory = "escrow" | "wallet" | "marketplace" | "dispute" | "system";

export interface CreateNotificationParams {
  userId: number;
  type: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  orderId?: number | null;
  disputeId?: number | null;
  eventKey?: string | null;
  conn?: PoolConnection;
}

/**
 * Persists a notification for a specific recipient.
 * Uses INSERT IGNORE with (user_id, event_key) when eventKey is supplied
 * so retries or concurrent triggers never create duplicate notifications.
 * Non-fatal: logs and swallows DB errors so notification failure never rolls back primary flows.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const {
    userId,
    type,
    title,
    message,
    actionUrl = null,
    actionLabel = null,
    orderId = null,
    disputeId = null,
    eventKey = null,
    conn,
  } = params;

  if (!userId || userId <= 0) return;

  const executor = conn || pool;
  try {
    await executor.query(
      `INSERT IGNORE INTO notifications (
        user_id, type, title, message, action_url, action_label, order_id, dispute_id, event_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        title.slice(0, 255),
        message,
        actionUrl,
        actionLabel,
        orderId,
        disputeId,
        eventKey ? eventKey.slice(0, 120) : null,
      ]
    );
  } catch (err) {
    console.warn("[Notification Service] Non-fatal insert error:", (err as Error).message);
  }
}

/**
 * Broadcasts an administrative notification to all active admin accounts.
 * Deduplicated per (admin_id, eventKey) when eventKey is provided.
 */
export async function notifyAdmins(
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  const executor = params.conn || pool;
  try {
    const [admins] = await executor.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE role = 'admin'"
    );
    for (const admin of admins) {
      await createNotification({
        ...params,
        userId: Number(admin.id),
      });
    }
  } catch (err) {
    console.warn("[Notification Service] Non-fatal admin notify error:", (err as Error).message);
  }
}
