/**
 * Feature 10 Verification Suite — Escrow Chat Lifecycle & Admin-Controlled Closure
 * Hulu Market Digital & Social-Media Marketplace
 *
 * Tests covering:
 *  - Database schema & migration verification (closed_by, is_closed, closed_at, indexes)
 *  - Confirmation lifecycle (neither, buyer-only, seller-only, both, duplicates)
 *  - Authorization (unauthenticated, buyer, seller, unrelated user, non-admin spoofing, admin)
 *  - Messaging lifecycle (before closure, after closure, read-only preservation, cross-order isolation)
 *  - Closure metadata & notifications (closed_by, closed_at, buyer/seller notifications)
 *  - Concurrency & integrity (simultaneous admin close, retry idempotency, message vs close race, confirm vs close race, invalid IDs)
 *  - Escrow accounting & reusable digital inventory preservation
 *  - Social-media transaction lifecycle preservation
 */

import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool, initDatabase } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

async function runChatLifecycleVerification() {
  console.log("=== HULU MARKET FEATURE 10: ESCROW CHAT LIFECYCLE & ADMIN-CONTROLLED CLOSURE ===");

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

  const admin1Email = `admin1_f10_${ts}@hulumarket.et`;
  const admin2Email = `admin2_f10_${ts}@hulumarket.et`;
  const sellerEmail = `seller_f10_${ts}@test.et`;
  const buyerAEmail = `buyerA_f10_${ts}@test.et`;
  const buyerBEmail = `buyerB_f10_${ts}@test.et`;
  const unrelEmail  = `unrelated_f10_${ts}@test.et`;

  let admin1Id = 0, admin2Id = 0, sellerId = 0, buyerAId = 0, buyerBId = 0, unrelId = 0;
  let digitalListingId = 0, socialListingId = 0;
  let orderAId = 0, orderBId = 0, orderSellerOnlyId = 0, orderRaceId = 0, socialOrderId = 0, cancelledOrderId = 0;

  async function req(
    method: string,
    path: string,
    token?: string,
    body?: object
  ): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(`${baseUrl}/api/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    return { status: res.status, data };
  }

  try {
    await initDatabase();

    // ── 1. Schema & Migration Verification ───────────────────────────────────
    const [colRows] = await pool.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'escrow_orders'
       AND COLUMN_NAME IN ('buyer_confirmed', 'seller_confirmed', 'is_closed', 'closed_at', 'closed_by')`
    );
    assert(colRows.length === 5, "T01: escrow_orders has all 5 lifecycle columns (buyer_confirmed, seller_confirmed, is_closed, closed_at, closed_by)");

    const [idxRows] = await pool.query<RowDataPacket[]>(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'escrow_orders'
       AND INDEX_NAME = 'idx_escrow_closed'`
    );
    assert(idxRows.length > 0, "T02: idx_escrow_closed index exists on escrow_orders");

    // ── 2. Seed Users, Listings & Escrow Orders ──────────────────────────────
    const insertUser = async (email: string, first: string, last: string, role: string, bal: number) => {
      const [r] = await pool.query<ResultSetHeader>(
        `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
         VALUES (?, ?, 'hash', ?, ?, ?, ?, 0)`,
        [email, `+2519000${Math.floor(10000 + Math.random() * 89999)}`, first, last, role, bal]
      );
      return r.insertId;
    };

    admin1Id = await insertUser(admin1Email, "Admin", "One", "admin", 0);
    admin2Id = await insertUser(admin2Email, "Admin", "Two", "admin", 0);
    sellerId = await insertUser(sellerEmail, "Seller", "F10", "user", 0);
    buyerAId = await insertUser(buyerAEmail, "BuyerA", "F10", "user", 5000);
    buyerBId = await insertUser(buyerBEmail, "BuyerB", "F10", "user", 5000);
    unrelId  = await insertUser(unrelEmail,  "Unrel",  "F10", "user", 1000);

    const admin1Token = jwt.sign({ userId: admin1Id, id: admin1Id, email: admin1Email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    const admin2Token = jwt.sign({ userId: admin2Id, id: admin2Id, email: admin2Email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    const sellerToken = jwt.sign({ userId: sellerId, id: sellerId, email: sellerEmail, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    const buyerAToken = jwt.sign({ userId: buyerAId, id: buyerAId, email: buyerAEmail, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    const buyerBToken = jwt.sign({ userId: buyerBId, id: buyerBId, email: buyerBEmail, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    const unrelToken  = jwt.sign({ userId: unrelId,  id: unrelId,  email: unrelEmail,  role: "user" }, JWT_SECRET, { expiresIn: "1h" });

    // Create active reusable digital listing
    const [digRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, seller_username, name, platform, category, listing_type, subcategory, file_format, price, status, agreed_declaration)
       VALUES (?, 'seller_f10', 'F10 Digital Ebook', 'PDF', 'Ebooks & Digital Products', 'ebooks-digital', 'Programming', 'pdf', 250.00, 'active', TRUE)`,
      [sellerId]
    );
    digitalListingId = digRes.insertId;

    // Create active social-media listing
    const [socRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, seller_username, name, platform, category, listing_type, subscribers, price, status)
       VALUES (?, 'seller_f10', 'F10 Social Channel', 'Telegram', 'Social Media', 'social-media', '10K', 400.00, 'active')`,
      [sellerId]
    );
    socialListingId = socRes.insertId;

    // Buyer A purchases digital product via API
    const purA = await req("POST", "escrow/order/digital", buyerAToken, { channelId: digitalListingId });
    assert(purA.status === 201 && purA.data.orderId > 0, "T03: Buyer A initiates digital product purchase", JSON.stringify(purA.data));
    orderAId = purA.data.orderId;

    // Buyer B purchases same reusable digital product via API
    const purB = await req("POST", "escrow/order/digital", buyerBToken, { channelId: digitalListingId });
    assert(purB.status === 201 && purB.data.orderId > 0, "T04: Buyer B initiates separate purchase on same reusable listing", JSON.stringify(purB.data));
    orderBId = purB.data.orderId;

    // Seed deliveries for orderA and orderB so Feature 9 buyer-confirm guard passes
    const seedDelivery = async (oId: number, bId: number) => {
      await pool.query(
        `INSERT INTO digital_order_deliveries (order_id, listing_id, seller_id, buyer_id, file_count, delivery_note, status)
         VALUES (?, ?, ?, ?, 1, 'F10 test delivery', 'delivered')`,
        [oId, digitalListingId, sellerId, bId]
      );
    };
    await seedDelivery(orderAId, buyerAId);
    await seedDelivery(orderBId, buyerBId);

    // Seed seller-only confirmation test order (different digital order)
    const [soRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'F10 Digital Ebook', 'PDF', 'ebooks-digital', ?, 'BuyerA', ?, 'Seller', 250.00, 'processing')`,
      [digitalListingId, buyerAId, sellerId]
    );
    orderSellerOnlyId = soRes.insertId;
    await seedDelivery(orderSellerOnlyId, buyerAId);

    // Seed race test order (buyer already confirmed, seller about to confirm while admin tries to close)
    const [raceRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status, buyer_confirmed)
       VALUES (?, 'F10 Digital Ebook', 'PDF', 'ebooks-digital', ?, 'BuyerA', ?, 'Seller', 250.00, 'processing', TRUE)`,
      [digitalListingId, buyerAId, sellerId]
    );
    orderRaceId = raceRes.insertId;
    // Lock funds on buyerA for orderRaceId
    await pool.query("UPDATE users SET locked_balance = locked_balance + 250 WHERE id = ?", [buyerAId]);

    // Seed cancelled order
    const [canRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status, buyer_confirmed, seller_confirmed)
       VALUES (?, 'F10 Digital Ebook', 'PDF', 'ebooks-digital', ?, 'BuyerA', ?, 'Seller', 250.00, 'cancelled', TRUE, TRUE)`,
      [digitalListingId, buyerAId, sellerId]
    );
    cancelledOrderId = canRes.insertId;

    // ── 3. State A: Neither Confirmed ────────────────────────────────────────
    const stInit = await req("GET", `escrow/orders/${orderAId}/chat-status`, buyerAToken);
    assert(
      stInit.status === 200 && stInit.data.chatState === "open" && !stInit.data.canAdminClose && !stInit.data.bothConfirmed,
      "T05: Initial chatState is 'open', bothConfirmed=false, canAdminClose=false"
    );

    // Buyer, seller, admin can all message while open
    const msgBuyer1 = await req("POST", `escrow/orders/${orderAId}/messages`, buyerAToken, { message: "Hello seller, please deliver." });
    assert(msgBuyer1.status === 201, "T06: Buyer can send message while chat is open");

    const msgSeller1 = await req("POST", `escrow/orders/${orderAId}/messages`, sellerToken, { message: "Delivered! Please check." });
    assert(msgSeller1.status === 201, "T07: Seller can send message while chat is open");

    const msgAdmin1 = await req("POST", `escrow/orders/${orderAId}/messages`, admin1Token, { message: "Admin supervising trade." });
    assert(msgAdmin1.status === 201, "T08: Admin can send message while chat is open");

    // Admin CANNOT close when neither confirmed
    const closeNeither = await req("PATCH", `escrow/orders/${orderAId}/close`, admin1Token);
    assert(closeNeither.status === 400, "T09: Admin cannot close chat when neither party confirmed (400)");

    // ── 4. State B: First Confirmation Only (Buyer Only & Seller Only) ───────
    const confBuyerA = await req("PATCH", `escrow/orders/${orderAId}/confirm`, buyerAToken, { role: "buyer" });
    assert(confBuyerA.status === 200 && confBuyerA.data.bothConfirmed === false, "T10: Buyer confirms receipt; bothConfirmed is false");

    const stAfterBuyer = await req("GET", `escrow/orders/${orderAId}/chat-status`, admin1Token);
    assert(
      stAfterBuyer.status === 200 && stAfterBuyer.data.chatState === "open" && stAfterBuyer.data.buyerConfirmed === true && stAfterBuyer.data.sellerConfirmed === false && stAfterBuyer.data.canAdminClose === false,
      "T11: After buyer-only confirm, chatState stays 'open' and canAdminClose=false"
    );

    // Admin CANNOT close with buyer-only confirmation
    const closeBuyerOnly = await req("PATCH", `escrow/orders/${orderAId}/close`, admin1Token);
    assert(closeBuyerOnly.status === 400, "T12: Admin cannot close chat with only buyer confirmation (400)");

    // Buyer and seller can STILL message after single confirmation
    const msgAfterOne = await req("POST", `escrow/orders/${orderAId}/messages`, buyerAToken, { message: "Still open after my confirm." });
    assert(msgAfterOne.status === 201, "T13: Buyer can still message after single confirmation");

    // Duplicate buyer confirm rejected
    const dupBuyer = await req("PATCH", `escrow/orders/${orderAId}/confirm`, buyerAToken, { role: "buyer" });
    assert(dupBuyer.status === 400, "T14: Duplicate buyer confirmation rejected (400)");

    // Seller-only confirmation on orderSellerOnlyId
    const confSellerOnly = await req("PATCH", `escrow/orders/${orderSellerOnlyId}/confirm`, sellerToken, { role: "seller" });
    assert(confSellerOnly.status === 200 && confSellerOnly.data.bothConfirmed === false, "T15: Seller-only confirms; bothConfirmed is false");
    const closeSellerOnly = await req("PATCH", `escrow/orders/${orderSellerOnlyId}/close`, admin1Token);
    assert(closeSellerOnly.status === 400, "T16: Admin cannot close chat with only seller confirmation (400)");

    // ── 5. State C: Both Confirmations Recorded ──────────────────────────────
    const confSellerA = await req("PATCH", `escrow/orders/${orderAId}/confirm`, sellerToken, { role: "seller" });
    assert(confSellerA.status === 200 && confSellerA.data.bothConfirmed === true, "T17: Seller confirms; bothConfirmed is now true");

    const stBothAdmin = await req("GET", `escrow/orders/${orderAId}/chat-status`, admin1Token);
    assert(
      stBothAdmin.status === 200 && stBothAdmin.data.chatState === "awaiting_closure" && stBothAdmin.data.bothConfirmed === true && stBothAdmin.data.canAdminClose === true,
      "T18: chatState is 'awaiting_closure' and canAdminClose=true for admin"
    );

    const stBothBuyer = await req("GET", `escrow/orders/${orderAId}/chat-status`, buyerAToken);
    assert(
      stBothBuyer.status === 200 && stBothBuyer.data.chatState === "awaiting_closure" && stBothBuyer.data.canAdminClose === false,
      "T19: canAdminClose=false for buyer even when bothConfirmed=true"
    );

    // ── 6. Authorization Tests on Closure & Chat Access ──────────────────────
    const closeUnauth = await req("PATCH", `escrow/orders/${orderAId}/close`);
    assert(closeUnauth.status === 401, "T20: Unauthenticated closure request rejected (401)");

    const closeByBuyer = await req("PATCH", `escrow/orders/${orderAId}/close`, buyerAToken, { adminId: admin1Id, role: "admin" });
    assert(closeByBuyer.status === 403, "T21: Buyer cannot close chat even with spoofed body fields (403)");

    const closeBySeller = await req("PATCH", `escrow/orders/${orderAId}/close`, sellerToken);
    assert(closeBySeller.status === 403, "T22: Seller cannot close chat (403)");

    const closeByUnrel = await req("PATCH", `escrow/orders/${orderAId}/close`, unrelToken);
    assert(closeByUnrel.status === 403, "T23: Unrelated user cannot close chat (403)");

    const readStatusUnrel = await req("GET", `escrow/orders/${orderAId}/chat-status`, unrelToken);
    assert(readStatusUnrel.status === 403, "T24: Unrelated user cannot read chat-status (403)");

    const readMsgsUnrel = await req("GET", `escrow/orders/${orderAId}/messages`, unrelToken);
    assert(readMsgsUnrel.status === 403, "T25: Unrelated user cannot read another buyer's messages (403)");

    // Cancelled order cannot be closed
    const closeCancelled = await req("PATCH", `escrow/orders/${cancelledOrderId}/close`, admin1Token);
    assert(closeCancelled.status === 400, "T26: Admin cannot close a cancelled order (400)");

    // Invalid order IDs rejected
    const closeInvalid = await req("PATCH", `escrow/orders/abc/close`, admin1Token);
    assert(closeInvalid.status === 400, "T27: Invalid order ID 'abc' rejected on close (400)");

    const closeMissing = await req("PATCH", `escrow/orders/99999999/close`, admin1Token);
    assert(closeMissing.status === 404, "T28: Non-existent order ID rejected on close (404)");

    // ── 7. State D: Admin Closes the Conversation ────────────────────────────
    const [sellerBalBefore] = await pool.query<RowDataPacket[]>("SELECT balance FROM users WHERE id = ?", [sellerId]);
    const balBefore = Number(sellerBalBefore[0].balance);

    const closeOk = await req("PATCH", `escrow/orders/${orderAId}/close`, admin1Token, { closedBy: 999999 });
    assert(closeOk.status === 200 && closeOk.data.closedBy === admin1Id, "T29: Admin closes conversation; closedBy derived from JWT, not body", JSON.stringify(closeOk.data));

    // Check DB metadata
    const [closedRow] = await pool.query<RowDataPacket[]>(
      "SELECT is_closed, closed_at, closed_by, status FROM escrow_orders WHERE id = ?",
      [orderAId]
    );
    assert(
      !!closedRow[0].is_closed && closedRow[0].closed_at !== null && Number(closedRow[0].closed_by) === admin1Id && closedRow[0].status === "success",
      "T30: DB records is_closed=1, closed_at, closed_by=admin1Id, status='success'"
    );

    // Check seller credited exactly once (250 ETB)
    const [sellerBalAfter] = await pool.query<RowDataPacket[]>("SELECT balance FROM users WHERE id = ?", [sellerId]);
    assert(Number(sellerBalAfter[0].balance) === balBefore + 250, "T31: Seller balance credited 250 ETB on closure");

    // Check notifications sent to buyer and seller
    const [notifRows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, title FROM notifications WHERE user_id IN (?, ?) AND title LIKE '%Trade Closed%'",
      [buyerAId, sellerId]
    );
    assert(notifRows.length >= 2, "T32: Closure notifications sent to both buyer and seller");

    // Check chat-status reflects closed
    const stClosed = await req("GET", `escrow/orders/${orderAId}/chat-status`, buyerAToken);
    assert(
      stClosed.status === 200 && stClosed.data.chatState === "closed" && stClosed.data.isClosed === true && Number(stClosed.data.closedBy) === admin1Id,
      "T33: chat-status reflects 'closed' with closedBy and closedAt"
    );

    // ── 8. Messaging Restrictions After Closure & History Preservation ───────
    const msgBuyerAfter = await req("POST", `escrow/orders/${orderAId}/messages`, buyerAToken, { message: "Should fail" });
    assert(msgBuyerAfter.status === 400, "T34: Buyer cannot send messages after closure (400)");

    const msgSellerAfter = await req("POST", `escrow/orders/${orderAId}/messages`, sellerToken, { message: "Should fail" });
    assert(msgSellerAfter.status === 400, "T35: Seller cannot send messages after closure (400)");

    const msgAdminAfter = await req("POST", `escrow/orders/${orderAId}/messages`, admin1Token, { message: "Should fail" });
    assert(msgAdminAfter.status === 400, "T36: Admin cannot send messages after closure (read-only) (400)");

    // Historical messages preserved and readable
    const histBuyer = await req("GET", `escrow/orders/${orderAId}/messages`, buyerAToken);
    const histSeller = await req("GET", `escrow/orders/${orderAId}/messages`, sellerToken);
    const histAdmin = await req("GET", `escrow/orders/${orderAId}/messages`, admin1Token);
    assert(
      histBuyer.status === 200 && histSeller.status === 200 && histAdmin.status === 200 && histBuyer.data.messages.length >= 5,
      "T37: Historical messages preserved and readable by buyer, seller, and admin"
    );

    // ── 9. Cross-Order & Reusable Digital Inventory Isolation ────────────────
    // Buyer B's order on the SAME digital product must still be open!
    const stOrderB = await req("GET", `escrow/orders/${orderBId}/chat-status`, buyerBToken);
    assert(stOrderB.status === 200 && stOrderB.data.chatState === "open" && !stOrderB.data.isClosed, "T38: Closing Buyer A's order does NOT affect Buyer B's order");

    const msgOrderB = await req("POST", `escrow/orders/${orderBId}/messages`, buyerBToken, { message: "Buyer B still active!" });
    assert(msgOrderB.status === 201, "T39: Buyer B can still send messages in their own order");

    // Digital listing remains active (reusable)
    const [digCheck] = await pool.query<RowDataPacket[]>("SELECT status FROM channels WHERE id = ?", [digitalListingId]);
    assert(digCheck[0].status === "active", "T40: Reusable digital product listing remains status='active' after order closure");

    // ── 10. Concurrency & Idempotency Tests ──────────────────────────────────
    // Repeated close request (retry) on already-closed orderAId
    const closeRetry = await req("PATCH", `escrow/orders/${orderAId}/close`, admin1Token);
    assert(closeRetry.status === 400, "T41: Repeated closure request rejected safely (400)");

    const [sellerBalRetry] = await pool.query<RowDataPacket[]>("SELECT balance FROM users WHERE id = ?", [sellerId]);
    assert(Number(sellerBalRetry[0].balance) === balBefore + 250, "T42: Repeated closure does NOT double-credit seller");

    // Concurrent admin closure (admin1 & admin2 race on orderBId after both confirm)
    await req("PATCH", `escrow/orders/${orderBId}/confirm`, buyerBToken, { role: "buyer" });
    await req("PATCH", `escrow/orders/${orderBId}/confirm`, sellerToken, { role: "seller" });

    const [raceClose1, raceClose2] = await Promise.all([
      req("PATCH", `escrow/orders/${orderBId}/close`, admin1Token),
      req("PATCH", `escrow/orders/${orderBId}/close`, admin2Token),
    ]);
    const closeStatuses = [raceClose1.status, raceClose2.status].sort();
    assert(
      closeStatuses[0] === 200 && closeStatuses[1] === 400,
      "T43: Concurrent admin closure — exactly 1 succeeds (200) and 1 rejected (400)",
      `Got ${closeStatuses.join(", ")}`
    );

    const [sellerBalAfterB] = await pool.query<RowDataPacket[]>("SELECT balance FROM users WHERE id = ?", [sellerId]);
    assert(Number(sellerBalAfterB[0].balance) === balBefore + 500, "T44: Concurrent admin closure credits seller exactly once (+250 ETB)");

    // Race: Seller confirms (2nd confirmation) while admin attempts closure simultaneously on orderRaceId
    const [raceConf, raceAdmClose] = await Promise.all([
      req("PATCH", `escrow/orders/${orderRaceId}/confirm`, sellerToken, { role: "seller" }),
      req("PATCH", `escrow/orders/${orderRaceId}/close`, admin1Token),
    ]);
    assert(raceConf.status === 200, "T45: Second confirmation succeeds during race with admin close");
    // Whether admin close ran before (400) or after (200), DB state must be consistent
    const [raceDb] = await pool.query<RowDataPacket[]>(
      "SELECT buyer_confirmed, seller_confirmed, is_closed, status FROM escrow_orders WHERE id = ?",
      [orderRaceId]
    );
    const raceConsistent =
      !!raceDb[0].buyer_confirmed &&
      !!raceDb[0].seller_confirmed &&
      (raceAdmClose.status === 200 ? !!raceDb[0].is_closed && raceDb[0].status === "success" : !raceDb[0].is_closed);
    assert(raceConsistent, "T46: Confirmation vs Closure race leaves consistent DB state", `adminClose=${raceAdmClose.status}`);

    // If admin close happened to lose the race (400), close it now and race a message submission against closure
    if (raceAdmClose.status === 400) {
      const [msgRace, closeRace] = await Promise.all([
        req("POST", `escrow/orders/${orderRaceId}/messages`, buyerAToken, { message: "Racing message" }),
        req("PATCH", `escrow/orders/${orderRaceId}/close`, admin1Token),
      ]);
      assert(closeRace.status === 200 && (msgRace.status === 201 || msgRace.status === 400), "T47: Message vs Closure race serialized cleanly");
    } else {
      const msgAfterRaceClose = await req("POST", `escrow/orders/${orderRaceId}/messages`, buyerAToken, { message: "After race close" });
      assert(msgAfterRaceClose.status === 400, "T47: Message blocked after race closure");
    }

    // ── 11. Social-Media Transaction Lifecycle Preservation ──────────────────
    const purSoc = await req("POST", "escrow/order", buyerAToken, { channelId: socialListingId });
    assert(purSoc.status === 201 && purSoc.data.orderId > 0, "T48: Social-media order created via /escrow/order");
    socialOrderId = purSoc.data.orderId;

    await req("PATCH", `escrow/orders/${socialOrderId}/confirm`, buyerAToken, { role: "buyer" });
    const closeSocOne = await req("PATCH", `escrow/orders/${socialOrderId}/close`, admin1Token);
    assert(closeSocOne.status === 400, "T49: Social-media order also requires both confirmations before admin close");

    await req("PATCH", `escrow/orders/${socialOrderId}/confirm`, sellerToken, { role: "seller" });
    const closeSocOk = await req("PATCH", `escrow/orders/${socialOrderId}/close`, admin1Token);
    assert(closeSocOk.status === 200, "T50: Social-media order closes cleanly after both confirmations");

    const [socChan] = await pool.query<RowDataPacket[]>("SELECT status FROM channels WHERE id = ?", [socialListingId]);
    assert(socChan[0].status === "sold", "T51: Social-media channel marked 'sold' on closure (unlike reusable digital)");

    const msgSocAfter = await req("POST", `escrow/orders/${socialOrderId}/messages`, buyerAToken, { message: "After social close" });
    assert(msgSocAfter.status === 400, "T52: Social-media chat blocks messages after closure");

  } catch (err) {
    console.error("[Fatal Test Error]:", err);
    failed++;
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────────────
    const orderIds = [orderAId, orderBId, orderSellerOnlyId, orderRaceId, socialOrderId, cancelledOrderId].filter((id) => id > 0);
    if (orderIds.length > 0) {
      await pool.query("DELETE FROM escrow_messages WHERE order_id IN (?)", [orderIds]).catch(() => {});
      await pool.query("DELETE FROM digital_order_deliveries WHERE order_id IN (?)", [orderIds]).catch(() => {});
      await pool.query("DELETE FROM escrow_orders WHERE id IN (?)", [orderIds]).catch(() => {});
    }
    const listingIds = [digitalListingId, socialListingId].filter((id) => id > 0);
    if (listingIds.length > 0) {
      await pool.query("DELETE FROM channels WHERE id IN (?)", [listingIds]).catch(() => {});
    }
    const userIds = [admin1Id, admin2Id, sellerId, buyerAId, buyerBId, unrelId].filter((id) => id > 0);
    if (userIds.length > 0) {
      await pool.query("DELETE FROM notifications WHERE user_id IN (?)", [userIds]).catch(() => {});
      await pool.query("DELETE FROM users WHERE id IN (?)", [userIds]).catch(() => {});
    }
    server.close();
    await pool.end();
  }

  console.log(`\n=== FEATURE 10 RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runChatLifecycleVerification();
