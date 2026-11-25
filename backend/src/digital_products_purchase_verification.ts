import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool, initDatabase } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

async function runPurchaseVerification() {
  console.log("=== HULU MARKET FEATURE 7: BUYER PURCHASE & TRANSACTION CHAT VERIFICATION ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Setup Express Test App
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Running on ${baseUrl}`);

  const JWT_SECRET = getJwtSecret();

  // Test identifiers
  const timestamp = Date.now();
  const adminEmail = `admin_f7_${timestamp}@hulumarket.et`;
  const sellerEmail = `seller_f7_${timestamp}@test.et`;
  const buyerAEmail = `buyerA_f7_${timestamp}@test.et`;
  const buyerBEmail = `buyerB_f7_${timestamp}@test.et`;
  const buyerCEmail = `buyerC_f7_${timestamp}@test.et`;
  const buyerDEmail = `buyerD_f7_${timestamp}@test.et`;
  const buyerEEmail = `buyerE_f7_${timestamp}@test.et`;
  const outsiderEmail = `outsider_f7_${timestamp}@test.et`;

  let adminId = 0;
  let sellerId = 0;
  let buyerAId = 0;
  let buyerBId = 0;
  let buyerCId = 0;
  let buyerDId = 0;
  let buyerEId = 0;
  let outsiderId = 0;

  let activeDigitalChannelId = 0;
  let pendingDigitalChannelId = 0;
  let rejectedDigitalChannelId = 0;
  let undeclaredDigitalChannelId = 0;
  let socialMediaChannelId = 0;

  let orderId1 = 0;
  let orderId2 = 0;

  try {
    // 1.5 Verify repeatable DB initialization & composite index (F7-01)
    await initDatabase();
    await initDatabase();
    const [idxRows] = await pool.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'escrow_orders' AND INDEX_NAME = 'idx_escrow_channel_buyer_status'
       ORDER BY SEQ_IN_INDEX ASC`
    );
    assert(
      idxRows.length === 3 &&
        idxRows[0].COLUMN_NAME === "channel_id" &&
        idxRows[1].COLUMN_NAME === "buyer_id" &&
        idxRows[2].COLUMN_NAME === "status" &&
        Number(idxRows[0].NON_UNIQUE) === 1,
      "Test 0: Repeatable migration created non-unique composite index idx_escrow_channel_buyer_status(channel_id, buyer_id, status)"
    );

    // 2. Create Test Users
    const [adminRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000001', 'hashed_pass', 'Admin', 'User', 'admin', 0, 0)`,
      [adminEmail]
    );
    adminId = adminRes.insertId;

    const [sellerRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000002', 'hashed_pass', 'Seller', 'Author', 'user', 0, 0)`,
      [sellerEmail]
    );
    sellerId = sellerRes.insertId;

    const [buyerARes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000003', 'hashed_pass', 'Buyer', 'Alpha', 'user', 1000.00, 0)`,
      [buyerAEmail]
    );
    buyerAId = buyerARes.insertId;

    const [buyerBRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000004', 'hashed_pass', 'Buyer', 'Beta', 'user', 1000.00, 0)`,
      [buyerBEmail]
    );
    buyerBId = buyerBRes.insertId;

    const [buyerCRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000005', 'hashed_pass', 'Buyer', 'LowBalance', 'user', 100.00, 0)`,
      [buyerCEmail]
    );
    buyerCId = buyerCRes.insertId;

    const [buyerDRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000007', 'hashed_pass', 'Buyer', 'Delta', 'user', 1000.00, 0)`,
      [buyerDEmail]
    );
    buyerDId = buyerDRes.insertId;

    const [buyerERes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000008', 'hashed_pass', 'Buyer', 'Epsilon', 'user', 1000.00, 0)`,
      [buyerEEmail]
    );
    buyerEId = buyerERes.insertId;

    const [outsiderRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911000006', 'hashed_pass', 'Outsider', 'ThirdParty', 'user', 1500.00, 0)`,
      [outsiderEmail]
    );
    outsiderId = outsiderRes.insertId;

    // Tokens
    const adminToken = jwt.sign({ id: adminId, email: adminEmail, role: "admin" }, JWT_SECRET);
    const sellerToken = jwt.sign({ id: sellerId, email: sellerEmail, role: "user" }, JWT_SECRET);
    const buyerAToken = jwt.sign({ id: buyerAId, email: buyerAEmail, role: "user" }, JWT_SECRET);
    const buyerBToken = jwt.sign({ id: buyerBId, email: buyerBEmail, role: "user" }, JWT_SECRET);
    const buyerCToken = jwt.sign({ id: buyerCId, email: buyerCEmail, role: "user" }, JWT_SECRET);
    const buyerDToken = jwt.sign({ id: buyerDId, email: buyerDEmail, role: "user" }, JWT_SECRET);
    const buyerEToken = jwt.sign({ id: buyerEId, email: buyerEEmail, role: "user" }, JWT_SECRET);
    const outsiderToken = jwt.sign({ id: outsiderId, email: outsiderEmail, role: "user" }, JWT_SECRET);

    // 3. Create Test Listings
    // 3.1 Active Approved Digital Product
    const [c1Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (
        seller_id, name, category, platform, listing_type, subcategory, file_format,
        page_count, language, price, status, agreed_declaration, declared_at
      ) VALUES (?, 'Advanced Ethiopian Law Handbook', 'ebooks-digital', 'PDF', 'ebooks-digital', 'Academic & Education', 'PDF', 280, 'Amharic', 300.00, 'active', 1, NOW())`,
      [sellerId]
    );
    activeDigitalChannelId = c1Res.insertId;

    // 3.2 Pending Digital Product
    const [c2Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (
        seller_id, name, category, platform, listing_type, subcategory, file_format,
        price, status, agreed_declaration
      ) VALUES (?, 'Pending Book', 'ebooks-digital', 'PDF', 'ebooks-digital', 'Academic & Education', 'PDF', 300.00, 'pending', 1)`,
      [sellerId]
    );
    pendingDigitalChannelId = c2Res.insertId;

    // 3.3 Rejected Digital Product
    const [c3Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (
        seller_id, name, category, platform, listing_type, subcategory, file_format,
        price, status, agreed_declaration
      ) VALUES (?, 'Rejected Book', 'ebooks-digital', 'PDF', 'ebooks-digital', 'Academic & Education', 'PDF', 300.00, 'rejected', 1)`,
      [sellerId]
    );
    rejectedDigitalChannelId = c3Res.insertId;

    // 3.4 Undeclared Digital Product (agreed_declaration = 0)
    const [c4Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (
        seller_id, name, category, platform, listing_type, subcategory, file_format,
        price, status, agreed_declaration
      ) VALUES (?, 'Undeclared Book', 'ebooks-digital', 'PDF', 'ebooks-digital', 'Academic & Education', 'PDF', 300.00, 'active', 0)`,
      [sellerId]
    );
    undeclaredDigitalChannelId = c4Res.insertId;

    // 3.5 Social Media Channel
    const [c5Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (
        seller_id, name, category, platform, listing_type, price, status
      ) VALUES (?, 'Addis Tech News Telegram', 'social-media', 'telegram', 'social-media', 500.00, 'active')`,
      [sellerId]
    );
    socialMediaChannelId = c5Res.insertId;

    // Helper request caller
    async function apiRequest(endpoint: string, options: { method?: string; token?: string; body?: any } = {}) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (options.token) {
        headers["Authorization"] = `Bearer ${options.token}`;
      }
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    }

    console.log("\n--- TEST SUITE: SECURITY, VALIDATION & REUSABLE INVENTORY ---");

    // TEST 1: Guest purchase rejected (401)
    const t1 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      body: { channelId: activeDigitalChannelId },
    });
    assert(t1.status === 401, "Test 1: Guest purchase without JWT is rejected with 401 Unauthorized");

    // TEST 2: Pending listing purchase rejected (400)
    const t2 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: pendingDigitalChannelId },
    });
    assert(t2.status === 400 && t2.data?.error?.includes("not available for purchase"), "Test 2: Purchase of pending digital product rejected with 400");

    // TEST 3: Rejected listing purchase rejected (400)
    const t3 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: rejectedDigitalChannelId },
    });
    assert(t3.status === 400 && t3.data?.error?.includes("not available for purchase"), "Test 3: Purchase of rejected digital product rejected with 400");

    // TEST 4: Non-existent listing purchase rejected (404)
    const t4 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: 9999999 },
    });
    assert(t4.status === 404, "Test 4: Purchase of non-existent listing rejected with 404");

    // TEST 5: Social-media listing rejected on digital endpoint (400)
    const t5 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: socialMediaChannelId },
    });
    assert(t5.status === 400 && t5.data?.error?.includes("Social media channels cannot be purchased here"), "Test 5: Social-media listing rejected on digital escrow endpoint (400)");

    // TEST 6: Digital product rejected on social-media purchase endpoint (400)
    const t6 = await apiRequest("/api/escrow/order", {
      method: "POST",
      token: buyerAToken,
      body: {
        channelId: activeDigitalChannelId,
        channelName: "Advanced Ethiopian Law Handbook",
        platform: "PDF",
        price: 300.00,
        buyerId: buyerAId,
        sellerId: sellerId,
      },
    });
    assert(t6.status === 400 && t6.data?.error?.includes("Ebooks & Digital Products"), "Test 6: Digital product rejected on social-media purchase endpoint (400)");

    // TEST 7: Seller cannot purchase own listing (400)
    const t7 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: sellerToken,
      body: { channelId: activeDigitalChannelId },
    });
    assert(t7.status === 400 && t7.data?.error?.includes("own digital product listing"), "Test 7: Seller prohibited from purchasing own digital listing (400)");

    // TEST 8: Missing distribution rights declaration blocks purchase (400)
    const t8 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: undeclaredDigitalChannelId },
    });
    assert(t8.status === 400 && t8.data?.error?.includes("distribution declaration"), "Test 8: Digital product without seller declaration blocks purchase (400)");

    // TEST 9: Insufficient buyer balance rejected (400)
    const t9 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerCToken,
      body: { channelId: activeDigitalChannelId },
    });
    assert(t9.status === 400 && t9.data?.error?.includes("Insufficient balance"), "Test 9: Purchase with insufficient wallet balance rejected (400)");

    // TEST 10: Authenticated Buyer A purchase of approved digital product (201)
    const t10 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: activeDigitalChannelId },
    });
    assert(t10.status === 201 && t10.data?.success && t10.data?.orderId > 0, "Test 10: Buyer A purchase succeeded with 201 Created and orderId returned");
    orderId1 = t10.data?.orderId;

    // Verify DB state for Buyer A
    const [uRowsA] = await pool.query<RowDataPacket[]>("SELECT balance, locked_balance FROM users WHERE id = ?", [buyerAId]);
    assert(
      Number(uRowsA[0].balance) === 700 && Number(uRowsA[0].locked_balance) === 300,
      "Test 10.1: Buyer A wallet balance deducted by 300 ETB and locked_balance credited by 300 ETB in DB"
    );

    // Verify escrow_orders row
    const [oRows1] = await pool.query<RowDataPacket[]>("SELECT * FROM escrow_orders WHERE id = ?", [orderId1]);
    assert(
      oRows1.length > 0 &&
      oRows1[0].listing_type === "ebooks-digital" &&
      oRows1[0].status === "processing" &&
      Number(oRows1[0].amount) === 300,
      "Test 10.2: Escrow order created with listing_type='ebooks-digital', amount=300, status='processing'"
    );

    // Verify initial escrow welcome message
    const [mRows1] = await pool.query<RowDataPacket[]>("SELECT * FROM escrow_messages WHERE order_id = ?", [orderId1]);
    assert(
      mRows1.length > 0 && mRows1[0].sender_role === "admin" && mRows1[0].message.includes("Hulu Market Escrow Protection"),
      "Test 10.3: Initial supervisor bot message inserted into escrow_messages"
    );

    // Verify seller notification
    const [nRows1] = await pool.query<RowDataPacket[]>("SELECT * FROM notifications WHERE user_id = ? AND type = 'escrow'", [sellerId]);
    assert(
      nRows1.length > 0 && nRows1[0].title.includes("New Digital Product Purchase"),
      "Test 10.4: Seller notification delivered"
    );

    // CRITICAL: Verify listing remains active and owner unchanged!
    const [chRows1] = await pool.query<RowDataPacket[]>("SELECT status, seller_id FROM channels WHERE id = ?", [activeDigitalChannelId]);
    assert(
      chRows1[0].status === "active" && chRows1[0].seller_id === sellerId,
      "Test 10.5: CRITICAL REUSABLE INVENTORY CHECK: Listing status is STILL 'active' and seller_id is unchanged after purchase"
    );

    // TEST 11: Idempotency / Duplicate protection (409)
    const t11 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: activeDigitalChannelId },
    });
    assert(
      t11.status === 409 && t11.data?.orderId === orderId1,
      "Test 11: Duplicate purchase attempt by same buyer returns 409 Conflict with active orderId"
    );

    // TEST 12: Buyer B purchases the EXACT same listing (Separate concurrent order)
    const t12 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerBToken,
      body: { channelId: activeDigitalChannelId },
    });
    assert(
      t12.status === 201 && t12.data?.orderId > 0 && t12.data?.orderId !== orderId1,
      "Test 12: Buyer B creates separate independent escrow order (Order 2) for the exact same reusable listing"
    );
    orderId2 = t12.data?.orderId;

    // Verify DB state for Buyer B
    const [uRowsB] = await pool.query<RowDataPacket[]>("SELECT balance, locked_balance FROM users WHERE id = ?", [buyerBId]);
    assert(
      Number(uRowsB[0].balance) === 700 && Number(uRowsB[0].locked_balance) === 300,
      "Test 12.1: Buyer B wallet balance deducted by 300 ETB and locked_balance credited by 300 ETB in DB"
    );

    // CRITICAL: Verify listing STILL active after second buyer!
    const [chRows2] = await pool.query<RowDataPacket[]>("SELECT status FROM channels WHERE id = ?", [activeDigitalChannelId]);
    assert(
      chRows2[0].status === "active",
      "Test 12.2: Listing status remains 'active' with 2 concurrent active buyers"
    );

    // TEST 13: Transaction Chat Isolation
    // 13.1 Buyer A posts message in Order 1
    const t13a = await apiRequest(`/api/escrow/orders/${orderId1}/messages`, {
      method: "POST",
      token: buyerAToken,
      body: { message: "Hello seller, this is Buyer A on Order 1." },
    });
    assert(t13a.status === 201, "Test 13.1: Buyer A sends message in Order 1 chat (201)");

    // 13.2 Buyer B posts message in Order 2
    const t13b = await apiRequest(`/api/escrow/orders/${orderId2}/messages`, {
      method: "POST",
      token: buyerBToken,
      body: { message: "Hello seller, this is Buyer B on Order 2." },
    });
    assert(t13b.status === 201, "Test 13.2: Buyer B sends message in Order 2 chat (201)");

    // 13.3 Buyer A fetches Order 1 messages: sees Order 1 message, NOT Order 2 message
    const t13c = await apiRequest(`/api/escrow/orders/${orderId1}/messages`, {
      token: buyerAToken,
    });
    const msgTexts1 = (t13c.data?.messages || []).map((m: any) => m.message);
    const hasMsgA = msgTexts1.some((m: string) => m.includes("Buyer A on Order 1"));
    const hasMsgBIn1 = msgTexts1.some((m: string) => m.includes("Buyer B on Order 2"));
    assert(hasMsgA && !hasMsgBIn1, "Test 13.3: Order 1 messages contain Buyer A's message and exclude Buyer B's message");

    // 13.4 Buyer B fetches Order 2 messages: sees Order 2 message, NOT Order 1 message
    const t13d = await apiRequest(`/api/escrow/orders/${orderId2}/messages`, {
      token: buyerBToken,
    });
    const msgTexts2 = (t13d.data?.messages || []).map((m: any) => m.message);
    const hasMsgB = msgTexts2.some((m: string) => m.includes("Buyer B on Order 2"));
    const hasMsgAIn2 = msgTexts2.some((m: string) => m.includes("Buyer A on Order 1"));
    assert(hasMsgB && !hasMsgAIn2, "Test 13.4: Order 2 messages contain Buyer B's message and exclude Buyer A's message");

    // 13.5 Cross-order authorization check: Buyer B cannot read Order 1 messages (403)
    const t13e = await apiRequest(`/api/escrow/orders/${orderId1}/messages`, {
      token: buyerBToken,
    });
    assert(t13e.status === 403, "Test 13.5: Buyer B is denied read access to Order 1 chat with 403 Forbidden");

    // 13.6 Cross-order authorization check: Buyer B cannot post to Order 1 chat (403)
    const t13f = await apiRequest(`/api/escrow/orders/${orderId1}/messages`, {
      method: "POST",
      token: buyerBToken,
      body: { message: "Unauthorized intrusion" },
    });
    assert(t13f.status === 403, "Test 13.6: Buyer B is denied post access to Order 1 chat with 403 Forbidden");

    // 13.7 Outsider cannot read or post to either order
    const t13g = await apiRequest(`/api/escrow/orders/${orderId1}/messages`, {
      token: outsiderToken,
    });
    assert(t13g.status === 403, "Test 13.7: Third-party outsider denied read access with 403 Forbidden");

    // TEST 14: Admin trade approval & reusable inventory check
    // Admin approves Order 1
    const t14 = await apiRequest(`/api/escrow/orders/${orderId1}/action`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "approve" },
    });
    assert(t14.status === 200 && t14.data?.success, "Test 14.1: Admin successfully approves Order 1 with 200 OK");

    // Verify Order 1 status is success
    const [oRows1Updated] = await pool.query<RowDataPacket[]>("SELECT status FROM escrow_orders WHERE id = ?", [orderId1]);
    assert(oRows1Updated[0].status === "success", "Test 14.2: Order 1 status is updated to 'success'");

    // Verify financial balances: Buyer A locked_balance deducted, Seller credited 300 ETB
    const [uRowsAFinal] = await pool.query<RowDataPacket[]>("SELECT balance, locked_balance FROM users WHERE id = ?", [buyerAId]);
    const [uRowsSellerFinal] = await pool.query<RowDataPacket[]>("SELECT balance FROM users WHERE id = ?", [sellerId]);
    assert(
      Number(uRowsAFinal[0].locked_balance) === 0 && Number(uRowsSellerFinal[0].balance) === 300,
      "Test 14.3: Buyer A locked balance released to 0, Seller credited 300 ETB"
    );

    // CRITICAL: Verify listing is NOT marked 'sold' on admin approval!
    const [chRows3] = await pool.query<RowDataPacket[]>("SELECT status, seller_id FROM channels WHERE id = ?", [activeDigitalChannelId]);
    assert(
      chRows3[0].status === "active" && chRows3[0].seller_id === sellerId,
      "Test 14.4: CRITICAL REUSABLE INVENTORY CHECK: Listing status is STILL 'active' after trade approval (never marked 'sold')!"
    );

    // TEST 15: Repeat purchase allowed after prior order completed
    // Since Order 1 is completed ('success'), Buyer A can now purchase the listing again!
    const t15 = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerAToken,
      body: { channelId: activeDigitalChannelId },
    });
    assert(
      t15.status === 201 && t15.data?.orderId > 0 && t15.data?.orderId !== orderId1,
      "Test 15: Repeat purchase by Buyer A allowed after previous trade completed; new distinct order created"
    );

    // TEST 16: Digital product confirmation message wording (F7-02)
    const t16a = await apiRequest(`/api/escrow/orders/${orderId2}/confirm`, {
      method: "PATCH",
      token: buyerBToken,
      body: { role: "buyer" },
    });
    const t16b = await apiRequest(`/api/escrow/orders/${orderId2}/confirm`, {
      method: "PATCH",
      token: sellerToken,
      body: { role: "seller" },
    });
    assert(
      t16a.status === 200 && t16b.status === 200,
      "Test 16.1: Buyer and seller confirmations recorded for digital order"
    );

    const [confirmMsgs] = await pool.query<RowDataPacket[]>(
      "SELECT message FROM escrow_messages WHERE order_id = ? ORDER BY id ASC",
      [orderId2]
    );
    const confirmText = confirmMsgs.map((m) => m.message).join("\n");
    assert(
      confirmText.includes("receipt of the digital product") &&
        confirmText.includes("digital product delivery") &&
        !confirmText.includes("channel ownership") &&
        !confirmText.includes("ownership transfer"),
      "Test 16.2: Automated confirmation messages use digital product terminology instead of channel ownership"
    );

    // TEST 17: Cancelled order refunds buyer and allows future repurchase (F7-03)
    const t17a = await apiRequest(`/api/escrow/orders/${orderId2}/action`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "cancel", adminNotes: "Test cancellation" },
    });
    assert(t17a.status === 200 && t17a.data?.success, "Test 17.1: Admin cancels Order 2 with 200 OK");

    const [uRowsBCancelled] = await pool.query<RowDataPacket[]>(
      "SELECT balance, locked_balance FROM users WHERE id = ?",
      [buyerBId]
    );
    assert(
      Number(uRowsBCancelled[0].balance) === 1000 && Number(uRowsBCancelled[0].locked_balance) === 0,
      "Test 17.2: Buyer B refunded 300 ETB (balance=1000, locked_balance=0)"
    );

    const t17b = await apiRequest("/api/escrow/order/digital", {
      method: "POST",
      token: buyerBToken,
      body: { channelId: activeDigitalChannelId },
    });
    assert(
      t17b.status === 201 && t17b.data?.orderId > 0 && t17b.data?.orderId !== orderId2,
      "Test 17.3: Repurchase by Buyer B permitted after prior order cancellation"
    );

    // TEST 18: Simultaneous same-buyer concurrency protection (F7-03)
    const sameBuyerAttempts = await Promise.all([
      apiRequest("/api/escrow/order/digital", { method: "POST", token: outsiderToken, body: { channelId: activeDigitalChannelId } }),
      apiRequest("/api/escrow/order/digital", { method: "POST", token: outsiderToken, body: { channelId: activeDigitalChannelId } }),
      apiRequest("/api/escrow/order/digital", { method: "POST", token: outsiderToken, body: { channelId: activeDigitalChannelId } }),
      apiRequest("/api/escrow/order/digital", { method: "POST", token: outsiderToken, body: { channelId: activeDigitalChannelId } }),
      apiRequest("/api/escrow/order/digital", { method: "POST", token: outsiderToken, body: { channelId: activeDigitalChannelId } }),
    ]);
    const createdCount = sameBuyerAttempts.filter((r) => r.status === 201).length;
    const conflictCount = sameBuyerAttempts.filter((r) => r.status === 409).length;
    assert(
      createdCount === 1 && conflictCount === 4,
      `Test 18.1: 5 simultaneous same-buyer requests yielded 1 x 201 and 4 x 409 (got 201=${createdCount}, 409=${conflictCount})`
    );

    const [outsiderBal] = await pool.query<RowDataPacket[]>(
      "SELECT balance, locked_balance FROM users WHERE id = ?",
      [outsiderId]
    );
    assert(
      Number(outsiderBal[0].balance) === 1200 && Number(outsiderBal[0].locked_balance) === 300,
      "Test 18.2: Simultaneous same-buyer requests charged wallet exactly once (balance=1200, locked_balance=300)"
    );

    // TEST 19: Simultaneous multi-buyer concurrency on reusable listing (F7-03)
    const [concurrentD, concurrentE] = await Promise.all([
      apiRequest("/api/escrow/order/digital", { method: "POST", token: buyerDToken, body: { channelId: activeDigitalChannelId } }),
      apiRequest("/api/escrow/order/digital", { method: "POST", token: buyerEToken, body: { channelId: activeDigitalChannelId } }),
    ]);
    assert(
      concurrentD.status === 201 &&
        concurrentE.status === 201 &&
        concurrentD.data?.orderId > 0 &&
        concurrentE.data?.orderId > 0 &&
        concurrentD.data?.orderId !== concurrentE.data?.orderId,
      "Test 19.1: Two distinct buyers purchased same reusable listing concurrently without conflicts"
    );

    const [chRowsConcurrent] = await pool.query<RowDataPacket[]>(
      "SELECT status FROM channels WHERE id = ?",
      [activeDigitalChannelId]
    );
    assert(
      chRowsConcurrent[0].status === "active",
      "Test 19.2: Reusable listing remains 'active' after concurrent multi-buyer purchases"
    );

  } catch (error: any) {
    console.error("[FATAL ERROR IN TEST RUNNER]:", error);
    failed++;
  } finally {
    // Teardown test fixtures
    console.log("\n[Teardown] Cleaning up test fixtures from database...");
    try {
      const channelIds = [
        activeDigitalChannelId,
        pendingDigitalChannelId,
        rejectedDigitalChannelId,
        undeclaredDigitalChannelId,
        socialMediaChannelId,
      ].filter(Boolean);

      const userIds = [adminId, sellerId, buyerAId, buyerBId, buyerCId, buyerDId, buyerEId, outsiderId].filter(Boolean);

      if (channelIds.length > 0) {
        // Delete messages
        await pool.query(
          "DELETE FROM escrow_messages WHERE order_id IN (SELECT id FROM escrow_orders WHERE channel_id IN (?))",
          [channelIds]
        );
        // Delete orders
        await pool.query("DELETE FROM escrow_orders WHERE channel_id IN (?)", [channelIds]);
        // Delete channels
        await pool.query("DELETE FROM channels WHERE id IN (?)", [channelIds]);
      }

      if (userIds.length > 0) {
        await pool.query("DELETE FROM notifications WHERE user_id IN (?)", [userIds]);
        await pool.query("DELETE FROM users WHERE id IN (?)", [userIds]);
      }
    } catch (cleanupErr) {
      console.error("[Teardown Error]:", cleanupErr);
    }

    server.close();
    await pool.end();
  }

  console.log("\n=== FEATURE 7 VERIFICATION RESULTS ===");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPurchaseVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
