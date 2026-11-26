/**
 * Feature 11 Verification Suite — Notifications & Admin Dispute Handling
 * Hulu Market Digital & Social-Media Marketplace
 *
 * Tests covering:
 *  T01–T08  Notification system (schema, pagination, filtering, auth, dedup, ownership)
 *  T09–T16  Dispute submission guard-rails (auth, order state, duplicates, financial safety)
 *  T17–T19  Dispute read access and internal-note redaction
 *  T20–T26  Admin dispute management (transitions, resolution, notes)
 *  T27–T29  Evidence authorization & security (download isolation, storage_key redaction)
 *  T30–T33  Feature-10 regression (chat closure unaffected by disputes)
 */

import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool, initDatabase } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

async function runDisputesNotificationsVerification() {
  console.log(
    "=== HULU MARKET FEATURE 11: NOTIFICATIONS & ADMIN DISPUTE HANDLING ==="
  );

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // ── Spin up in-process test server ────────────────────────────────────
  await initDatabase();
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  const JWT_SECRET = getJwtSecret();
  const ts = Date.now();

  // ── Seed test users ───────────────────────────────────────────────────
  const adminEmail   = `admin_f11_${ts}@hulumarket.et`;
  const sellerEmail  = `seller_f11_${ts}@test.et`;
  const buyerEmail   = `buyer_f11_${ts}@test.et`;
  const unrelEmail   = `unrelated_f11_${ts}@test.et`;

  let adminId = 0, sellerId = 0, buyerId = 0, unrelId = 0;
  let channelListingId = 0;
  let processingOrderId = 0;
  let cancelledOrderId  = 0;
  let closedOrderId     = 0;
  let disputeId = 0;

  async function insertUser(email: string, first: string, last: string, role: string, bal: number): Promise<number> {
    const [r] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, ?, 'hash_pwd', ?, ?, ?, ?, 0)`,
      [email, `+251911${Math.floor(100000 + Math.random() * 899999)}`, first, last, role, bal]
    );
    return r.insertId;
  }

  adminId  = await insertUser(adminEmail,  "Admin", "F11", "admin", 0);
  sellerId = await insertUser(sellerEmail, "Seller", "F11", "user", 0);
  buyerId  = await insertUser(buyerEmail,  "Buyer", "F11", "user", 5000);
  unrelId  = await insertUser(unrelEmail,  "Unrel", "F11", "user", 1000);

  function token(userId: number, email: string, role = "user"): string {
    return jwt.sign({ userId, id: userId, email, role }, JWT_SECRET, { expiresIn: "1h" });
  }

  const adminTok  = token(adminId,  adminEmail,  "admin");
  const sellerTok = token(sellerId, sellerEmail, "user");
  const buyerTok  = token(buyerId,  buyerEmail,  "user");
  const unrelTok  = token(unrelId,  unrelEmail,  "user");

  // Create an active digital listing in channels
  const [chRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO channels (seller_id, seller_username, name, platform, category, listing_type, subcategory, file_format, price, status, agreed_declaration)
     VALUES (?, 'seller_f11', 'F11 Test Ebook', 'PDF', 'Ebooks & Digital Products', 'ebooks-digital', 'Programming', 'pdf', 100.00, 'active', TRUE)`,
    [sellerId]
  );
  channelListingId = chRes.insertId;

  // Insert escrow orders
  const [procOrderRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status, buyer_confirmed, seller_confirmed, is_closed)
     VALUES (?, 'F11 Test Ebook', 'PDF', 'ebooks-digital', ?, 'Buyer F11', ?, 'Seller F11', 100.00, 'processing', 0, 0, 0)`,
    [channelListingId, buyerId, sellerId]
  );
  processingOrderId = procOrderRes.insertId;

  const [cancOrderRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status, buyer_confirmed, seller_confirmed, is_closed)
     VALUES (?, 'F11 Test Ebook', 'PDF', 'ebooks-digital', ?, 'Buyer F11', ?, 'Seller F11', 100.00, 'cancelled', 0, 0, 0)`,
    [channelListingId, buyerId, sellerId]
  );
  cancelledOrderId = cancOrderRes.insertId;

  const [closOrderRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status, buyer_confirmed, seller_confirmed, is_closed, closed_by)
     VALUES (?, 'F11 Test Ebook', 'PDF', 'ebooks-digital', ?, 'Buyer F11', ?, 'Seller F11', 100.00, 'completed', 1, 1, 1, ?)`,
    [channelListingId, buyerId, sellerId, adminId]
  );
  closedOrderId = closOrderRes.insertId;

  // Helper fetch
  async function req(
    method: string,
    reqPath: string,
    tok?: string,
    body?: Record<string, any>
  ): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const p = reqPath.startsWith("/") ? reqPath : `/${reqPath}`;
    const res = await fetch(`${baseUrl}${p}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any;
    try { data = await res.json(); } catch { data = {}; }
    return { status: res.status, data };
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 1 — NOTIFICATION SYSTEM (T01–T08)
  // ════════════════════════════════════════════════════════════════
  console.log("── SECTION 1: Notification System ──");

  // T01 — DB schema has order_id, dispute_id, event_key in notifications
  {
    const [cols] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM notifications");
    const names = cols.map((c: any) => c.Field);
    assert(
      names.includes("order_id") && names.includes("dispute_id") && names.includes("event_key"),
      "T01 — notifications table has order_id, dispute_id, event_key columns",
      `Found: ${names.join(", ")}`
    );
  }

  // T02 — GET /api/user/notifications returns paginated results
  {
    for (let i = 0; i < 5; i++) {
      await pool.query(
        `INSERT IGNORE INTO notifications (user_id, type, title, message, event_key) VALUES (?,?,?,?,?)`,
        [buyerId, "order", `Notif ${i}`, `msg ${i}`, `f11_seed_${ts}_${i}`]
      );
    }
    const r = await req("GET", `/api/user/notifications?limit=3&offset=0`, buyerTok);
    assert(r.status === 200, "T02 — GET /notifications returns 200", `Got ${r.status}`);
    assert(Array.isArray(r.data?.notifications), "T02 — notifications is array");
    assert(r.data?.notifications?.length <= 3, "T02 — limit=3 respected");
    assert(typeof r.data?.total === "number", "T02 — total is number");
    assert(typeof r.data?.hasMore === "boolean", "T02 — hasMore is boolean");
  }

  // T03 — unreadOnly filter works
  {
    await pool.query("UPDATE notifications SET is_read=TRUE WHERE user_id=?", [buyerId]);
    await pool.query(
      `INSERT IGNORE INTO notifications (user_id, type, title, message, event_key, is_read) VALUES (?,?,?,?,?,0)`,
      [buyerId, "order", "Unread Notif", "unread msg", `f11_unread_${ts}`]
    );
    const r = await req("GET", `/api/user/notifications?unreadOnly=true`, buyerTok);
    assert(r.status === 200, "T03 — GET /notifications?unreadOnly=true returns 200");
    const all = r.data?.notifications ?? [];
    assert(all.every((n: any) => n.is_read === false || n.is_read === 0), "T03 — all returned notifications are unread");
  }

  // T04 — PATCH /api/user/notifications/read-all marks all unread
  {
    await pool.query(
      `INSERT IGNORE INTO notifications (user_id, type, title, message, event_key, is_read) VALUES (?,?,?,?,?,0)`,
      [buyerId, "system", "One more unread", "msg", `f11_unread2_${ts}`]
    );
    const r = await req("PATCH", `/api/user/notifications/read-all`, buyerTok);
    assert(r.status === 200, "T04 — PATCH /notifications/read-all returns 200");
    const [check] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=? AND is_read=FALSE", [buyerId]
    );
    assert((check[0] as any).cnt === 0, "T04 — all buyer notifications now read in DB");
  }

  // T05 — PATCH /api/user/notifications/:id/read with wrong user → 403
  {
    await pool.query(
      `INSERT IGNORE INTO notifications (user_id, type, title, message, event_key) VALUES (?,?,?,?,?)`,
      [sellerId, "order", "Seller Notif", "msg", `f11_seller_notif_${ts}`]
    );
    const [sRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 1", [sellerId]
    );
    const sellerNotifId = (sRows[0] as any)?.id;
    if (sellerNotifId) {
      const r = await req("PATCH", `/api/user/notifications/${sellerNotifId}/read`, buyerTok);
      assert(r.status === 403, "T05 — PATCH /notifications/:id/read with wrong user → 403", `Got ${r.status}`);
    } else {
      assert(false, "T05 — could not find seller notification to test ownership");
    }
  }

  // T06 — Duplicate event_key notifications deduplicated via INSERT IGNORE
  {
    const eventKey = `f11_dedup_${ts}`;
    await pool.query(
      `INSERT IGNORE INTO notifications (user_id, type, title, message, event_key) VALUES (?,?,?,?,?)`,
      [buyerId, "order", "Dedup Test", "msg", eventKey]
    );
    await pool.query(
      `INSERT IGNORE INTO notifications (user_id, type, title, message, event_key) VALUES (?,?,?,?,?)`,
      [buyerId, "order", "Dedup Test", "msg", eventKey]
    );
    const [drows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=? AND event_key=?", [buyerId, eventKey]
    );
    assert((drows[0] as any).cnt === 1, "T06 — duplicate event_key notification deduplicated");
  }

  // T07 — Buyer sees only their own notifications
  {
    const r = await req("GET", `/api/user/notifications?limit=100`, buyerTok);
    const notifs = r.data?.notifications ?? [];
    const foreign = notifs.filter((n: any) => n.user_id !== buyerId);
    assert(foreign.length === 0, "T07 — buyer cannot see other users' notifications");
  }

  // T08 — Unauthenticated access → 401
  {
    const r = await req("GET", `/api/user/notifications`);
    assert(r.status === 401, "T08 — unauthenticated GET /notifications → 401", `Got ${r.status}`);
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 2 — DISPUTE SUBMISSION GUARD-RAILS (T09–T16)
  // ════════════════════════════════════════════════════════════════
  console.log("\n── SECTION 2: Dispute Submission Guard-Rails ──");

  // T09 — Unauthenticated dispute submission → 401
  {
    const r = await req("POST", `/api/disputes`, undefined, {
      order_id: processingOrderId,
      category: "other",
      description: "unauthenticated dispute",
    });
    assert(r.status === 401, "T09 — unauthenticated POST /disputes → 401", `Got ${r.status}`);
  }

  // T10 — Unrelated user dispute submission → 403
  {
    const r = await req("POST", `/api/disputes`, unrelTok, {
      order_id: processingOrderId,
      category: "other",
      description: "unrelated user dispute",
    });
    assert(r.status === 403, "T10 — unrelated user POST /disputes → 403", `Got ${r.status}`);
  }

  // T11 — Cancelled order dispute → 400
  {
    const r = await req("POST", `/api/disputes`, buyerTok, {
      order_id: cancelledOrderId,
      category: "other",
      description: "cancelled order dispute",
    });
    assert(r.status === 400, "T11 — dispute on cancelled order → 400", `Got ${r.status}`);
  }

  // T12 — Closed order dispute → 400
  {
    const r = await req("POST", `/api/disputes`, buyerTok, {
      order_id: closedOrderId,
      category: "other",
      description: "closed order dispute",
    });
    assert(r.status === 400, "T12 — dispute on is_closed=true order → 400", `Got ${r.status}`);
  }

  // T13 — Valid buyer dispute → 201 + DB record created
  {
    const r = await req("POST", `/api/disputes`, buyerTok, {
      order_id: processingOrderId,
      category: "non_delivery",
      description: "I have not received the digital product file after payment.",
    });
    assert(r.status === 201, "T13 — buyer POST /disputes on processing order → 201", `Got ${r.status}: ${JSON.stringify(r.data)}`);
    disputeId = r.data?.dispute?.id ?? 0;
    assert(disputeId > 0, "T13 — dispute record ID > 0 returned");

    const [dRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, order_id, submitted_by, submitted_role, category, status FROM disputes WHERE id=?",
      [disputeId]
    );
    const d = dRows[0] as any;
    assert(d?.order_id === processingOrderId, "T13 — dispute.order_id matches in DB");
    assert(d?.submitted_by === buyerId, "T13 — dispute.submitted_by matches buyer in DB");
    assert(d?.status === "open", "T13 — dispute initial status is 'open'");
  }

  // T14 — Duplicate active dispute → 409
  {
    const r = await req("POST", `/api/disputes`, buyerTok, {
      order_id: processingOrderId,
      category: "other",
      description: "second dispute on same order",
    });
    assert(r.status === 409, "T14 — duplicate active dispute → 409", `Got ${r.status}`);
  }

  // T15 — Dispute does NOT release funds / does not change order status or is_closed
  {
    const [oRows] = await pool.query<RowDataPacket[]>(
      "SELECT status, is_closed FROM escrow_orders WHERE id=?", [processingOrderId]
    );
    const o = oRows[0] as any;
    assert(o?.is_closed === 0, "T15 — dispute does NOT set is_closed to 1");
    assert(o?.status === "processing", "T15 — order status remains 'processing'");
  }

  // T16 — Dispute does NOT change buyer_confirmed or seller_confirmed
  {
    const [oRows] = await pool.query<RowDataPacket[]>(
      "SELECT buyer_confirmed, seller_confirmed FROM escrow_orders WHERE id=?", [processingOrderId]
    );
    const o = oRows[0] as any;
    assert(o?.buyer_confirmed === 0, "T16 — buyer_confirmed unchanged after dispute");
    assert(o?.seller_confirmed === 0, "T16 — seller_confirmed unchanged after dispute");
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 3 — DISPUTE READ ACCESS & INTERNAL NOTE REDACTION (T17–T19)
  // ════════════════════════════════════════════════════════════════
  console.log("\n── SECTION 3: Dispute Read Access & Redaction ──");

  // T17 — GET /disputes/my returns only user's own disputes
  {
    const r = await req("GET", `/api/disputes/my`, buyerTok);
    assert(r.status === 200, "T17 — buyer GET /disputes/my → 200");
    const disputes = r.data?.disputes ?? [];
    const foreign = disputes.filter((d: any) => d.submitted_by !== buyerId);
    assert(foreign.length === 0, "T17 — buyer sees only own disputes in /disputes/my");
  }

  // T18 — GET /disputes/:id by unrelated user → 403
  {
    const r = await req("GET", `/api/disputes/${disputeId}`, unrelTok);
    assert(r.status === 403, "T18 — unrelated user GET /disputes/:id → 403", `Got ${r.status}`);
  }

  // T19 — Internal note hidden from buyer in GET /disputes/:id
  {
    if (disputeId > 0) {
      // Admin adds internal note
      const noteRes = await req("POST", `/api/disputes/${disputeId}/notes`, adminTok, {
        content: "CONFIDENTIAL ADMIN NOTE: Verify seller transaction history first.",
        is_internal: true,
      });
      assert(noteRes.status === 201, "T19-setup — admin adds internal note → 201");

      // Buyer fetches dispute detail
      const detailRes = await req("GET", `/api/disputes/${disputeId}`, buyerTok);
      assert(detailRes.status === 200, "T19 — buyer fetches dispute detail → 200");
      const history = detailRes.data?.history ?? [];
      const hasInternal = history.some((h: any) => h.is_internal === true || h.is_internal === 1);
      assert(!hasInternal, "T19 — internal admin note is REDACTED from buyer view");
    } else {
      assert(false, "T19 — disputeId not available");
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 4 — ADMIN DISPUTE MANAGEMENT (T20–T26)
  // ════════════════════════════════════════════════════════════════
  console.log("\n── SECTION 4: Admin Dispute Management ──");

  // T20 — PATCH /disputes/:id/status by non-admin → 403
  {
    const r = await req("PATCH", `/api/disputes/${disputeId}/status`, buyerTok, {
      status: "under_review",
    });
    assert(r.status === 403, "T20 — non-admin PATCH status → 403", `Got ${r.status}`);
  }

  // T21 — Invalid status transition (resolved → open) → 400
  {
    // Seed a dummy resolved dispute
    const [dummyRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO disputes (order_id, submitted_by, submitted_role, category, description, status)
       VALUES (?, ?, 'buyer', 'other', 'dummy resolved', 'resolved')`,
      [processingOrderId, buyerId]
    );
    const dummyId = dummyRes.insertId;
    const r = await req("PATCH", `/api/disputes/${dummyId}/status`, adminTok, {
      status: "open",
      note: "attempting invalid transition",
    });
    assert(r.status === 400, "T21 — resolved → open transition is rejected → 400", `Got ${r.status}`);
    await pool.query("DELETE FROM disputes WHERE id=?", [dummyId]);
  }

  // T22 — rejected is a terminal state (cannot transition) → 400
  {
    const [dummyRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO disputes (order_id, submitted_by, submitted_role, category, description, status)
       VALUES (?, ?, 'buyer', 'other', 'dummy rejected', 'rejected')`,
      [processingOrderId, buyerId]
    );
    const dummyId = dummyRes.insertId;
    const r = await req("PATCH", `/api/disputes/${dummyId}/status`, adminTok, {
      status: "under_review",
    });
    assert(r.status === 400, "T22 — rejected → under_review transition is rejected → 400", `Got ${r.status}`);
    await pool.query("DELETE FROM disputes WHERE id=?", [dummyId]);
  }

  // T23 — Valid admin transition: open → under_review → 200
  {
    const r = await req("PATCH", `/api/disputes/${disputeId}/status`, adminTok, {
      status: "under_review",
      note: "Admin is now actively reviewing evidence.",
    });
    assert(r.status === 200, "T23 — admin open → under_review transition → 200", `Got ${r.status}`);
    const [dRows] = await pool.query<RowDataPacket[]>(
      "SELECT status FROM disputes WHERE id=?", [disputeId]
    );
    assert((dRows[0] as any)?.status === "under_review", "T23 — status is 'under_review' in DB");
  }

  // T24 — Valid admin resolution: under_review → resolved → 200
  {
    const r = await req("PATCH", `/api/disputes/${disputeId}/status`, adminTok, {
      status: "resolved",
      resolution_outcome: "buyer_favor",
      resolution_summary: "Confirmed digital product delivery was missing valid download link.",
      note: "Dispute decided in favor of buyer.",
    });
    assert(r.status === 200, "T24 — admin under_review → resolved transition → 200", `Got ${r.status}`);

    const [dRows] = await pool.query<RowDataPacket[]>(
      "SELECT status, resolution_outcome, resolution_summary FROM disputes WHERE id=?", [disputeId]
    );
    const d = dRows[0] as any;
    assert(d?.status === "resolved", "T24 — status is 'resolved' in DB");
    assert(d?.resolution_outcome === "buyer_favor", "T24 — resolution_outcome is 'buyer_favor'");
  }

  // T25 — POST /disputes/:id/notes by non-admin → 403
  {
    const r = await req("POST", `/api/disputes/${disputeId}/notes`, buyerTok, {
      content: "Unauthorized note attempt",
      is_internal: true,
    });
    assert(r.status === 403, "T25 — non-admin POST /disputes/:id/notes → 403", `Got ${r.status}`);
  }

  // T26 — Admin internal note saved with is_internal=TRUE in dispute_history
  {
    const [freshD] = await pool.query<ResultSetHeader>(
      `INSERT INTO disputes (order_id, submitted_by, submitted_role, category, description, status)
       VALUES (?, ?, 'seller', 'communication_issue', 'Notes test', 'open')`,
      [processingOrderId, sellerId]
    );
    const freshId = freshD.insertId;

    const r = await req("POST", `/api/disputes/${freshId}/notes`, adminTok, {
      content: "Auditable admin note test.",
      is_internal: true,
    });
    assert(r.status === 201, "T26 — admin POST /disputes/:id/notes → 201", `Got ${r.status}`);

    const [hRows] = await pool.query<RowDataPacket[]>(
      "SELECT is_internal FROM dispute_history WHERE dispute_id=? AND is_internal=1",
      [freshId]
    );
    assert(hRows.length > 0, "T26 — note persisted with is_internal=1 in dispute_history");

    await pool.query("DELETE FROM dispute_history WHERE dispute_id=?", [freshId]);
    await pool.query("DELETE FROM disputes WHERE id=?", [freshId]);
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 5 — EVIDENCE AUTHORIZATION & SECURITY (T27–T29)
  // ════════════════════════════════════════════════════════════════
  console.log("\n── SECTION 5: Evidence Authorization & Security ──");

  // Create a dispute to test evidence security
  const [evDispRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO disputes (order_id, submitted_by, submitted_role, category, description, status)
     VALUES (?, ?, 'buyer', 'file_corrupted_or_mismatch', 'Evidence auth test', 'open')`,
    [processingOrderId, buyerId]
  );
  const evDispId = evDispRes.insertId;

  // Insert a mock evidence record
  const [evRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO dispute_evidence (dispute_id, order_id, uploaded_by, uploader_role, original_filename, file_format, mime_type, file_size_bytes, storage_key, checksum_sha256)
     VALUES (?, ?, ?, 'buyer', 'receipt.pdf', 'pdf', 'application/pdf', 1024, 'private/dispute/receipt_uuid.pdf', 'abc123sha256fake')`,
    [evDispId, processingOrderId, buyerId]
  );
  const evidenceId = evRes.insertId;

  // T27 — Unrelated user cannot download evidence → 403
  {
    const r = await req("GET", `/api/disputes/${evDispId}/evidence/${evidenceId}/download`, unrelTok);
    assert(r.status === 403, "T27 — unrelated user GET evidence download → 403", `Got ${r.status}`);
  }

  // T28 — Unauthenticated cannot download evidence → 401
  {
    const r = await req("GET", `/api/disputes/${evDispId}/evidence/${evidenceId}/download`);
    assert(r.status === 401, "T28 — unauthenticated GET evidence download → 401", `Got ${r.status}`);
  }

  // T29 — storage_key is REDACTED from dispute detail response
  {
    const r = await req("GET", `/api/disputes/${evDispId}`, buyerTok);
    assert(r.status === 200, "T29 — buyer GET /disputes/:id → 200");
    const evidenceList = r.data?.evidence ?? [];
    const hasStorageKey = evidenceList.some((e: any) => e.storage_key !== undefined);
    assert(!hasStorageKey, "T29 — storage_key is NOT exposed in dispute detail API response");
  }

  // Clean up evidence test records
  await pool.query("DELETE FROM dispute_evidence WHERE id=?", [evidenceId]);
  await pool.query("DELETE FROM disputes WHERE id=?", [evDispId]);

  // ════════════════════════════════════════════════════════════════
  // SECTION 6 — FEATURE-10 REGRESSION (T30–T33)
  // ════════════════════════════════════════════════════════════════
  console.log("\n── SECTION 6: Feature-10 Regression ──");

  // Create order specifically for regression tests
  const [regrOrderRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status, buyer_confirmed, seller_confirmed, is_closed)
     VALUES (?, 'F11 Test Ebook', 'PDF', 'ebooks-digital', ?, 'Buyer F11', ?, 'Seller F11', 100.00, 'processing', 0, 0, 0)`,
    [channelListingId, buyerId, sellerId]
  );
  const regrOrderId = regrOrderRes.insertId;

  // Seed delivery so Feature 9 buyer confirmation passes
  await pool.query(
    `INSERT INTO digital_order_deliveries (order_id, listing_id, seller_id, buyer_id, file_count, delivery_note, status)
     VALUES (?, ?, ?, ?, 1, 'F11 regression delivery', 'delivered')`,
    [regrOrderId, channelListingId, sellerId, buyerId]
  );

  // T30 — Submitting a dispute does NOT close the escrow chat
  {
    await req("POST", `/api/disputes`, buyerTok, {
      order_id: regrOrderId,
      category: "other",
      description: "Chat closure regression test dispute",
    });
    const [oRows] = await pool.query<RowDataPacket[]>(
      "SELECT is_closed FROM escrow_orders WHERE id=?", [regrOrderId]
    );
    assert((oRows[0] as any)?.is_closed === 0, "T30 — dispute submission preserves chat open state (is_closed=0)");
  }

  // T31 — Admin cannot close chat when only buyer confirmed (both still required)
  {
    // Buyer confirms
    const bConf = await req("PATCH", `/api/escrow/orders/${regrOrderId}/confirm`, buyerTok, { role: "buyer" });
    assert(bConf.status === 200, "T31 — buyer confirms order → 200", `Got ${bConf.status}`);
    const closeRes = await req("PATCH", `/api/escrow/orders/${regrOrderId}/close`, adminTok);
    assert(closeRes.status === 400, "T31 — admin close blocked when only buyer confirmed → 400", `Got ${closeRes.status}`);
  }

  // T32 — Admin can close chat once both buyer and seller confirmed
  {
    // Seller confirms
    const sConf = await req("PATCH", `/api/escrow/orders/${regrOrderId}/confirm`, sellerTok, { role: "seller" });
    assert(sConf.status === 200, "T32 — seller confirms order → 200", `Got ${sConf.status}`);
    const closeRes = await req("PATCH", `/api/escrow/orders/${regrOrderId}/close`, adminTok);
    assert(closeRes.status === 200, "T32 — admin close succeeds after both confirmed → 200", `Got ${closeRes.status}: ${JSON.stringify(closeRes.data)}`);

    const [oRows] = await pool.query<RowDataPacket[]>(
      "SELECT is_closed, closed_by FROM escrow_orders WHERE id=?", [regrOrderId]
    );
    const o = oRows[0] as any;
    assert(o?.is_closed === 1, "T32 — is_closed=1 after admin close");
    assert(o?.closed_by === adminId, "T32 — closed_by matches adminId");
  }

  // T33 — Messages are blocked after admin closure
  {
    const msgRes = await req("POST", `/api/escrow/orders/${regrOrderId}/messages`, buyerTok, {
      message: "Post-close message attempt",
    });
    assert(msgRes.status === 403 || msgRes.status === 400, "T33 — messages blocked after chat closure", `Got ${msgRes.status}`);
  }

  // ── Teardown ─────────────────────────────────────────────────────────
  console.log("\n── Teardown ──");
  try {
    const orderIds = [processingOrderId, cancelledOrderId, closedOrderId, regrOrderId];
    await pool.query("DELETE FROM digital_order_deliveries WHERE order_id IN (?,?,?,?)", orderIds);
    await pool.query("DELETE FROM dispute_evidence WHERE order_id IN (?,?,?,?)", orderIds);
    await pool.query(
      `DELETE FROM dispute_history WHERE dispute_id IN (
        SELECT id FROM (SELECT id FROM disputes WHERE order_id IN (?,?,?,?)) AS sub
      )`,
      orderIds
    );
    await pool.query("DELETE FROM disputes WHERE order_id IN (?,?,?,?)", orderIds);
    await pool.query("DELETE FROM notifications WHERE user_id IN (?,?,?,?)", [adminId, sellerId, buyerId, unrelId]);
    await pool.query("DELETE FROM escrow_messages WHERE order_id IN (?,?,?,?)", orderIds);
    await pool.query("DELETE FROM escrow_orders WHERE id IN (?,?,?,?)", orderIds);
    await pool.query("DELETE FROM channels WHERE id=?", [channelListingId]);
    await pool.query("DELETE FROM users WHERE id IN (?,?,?,?)", [adminId, sellerId, buyerId, unrelId]);
    console.log("  Cleanup complete.");
  } catch (e) {
    console.warn("  Cleanup warning:", (e as Error).message);
  }

  server.close();
  await pool.end();

  // ── Results ───────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`FEATURE 11 RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${"═".repeat(60)}`);

  if (failed > 0) {
    console.error("❌ Some tests FAILED. Review output above.");
    process.exit(1);
  } else {
    console.log("✅ All Feature 11 tests PASSED.");
    process.exit(0);
  }
}

runDisputesNotificationsVerification().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
