/**
 * Feature 9 Verification Suite — Buyer Secure File Download & Delivery Completion
 * Hulu Market Digital Marketplace
 *
 * Tests 1-42 covering:
 *  - Download endpoint auth/authorization
 *  - Response headers, content integrity (SHA-256)
 *  - Download does NOT auto-confirm or change escrow state
 *  - Buyer confirm delivery-existence guard
 *  - Full escrow flow integrity
 *  - Buyer/order isolation
 *  - Social-media orders unaffected
 *  - Rate limiting
 */

import http from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool, initDatabase } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import { getStorageAdapter } from "./services/storage.js";
import type { ResultSetHeader } from "mysql2/promise";

async function runDownloadVerification() {
  console.log("=== HULU MARKET FEATURE 9: BUYER SECURE FILE DOWNLOAD & DELIVERY COMPLETION ===");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // ── Spin up test server ────────────────────────────────────────────────────
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Running on ${baseUrl}`);

  const JWT_SECRET = getJwtSecret();
  const ts = Date.now();

  // ── Test-user emails ───────────────────────────────────────────────────────
  const adminEmail    = `admin_f9_${ts}@hulumarket.et`;
  const sellerEmail   = `seller_f9_${ts}@test.et`;
  const buyerAEmail   = `buyerA_f9_${ts}@test.et`;
  const buyerBEmail   = `buyerB_f9_${ts}@test.et`;
  const unrelEmail    = `unrelated_f9_${ts}@test.et`;

  // ── Cleanup trackers ───────────────────────────────────────────────────────
  let adminId = 0, sellerId = 0, buyerAId = 0, buyerBId = 0, unrelId = 0;
  let digitalListingId = 0, socialListingId = 0;
  let order1Id = 0, order2Id = 0, socialOrderId = 0, cancelledOrderId = 0, noDeliveryOrderId = 0;
  let delivery1Id = 0, delivery2Id = 0, revokedDeliveryId = 0;
  let file1Id = 0, file2Id = 0, revokedFileId = 0;
  const storageKeysToClean: string[] = [];

  // ── HTTP helper ────────────────────────────────────────────────────────────
  async function req(
    method: string,
    path: string,
    token?: string,
    body?: object,
    rawBody?: Buffer | FormData
  ): Promise<{ status: number; data: any; headers: Headers; rawBody: ArrayBuffer }> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (body)  { headers["Content-Type"] = "application/json"; }

    const opts: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : ((rawBody as unknown as BodyInit) ?? undefined),
    };

    const res = await fetch(`${baseUrl}/api/${path}`, opts);
    const buf = await res.arrayBuffer();
    let data: any = {};
    try { data = JSON.parse(Buffer.from(buf).toString("utf8")); } catch {}
    return { status: res.status, data, headers: res.headers, rawBody: buf };
  }

  const storage = getStorageAdapter();

  try {
    await initDatabase();

    // ── Insert test users ──────────────────────────────────────────────────
    const [aR]  = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990001', 'hash', 'Admin', 'F9', 'admin', 0, 0)`, [adminEmail]);
    adminId = aR.insertId;

    const [sR]  = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990002', 'hash', 'Seller', 'F9', 'user', 0, 0)`, [sellerEmail]);
    sellerId = sR.insertId;

    const [bAR] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990003', 'hash', 'BuyerA', 'F9', 'user', 10000.00, 1000.00)`, [buyerAEmail]);
    buyerAId = bAR.insertId;

    const [bBR] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990004', 'hash', 'BuyerB', 'F9', 'user', 10000.00, 1000.00)`, [buyerBEmail]);
    buyerBId = bBR.insertId;

    const [uR]  = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990005', 'hash', 'Unrelated', 'F9', 'user', 100.00, 0)`, [unrelEmail]);
    unrelId = uR.insertId;

    // ── JWT tokens ─────────────────────────────────────────────────────────
    const adminToken    = jwt.sign({ userId: adminId,   id: adminId,   email: adminEmail,  role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    const sellerToken   = jwt.sign({ userId: sellerId,  id: sellerId,  email: sellerEmail, role: "user"  }, JWT_SECRET, { expiresIn: "1h" });
    const buyerAToken   = jwt.sign({ userId: buyerAId,  id: buyerAId,  email: buyerAEmail, role: "user"  }, JWT_SECRET, { expiresIn: "1h" });
    const buyerBToken   = jwt.sign({ userId: buyerBId,  id: buyerBId,  email: buyerBEmail, role: "user"  }, JWT_SECRET, { expiresIn: "1h" });
    const unrelToken    = jwt.sign({ userId: unrelId,   id: unrelId,   email: unrelEmail,  role: "user"  }, JWT_SECRET, { expiresIn: "1h" });

    // ── Insert test listings ───────────────────────────────────────────────
    const [dLR] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, name, platform, category, price, status, listing_type, agreed_declaration, file_format, subcategory)
       VALUES (?, 'F9 Test Ebook ${ts}', 'PDF', 'ebooks-digital', 500.00, 'active', 'ebooks-digital', 1, 'PDF', 'Programming')`,
      [sellerId]
    );
    digitalListingId = dLR.insertId;

    const [sLR] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, name, platform, category, price, status, listing_type, agreed_declaration)
       VALUES (?, 'F9 Social ${ts}', 'telegram', 'Technology', 500.00, 'active', 'social-media', 0)`,
      [sellerId]
    );
    socialListingId = sLR.insertId;

    // ── Insert test orders ─────────────────────────────────────────────────
    const [o1R] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'F9 Test Ebook', 'PDF', 'ebooks-digital', ?, 'BuyerA F9', ?, 'Seller F9', 500.00, 'processing')`,
      [digitalListingId, buyerAId, sellerId]
    );
    order1Id = o1R.insertId;

    const [o2R] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'F9 Test Ebook', 'PDF', 'ebooks-digital', ?, 'BuyerB F9', ?, 'Seller F9', 500.00, 'processing')`,
      [digitalListingId, buyerBId, sellerId]
    );
    order2Id = o2R.insertId;

    const [soR] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'F9 Social', 'telegram', 'social-media', ?, 'BuyerA F9', ?, 'Seller F9', 500.00, 'processing')`,
      [socialListingId, buyerAId, sellerId]
    );
    socialOrderId = soR.insertId;

    const [coR] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'F9 Test Ebook', 'PDF', 'ebooks-digital', ?, 'BuyerA F9', ?, 'Seller F9', 500.00, 'cancelled')`,
      [digitalListingId, buyerAId, sellerId]
    );
    cancelledOrderId = coR.insertId;

    const [ndR] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'F9 Test Ebook', 'PDF', 'ebooks-digital', ?, 'BuyerA F9', ?, 'Seller F9', 500.00, 'processing')`,
      [digitalListingId, buyerAId, sellerId]
    );
    noDeliveryOrderId = ndR.insertId;

    // ── Upload test file + create deliveries ───────────────────────────────
    const fileContent = Buffer.from("%PDF-1.4\n1 0 obj\n<</Title (F9 Test)>>\nendobj\ntrailer\n<</Root 1 0 R>>\n%%EOF\n");
    const fileChecksum = crypto.createHash("sha256").update(fileContent).digest("hex");

    // putObject(buffer, extension) — returns { storageKey, checksumSha256, bytesWritten }
    const put1 = await storage.putObject(fileContent, "pdf");
    const storageKey1 = put1.storageKey;
    storageKeysToClean.push(storageKey1);

    // delivery1 for order1 (delivered)
    const [d1R] = await pool.query<ResultSetHeader>(
      `INSERT INTO digital_order_deliveries (order_id, listing_id, file_count, delivery_note, status)
       VALUES (?, ?, 1, 'F9 delivery', 'delivered')`,
      [order1Id, digitalListingId]
    );
    delivery1Id = d1R.insertId;

    const [f1R] = await pool.query<ResultSetHeader>(
      `INSERT INTO digital_order_delivery_files (order_id, delivery_id, original_filename, storage_key, mime_type, file_format, file_size_bytes, checksum_sha256)
       VALUES (?, ?, 'test-ebook.pdf', ?, 'application/pdf', 'PDF', ?, ?)`,
      [order1Id, delivery1Id, storageKey1, fileContent.length, fileChecksum]
    );
    file1Id = f1R.insertId;

    // delivery2 for order2 (delivered, buyerB's)
    const fileContent2 = Buffer.from("BuyerB test content - F9 isolation check");
    const checksum2    = crypto.createHash("sha256").update(fileContent2).digest("hex");

    const put2 = await storage.putObject(fileContent2, "pdf");
    const storageKey2 = put2.storageKey;
    storageKeysToClean.push(storageKey2);

    const [d2R] = await pool.query<ResultSetHeader>(
      `INSERT INTO digital_order_deliveries (order_id, listing_id, file_count, status)
       VALUES (?, ?, 1, 'delivered')`,
      [order2Id, digitalListingId]
    );
    delivery2Id = d2R.insertId;

    const [f2R] = await pool.query<ResultSetHeader>(
      `INSERT INTO digital_order_delivery_files (order_id, delivery_id, original_filename, storage_key, mime_type, file_format, file_size_bytes, checksum_sha256)
       VALUES (?, ?, 'buyerb.pdf', ?, 'application/pdf', 'PDF', ?, ?)`,
      [order2Id, delivery2Id, storageKey2, fileContent2.length, checksum2]
    );
    file2Id = f2R.insertId;

    // revoked delivery for order1
    const revokedContent = Buffer.from("revoked delivery content");
    const revokedChecksum = crypto.createHash("sha256").update(revokedContent).digest("hex");

    const putR = await storage.putObject(revokedContent, "pdf");
    const revokedKey = putR.storageKey;
    storageKeysToClean.push(revokedKey);

    const [rdR] = await pool.query<ResultSetHeader>(
      `INSERT INTO digital_order_deliveries (order_id, listing_id, file_count, status)
       VALUES (?, ?, 1, 'revoked')`,
      [order1Id, digitalListingId]
    );
    revokedDeliveryId = rdR.insertId;

    const [rfR] = await pool.query<ResultSetHeader>(
      `INSERT INTO digital_order_delivery_files (order_id, delivery_id, original_filename, storage_key, mime_type, file_format, file_size_bytes, checksum_sha256)
       VALUES (?, ?, 'revoked.pdf', ?, 'application/pdf', 'PDF', ?, ?)`,
      [order1Id, revokedDeliveryId, revokedKey, revokedContent.length, revokedChecksum]
    );
    revokedFileId = rfR.insertId;

    console.log(`Setup OK: order1=${order1Id} order2=${order2Id} social=${socialOrderId} cancelled=${cancelledOrderId} noDelivery=${noDeliveryOrderId}`);
    console.log(`          file1=${file1Id} file2=${file2Id} revoked=${revokedFileId}`);

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: Auth & Authorization
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Section 1: Auth & Authorization ---");

    // Test 1: Unauthenticated → 401
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`);
      assert(r.status === 401, "Test 1: Unauthenticated download → 401");
    }

    // Test 2: BuyerA downloads their file → 200
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, buyerAToken);
      assert(r.status === 200, "Test 2: BuyerA downloads their file → 200", `got ${r.status}`);
    }

    // Test 2b: Downloaded content matches stored content (byte-exact)
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, buyerAToken);
      const downloaded = Buffer.from(r.rawBody);
      assert(downloaded.equals(fileContent), "Test 2b: Downloaded content byte-exact match");
    }

    // Test 3: Seller cannot download → 403
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, sellerToken);
      assert(r.status === 403, "Test 3: Seller cannot download → 403");
    }

    // Test 4: Unrelated user cannot download → 403
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, unrelToken);
      assert(r.status === 403, "Test 4: Unrelated user cannot download → 403");
    }

    // Test 5: BuyerA cannot access BuyerB's file (different order)
    {
      const r = await req("GET", `escrow/orders/${order2Id}/deliveries/${file2Id}/download`, buyerAToken);
      assert(r.status === 403, "Test 5: BuyerA cannot access BuyerB's file (wrong order) → 403");
    }

    // Test 6: File from wrong order → 404
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file2Id}/download`, buyerAToken);
      assert(r.status === 404, "Test 6: File bound to different order → 404");
    }

    // Test 7: Social-media order → 400
    {
      const r = await req("GET", `escrow/orders/${socialOrderId}/deliveries/${file1Id}/download`, buyerAToken);
      assert(r.status === 400, "Test 7: Social-media order download → 400");
    }

    // Test 8: Revoked delivery file → 410
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${revokedFileId}/download`, buyerAToken);
      assert(r.status === 410, "Test 8: Revoked delivery file → 410");
    }

    // Test 9: Non-existent fileId → 404
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/99999999/download`, buyerAToken);
      assert(r.status === 404, "Test 9: Non-existent fileId → 404");
    }

    // Test 10: storage_key never in error response body
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, sellerToken);
      const body = Buffer.from(r.rawBody).toString("utf8");
      assert(!body.includes(storageKey1), "Test 10: storage_key not in error response body");
    }

    // Test 11: Admin can download → 200
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, adminToken);
      assert(r.status === 200, "Test 11: Admin can download → 200", `got ${r.status}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: Response Headers & Content Integrity
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Section 2: Response Headers & Content Integrity ---");

    const dlResp = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, buyerAToken);

    // Test 12: Content-Disposition is attachment with sanitized filename
    {
      const cd = dlResp.headers.get("content-disposition") || "";
      assert(
        cd.toLowerCase().includes("attachment") && cd.includes("test-ebook.pdf"),
        "Test 12: Content-Disposition attachment with filename",
        `got: ${cd}`
      );
    }

    // Test 13: Content-Type matches stored MIME
    {
      const ct = dlResp.headers.get("content-type") || "";
      assert(ct.includes("application/pdf"), "Test 13: Content-Type matches stored MIME", `got: ${ct}`);
    }

    // Test 14: X-Content-Type-Options: nosniff
    {
      const xcto = dlResp.headers.get("x-content-type-options") || "";
      assert(xcto === "nosniff", "Test 14: X-Content-Type-Options: nosniff", `got: ${xcto}`);
    }

    // Test 15: SHA-256 of downloaded content matches stored checksum
    {
      const downloaded = Buffer.from(dlResp.rawBody);
      const actualHash = crypto.createHash("sha256").update(downloaded).digest("hex");
      assert(actualHash === fileChecksum, "Test 15: SHA-256 of download matches stored checksum");
    }

    // Test 16: Cache-Control: no-store
    {
      const cc = dlResp.headers.get("cache-control") || "";
      assert(cc.includes("no-store"), "Test 16: Cache-Control: no-store", `got: ${cc}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: Download Does NOT Change Escrow State
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Section 3: Download Does Not Change Escrow State ---");

    // Test 17: buyer_confirmed still false after download
    {
      const [rows] = await pool.query<any[]>("SELECT buyer_confirmed FROM escrow_orders WHERE id = ? LIMIT 1", [order1Id]);
      assert(!rows[0].buyer_confirmed, "Test 17: buyer_confirmed still false after download");
    }

    // Test 18: Status still 'processing' after download
    {
      const [rows] = await pool.query<any[]>("SELECT status, is_closed FROM escrow_orders WHERE id = ? LIMIT 1", [order1Id]);
      assert(rows[0].status === "processing" && !rows[0].is_closed, "Test 18: Status still processing/not-closed after download");
    }

    // Test 19: Seller balance unchanged after download
    {
      const [rows] = await pool.query<any[]>("SELECT balance FROM users WHERE id = ? LIMIT 1", [sellerId]);
      assert(Number(rows[0].balance) === 0, "Test 19: Seller balance unchanged after download");
    }

    // Test 20: Repeated downloads work (idempotent → 200 again)
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, buyerAToken);
      assert(r.status === 200, "Test 20: Repeated download → 200");
    }

    // Test 21: Download audit log entry created
    {
      const [rows] = await pool.query<any[]>(
        "SELECT id FROM digital_order_file_downloads WHERE order_id = ? AND file_id = ? AND buyer_id = ? LIMIT 1",
        [order1Id, file1Id, buyerAId]
      );
      assert(rows.length > 0, "Test 21: Download audit log entry created in digital_order_file_downloads");
    }

    // Test 22: Buyer can get deliveries list
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries`, buyerAToken);
      assert(r.status === 200 && Array.isArray(r.data.deliveries), "Test 22: Buyer can GET deliveries list → 200");
    }

    // Test 23: BuyerA does not see BuyerB's files in their deliveries
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries`, buyerAToken);
      const allFiles = (r.data.deliveries as any[]).flatMap((d: any) => d.files || []);
      assert(!allFiles.some((f: any) => f.id === file2Id), "Test 23: BuyerA does not see BuyerB's files");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: Buyer Confirm Guard (Delivery-Existence Check)
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Section 4: Buyer Confirm Guard ---");

    // Test 24: Buyer confirm without any delivery → 400
    {
      const r = await req("PATCH", `escrow/orders/${noDeliveryOrderId}/confirm`, buyerAToken, { role: "buyer" });
      assert(r.status === 400, "Test 24: Buyer confirm without delivery → 400", `got ${r.status}: ${r.data.error}`);
      assert(
        typeof r.data.error === "string" && r.data.error.toLowerCase().includes("delivered"),
        "Test 24b: Error message mentions delivery",
        `got: ${r.data.error}`
      );
    }

    // Test 25: Buyer confirm with valid delivery → 200
    {
      const r = await req("PATCH", `escrow/orders/${order1Id}/confirm`, buyerAToken, { role: "buyer" });
      assert(r.status === 200, "Test 25: Buyer confirm eligible order (has delivery) → 200", `got ${r.status}: ${r.data.error}`);
    }

    // Test 26: buyer_confirmed now true in DB
    {
      const [rows] = await pool.query<any[]>("SELECT buyer_confirmed FROM escrow_orders WHERE id = ? LIMIT 1", [order1Id]);
      assert(!!rows[0].buyer_confirmed, "Test 26: buyer_confirmed = true after buyer confirm");
    }

    // Test 27: Confirmation bot message recorded in escrow_messages
    {
      const [rows] = await pool.query<any[]>(
        "SELECT message FROM escrow_messages WHERE order_id = ? AND sender_role = 'admin' ORDER BY id DESC LIMIT 1",
        [order1Id]
      );
      assert(rows.length > 0 && rows[0].message.toLowerCase().includes("buyer"), "Test 27: Buyer confirm bot message in escrow_messages");
    }

    // Test 28: Repeated buyer confirmation → 400
    {
      const r = await req("PATCH", `escrow/orders/${order1Id}/confirm`, buyerAToken, { role: "buyer" });
      assert(r.status === 400, "Test 28: Repeated buyer confirmation → 400");
    }

    // Test 29: Unrelated user cannot confirm as buyer → 403
    {
      const r = await req("PATCH", `escrow/orders/${order2Id}/confirm`, unrelToken, { role: "buyer" });
      assert(r.status === 403, "Test 29: Unrelated user cannot confirm as buyer → 403");
    }

    // Test 30: Seller cannot confirm as buyer → 403
    {
      const r = await req("PATCH", `escrow/orders/${order2Id}/confirm`, sellerToken, { role: "buyer" });
      assert(r.status === 403, "Test 30: Seller cannot confirm as buyer → 403");
    }

    // Test 31: Cancelled order cannot be confirmed → 400
    {
      const r = await req("PATCH", `escrow/orders/${cancelledOrderId}/confirm`, buyerAToken, { role: "buyer" });
      assert(r.status === 400, "Test 31: Cancelled order buyer confirm → 400");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: Full Escrow Flow Integrity
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Section 5: Full Escrow Flow Integrity ---");

    // Test 32: Seller confirm → 200
    {
      const r = await req("PATCH", `escrow/orders/${order1Id}/confirm`, sellerToken, { role: "seller" });
      assert(r.status === 200, "Test 32: Seller confirm → 200", `got ${r.status}: ${r.data.error}`);
    }

    // Test 33: Order not yet closed after both confirms (admin must run /close)
    {
      const [rows] = await pool.query<any[]>("SELECT is_closed FROM escrow_orders WHERE id = ? LIMIT 1", [order1Id]);
      assert(!rows[0].is_closed, "Test 33: Order not closed until admin runs /close");
    }

    // Set up locked_balance for the close transaction
    await pool.query("UPDATE users SET locked_balance = 500 WHERE id = ?", [buyerAId]);

    // Test 34: Admin closes order → 200
    {
      const r = await req("PATCH", `escrow/orders/${order1Id}/close`, adminToken, {});
      assert(r.status === 200, "Test 34: Admin /close → 200", `got ${r.status}: ${r.data.error}`);
    }

    // Test 35: Order is now closed and status = success
    {
      const [rows] = await pool.query<any[]>("SELECT is_closed, status FROM escrow_orders WHERE id = ? LIMIT 1", [order1Id]);
      assert(rows[0].is_closed && rows[0].status === "success", "Test 35: Order is_closed=true, status=success");
    }

    // Test 36: Repeated admin close → 400
    {
      const r = await req("PATCH", `escrow/orders/${order1Id}/close`, adminToken, {});
      assert(r.status === 400, "Test 36: Repeated admin close → 400");
    }

    // Test 37: Digital listing remains status='active' after close (reusable inventory)
    {
      const [rows] = await pool.query<any[]>("SELECT status FROM channels WHERE id = ? LIMIT 1", [digitalListingId]);
      assert(rows[0].status === "active", "Test 37: Digital listing stays status='active' after close");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 6: Isolation, Social-Media & Rate Limiting
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Section 6: Isolation, Social-Media & Rate Limiting ---");

    // Test 38: BuyerB can still download their own file
    {
      const r = await req("GET", `escrow/orders/${order2Id}/deliveries/${file2Id}/download`, buyerBToken);
      assert(r.status === 200, "Test 38: BuyerB can download their own file → 200", `got ${r.status}`);
    }

    // Test 39: BuyerB cannot download BuyerA's file (even though same listing)
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, buyerBToken);
      assert(r.status === 403, "Test 39: BuyerB cannot download BuyerA's file → 403");
    }

    // Test 40: Social-media confirm has NO delivery guard
    {
      const r = await req("PATCH", `escrow/orders/${socialOrderId}/confirm`, buyerAToken, { role: "buyer" });
      assert(r.status === 200, "Test 40: Social-media buyer confirm (no delivery guard) → 200", `got ${r.status}: ${r.data.error}`);
    }

    // Test 41: Closed order download still works (admin can still access after close)
    {
      const r = await req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, adminToken);
      assert(r.status === 200, "Test 41: Admin can still download from closed order → 200", `got ${r.status}`);
    }

    // Test 42: Rate limiting — burst of 25 requests triggers 429
    {
      console.log("  Test 42: Rate limiting burst (25 rapid requests)...");
      const statuses = await Promise.all(
        Array.from({ length: 25 }, () =>
          req("GET", `escrow/orders/${order1Id}/deliveries/${file1Id}/download`, buyerAToken)
            .then(r => r.status)
            .catch(() => 0)
        )
      );
      const has429 = statuses.some(s => s === 429);
      assert(has429, "Test 42: Rate limiter triggers 429 on burst", `statuses: ${[...new Set(statuses)].sort().join(",")}`);
    }

  } catch (err: unknown) {
    console.error("\n💥 Verification suite crashed:", (err as Error).message);
    console.error((err as Error).stack);
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────────
    console.log("\n--- Teardown ---");
    const orderIds = [order1Id, order2Id, socialOrderId, cancelledOrderId, noDeliveryOrderId].filter(Boolean);
    if (orderIds.length) {
      const ph = orderIds.map(() => "?").join(",");
      await pool.query(`DELETE FROM digital_order_file_downloads WHERE order_id IN (${ph})`, orderIds);
      await pool.query(`DELETE FROM digital_order_delivery_files WHERE order_id IN (${ph})`, orderIds);
      await pool.query(`DELETE FROM digital_order_deliveries WHERE order_id IN (${ph})`, orderIds);
      await pool.query(`DELETE FROM escrow_messages WHERE order_id IN (${ph})`, orderIds);
      await pool.query(`DELETE FROM escrow_orders WHERE id IN (${ph})`, orderIds);
    }
    for (const id of [digitalListingId, socialListingId].filter(Boolean)) {
      await pool.query("DELETE FROM channels WHERE id = ?", [id]);
    }
    for (const id of [adminId, sellerId, buyerAId, buyerBId, unrelId].filter(Boolean)) {
      await pool.query("DELETE FROM users WHERE id = ?", [id]);
    }
    for (const key of storageKeysToClean) {
      try { await storage.deleteObject(key); } catch {}
    }
    server.close();
    await pool.end();
    console.log("  Teardown complete.");

    // ── Summary ──────────────────────────────────────────────────────────
    console.log("\n================================================================");
    console.log(` FEATURE 9 VERIFICATION COMPLETE`);
    console.log(`  Passed: ${passed}  |  Failed: ${failed}  |  Total: ${passed + failed}`);
    console.log("================================================================\n");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runDownloadVerification();
