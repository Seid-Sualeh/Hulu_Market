import http from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool, initDatabase } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import { getStorageAdapter } from "./services/storage.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

async function runDeliveryVerification() {
  console.log("=== HULU MARKET FEATURE 8: SELLER FILE DELIVERY IN TRANSACTION CHAT VERIFICATION ===");
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
  const adminEmail = `admin_f8_${timestamp}@hulumarket.et`;
  const sellerEmail = `seller_f8_${timestamp}@test.et`;
  const buyerAEmail = `buyerA_f8_${timestamp}@test.et`;
  const buyerBEmail = `buyerB_f8_${timestamp}@test.et`;
  const unrelatedEmail = `unrelated_f8_${timestamp}@test.et`;

  let adminId = 0;
  let sellerId = 0;
  let buyerAId = 0;
  let buyerBId = 0;
  let unrelatedId = 0;

  let digitalListingId = 0;
  let socialListingId = 0;
  let unrelatedListingId = 0;

  let activeOrder1Id = 0; // Seller -> Buyer A (digital)
  let activeOrder2Id = 0; // Seller -> Buyer B (digital)
  let socialOrderId = 0;  // Seller -> Buyer A (social-media)
  let closedOrderId = 0;  // Seller -> Buyer A (cancelled digital)
  let unrelatedOrderId = 0; // Unrelated -> Buyer B (digital)

  // File creation helpers
  const createValidPdfBuffer = (title: string = "Sample PDF"): Buffer => {
    return Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Title (${title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`
    );
  };

  const createValidZipBuffer = (
    filename: string = "content.txt",
    content: string = "Hulu Market Delivery Asset"
  ): Buffer => {
    const fnBuf = Buffer.from(filename, "utf8");
    const contentBuf = Buffer.from(content, "utf8");

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(contentBuf.length, 18);
    localHeader.writeUInt32LE(contentBuf.length, 22);
    localHeader.writeUInt16LE(fnBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localRecord = Buffer.concat([localHeader, fnBuf, contentBuf]);

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(0, 10);
    cdHeader.writeUInt16LE(0, 12);
    cdHeader.writeUInt16LE(0, 14);
    cdHeader.writeUInt32LE(0, 16);
    cdHeader.writeUInt32LE(contentBuf.length, 20);
    cdHeader.writeUInt32LE(contentBuf.length, 24);
    cdHeader.writeUInt16LE(fnBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(0, 42);

    const cdRecord = Buffer.concat([cdHeader, fnBuf]);

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cdRecord.length, 12);
    eocd.writeUInt32LE(localRecord.length, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([localRecord, cdRecord, eocd]);
  };

  const createValidTxtBuffer = (text: string = "Plain text notes"): Buffer => {
    return Buffer.from(text, "utf8");
  };

  const toBlob = (buf: Buffer, type: string) => new Blob([new Uint8Array(buf)], { type });

  try {
    // 1. Ensure DB schema
    await initDatabase();

    // 2. Insert Test Users
    const [adminRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990001', 'hash', 'Admin', 'User', 'admin', 0, 0)`,
      [adminEmail]
    );
    adminId = adminRes.insertId;

    const [sellerRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990002', 'hash', 'Seller', 'User', 'user', 0, 0)`,
      [sellerEmail]
    );
    sellerId = sellerRes.insertId;

    const [buyerARes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990003', 'hash', 'Buyer', 'Alpha', 'user', 2000.00, 500.00)`,
      [buyerAEmail]
    );
    buyerAId = buyerARes.insertId;

    const [buyerBRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990004', 'hash', 'Buyer', 'Beta', 'user', 2000.00, 500.00)`,
      [buyerBEmail]
    );
    buyerBId = buyerBRes.insertId;

    const [unrelatedRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, balance, locked_balance)
       VALUES (?, '+251911990005', 'hash', 'Unrelated', 'User', 'user', 100.00, 0)`,
      [unrelatedEmail]
    );
    unrelatedId = unrelatedRes.insertId;

    const adminToken = jwt.sign({ userId: adminId, id: adminId, email: adminEmail, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    const sellerToken = jwt.sign({ userId: sellerId, id: sellerId, email: sellerEmail, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    const buyerAToken = jwt.sign({ userId: buyerAId, id: buyerAId, email: buyerAEmail, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    const buyerBToken = jwt.sign({ userId: buyerBId, id: buyerBId, email: buyerBEmail, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    const unrelatedToken = jwt.sign({ userId: unrelatedId, id: unrelatedId, email: unrelatedEmail, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

    // 3. Insert Test Listings
    const [digRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, name, platform, category, price, status, listing_type, agreed_declaration, file_format, subcategory)
       VALUES (?, 'Advanced Node.js Mastery', 'PDF', 'ebooks-digital', 500.00, 'active', 'ebooks-digital', 1, 'PDF', 'Programming')`,
      [sellerId]
    );
    digitalListingId = digRes.insertId;

    const [socRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, name, platform, category, price, status, listing_type, agreed_declaration)
       VALUES (?, 'Addis Tech News Channel', 'telegram', 'Technology', 1500.00, 'active', 'telegram', 0)`,
      [sellerId]
    );
    socialListingId = socRes.insertId;

    const [unrelRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO channels (seller_id, name, platform, category, price, status, listing_type, agreed_declaration, file_format, subcategory)
       VALUES (?, 'Python Complete Guide', 'PDF', 'ebooks-digital', 400.00, 'active', 'ebooks-digital', 1, 'PDF', 'Programming')`,
      [unrelatedId]
    );
    unrelatedListingId = unrelRes.insertId;

    // 4. Insert Test Orders
    // Order 1: Seller -> Buyer A (Active Digital Order)
    const [ord1Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'Advanced Node.js Mastery', 'PDF', 'ebooks-digital', ?, 'Buyer Alpha', ?, 'Seller User', 500.00, 'processing')`,
      [digitalListingId, buyerAId, sellerId]
    );
    activeOrder1Id = ord1Res.insertId;

    // Order 2: Seller -> Buyer B (Active Digital Order - Reusable inventory)
    const [ord2Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'Advanced Node.js Mastery', 'PDF', 'ebooks-digital', ?, 'Buyer Beta', ?, 'Seller User', 500.00, 'processing')`,
      [digitalListingId, buyerBId, sellerId]
    );
    activeOrder2Id = ord2Res.insertId;

    // Order 3: Seller -> Buyer A (Social Media Order)
    const [ord3Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'Addis Tech News Channel', 'telegram', 'social-media', ?, 'Buyer Alpha', ?, 'Seller User', 1500.00, 'processing')`,
      [socialListingId, buyerAId, sellerId]
    );
    socialOrderId = ord3Res.insertId;

    // Order 4: Seller -> Buyer A (Cancelled Digital Order)
    const [ord4Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'Advanced Node.js Mastery', 'PDF', 'ebooks-digital', ?, 'Buyer Alpha', ?, 'Seller User', 500.00, 'cancelled')`,
      [digitalListingId, buyerAId, sellerId]
    );
    closedOrderId = ord4Res.insertId;

    // Order 5: Unrelated -> Buyer B (Unrelated Digital Order)
    const [ord5Res] = await pool.query<ResultSetHeader>(
      `INSERT INTO escrow_orders (channel_id, channel_name, platform, listing_type, buyer_id, buyer_name, seller_id, seller_name, amount, status)
       VALUES (?, 'Python Complete Guide', 'PDF', 'ebooks-digital', ?, 'Buyer Beta', ?, 'Unrelated User', 400.00, 'processing')`,
      [unrelatedListingId, buyerBId, unrelatedId]
    );
    unrelatedOrderId = ord5Res.insertId;

    // =========================================================================
    // SECTION A: AUTHORIZATION & PERMISSION ENFORCEMENT
    // =========================================================================

    // Test 1: Unauthenticated POST rejected
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer(), "application/pdf"), "notes.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        body: formData,
      });
      assert(res.status === 401, "Test 1: Unauthenticated POST delivery returns 401 Unauthorized");
    }

    // Test 2: Unauthenticated GET rejected
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`);
      assert(res.status === 401, "Test 2: Unauthenticated GET deliveries returns 401 Unauthorized");
    }

    // Test 3: Buyer cannot upload seller delivery files
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer(), "application/pdf"), "notes.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${buyerAToken}` },
        body: formData,
      });
      assert(res.status === 403, "Test 3: Buyer cannot upload delivery files (403 Forbidden)");
    }

    // Test 4: Unrelated third-party user cannot upload delivery files
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer(), "application/pdf"), "notes.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${unrelatedToken}` },
        body: formData,
      });
      assert(res.status === 403, "Test 4: Unrelated user cannot upload delivery files (403 Forbidden)");
    }

    // Test 5: Seller cannot upload to another seller's order
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer(), "application/pdf"), "notes.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${unrelatedOrderId}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 403, "Test 5: Seller cannot upload to another seller's order (403 Forbidden)");
    }

    // Test 6: Non-digital (social-media) order rejects delivery attempts
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer(), "application/pdf"), "notes.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${socialOrderId}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 6: Social media order rejects digital file delivery (400 Bad Request)");
      const data = await res.json();
      assert(data.error?.toLowerCase().includes("digital product"), "Test 6b: Descriptive error mentioning digital product");
    }

    // Test 7: Cancelled or closed order rejects delivery attempts
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer(), "application/pdf"), "notes.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${closedOrderId}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 7: Cancelled/closed order rejects deliveries (400 Bad Request)");
    }

    // Test 8: Non-existent order returns 404
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer(), "application/pdf"), "notes.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/999999/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 404, "Test 8: Non-existent order returns 404 Not Found");
    }

    // =========================================================================
    // SECTION B: CONTENT VALIDATION, SANITIZATION & LIMITS
    // =========================================================================

    // Test 9: Upload without files returns 400
    {
      const formData = new FormData();
      formData.append("deliveryNote", "Here is nothing");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 9: Upload with 0 files returns 400 Bad Request");
    }

    // Test 10: Executable file (.exe) rejected
    {
      const formData = new FormData();
      formData.append("files", toBlob(Buffer.from("MZ executable header"), "application/octet-stream"), "malware.exe");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 10: Disallowed extension (.exe) rejected with 400 Bad Request");
    }

    // Test 11: Spoofed MIME / invalid signature rejected (.pdf extension with invalid magic bytes)
    {
      const formData = new FormData();
      formData.append("files", toBlob(Buffer.from("This is not a real PDF file content", "utf8"), "application/pdf"), "fake.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 11: Spoofed PDF with invalid magic bytes rejected with 400 Bad Request");
    }

    // Test 12: Oversized file (> 50MB) rejected
    {
      // Create a 51MB zero-filled buffer with PDF header
      const largePdfHeader = Buffer.from("%PDF-1.4\n");
      const largeContent = Buffer.alloc(52 * 1024 * 1024);
      largePdfHeader.copy(largeContent, 0);

      const formData = new FormData();
      formData.append("files", toBlob(largeContent, "application/pdf"), "huge.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 12: Oversized file (>50MB) rejected with 400 Bad Request");
    }

    // Test 13: More than 5 files in batch rejected
    {
      const formData = new FormData();
      for (let i = 1; i <= 6; i++) {
        formData.append("files", toBlob(createValidPdfBuffer(`Chapter ${i}`), "application/pdf"), `chapter_${i}.pdf`);
      }
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 13: Batch exceeding 5 files rejected with 400 Bad Request");
      const data = await res.json();
      assert(data.error?.includes("5 files"), "Test 13b: Error message specifies 5 files maximum");
    }

    // Test 14: Filename with path traversal attempts sanitized
    {
      const formData = new FormData();
      formData.append("files", toBlob(createValidPdfBuffer("Sanitization Test"), "application/pdf"), "../../../etc/passwd.pdf");
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 201, "Test 14a: Delivery with path traversal in filename processed");
      const data = await res.json();
      const sanitizedName = data.delivery?.files?.[0]?.original_filename;
      assert(
        sanitizedName === "passwd.pdf",
        `Test 14b: Dangerous path traversal stripped from filename (got "${sanitizedName}")`
      );
    }

    // =========================================================================
    // SECTION C: SUCCESSFUL DELIVERY & MULTI-FILE BATCH
    // =========================================================================

    let delivery1BatchId = 0;
    // Test 15: Valid single-file delivery (PDF) returns 201 Created
    {
      const pdfBuf = createValidPdfBuffer("Full Course Guide");
      const formData = new FormData();
      formData.append("deliveryNote", "Here is your primary PDF handbook.");
      formData.append("files", toBlob(pdfBuf, "application/pdf"), "Mastery_Course_Guide.pdf");

      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      assert(res.status === 201, "Test 15a: Valid delivery returns 201 Created");
      const data = await res.json();
      assert(data.success === true, "Test 15b: Response has success=true");
      assert(data.delivery?.order_id === activeOrder1Id, "Test 15c: Delivery order_id matches");
      assert(data.delivery?.seller_id === sellerId, "Test 15d: Delivery seller_id matches");
      assert(data.delivery?.buyer_id === buyerAId, "Test 15e: Delivery buyer_id matches");
      assert(data.delivery?.file_count === 1, "Test 15f: Delivery file_count is 1");
      assert(data.delivery?.delivery_note === "Here is your primary PDF handbook.", "Test 15g: Delivery note stored correctly");
      delivery1BatchId = data.delivery?.id;
    }

    // Test 16: Response returns sanitized file metadata & NEVER exposes storage_key or internal filesystem paths
    {
      const [dbFiles] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM digital_order_delivery_files WHERE delivery_id = ?`,
        [delivery1BatchId]
      );
      assert(dbFiles.length === 1, "Test 16a: Database contains 1 delivery file record");
      const fileRecord = dbFiles[0];
      assert(Boolean(fileRecord.storage_key), "Test 16b: DB record contains private storage_key");
      assert(fileRecord.checksum_sha256.length === 64, "Test 16c: DB record contains SHA-256 checksum");

      // Verify that API response did NOT leak storage_key
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        headers: { Authorization: `Bearer ${buyerAToken}` },
      });
      const data = await res.json();
      const firstBatch = data.deliveries?.[0];
      const returnedFile = firstBatch?.files?.[0];

      assert(returnedFile?.id !== undefined, "Test 16d: File ID is returned");
      assert(returnedFile?.original_filename === "passwd.pdf" || returnedFile?.original_filename === "Mastery_Course_Guide.pdf", "Test 16e: Filename returned");
      assert(returnedFile?.file_format !== undefined, "Test 16f: File format returned");
      assert(returnedFile?.mime_type !== undefined, "Test 16g: MIME type returned");
      assert(returnedFile?.file_size_bytes !== undefined, "Test 16h: File size bytes returned");
      assert(returnedFile?.checksum_sha256 !== undefined, "Test 16i: File SHA-256 checksum returned");
      assert((returnedFile as any).storage_key === undefined, "Test 16j: storage_key is strictly OMITTED from client response");
      assert((returnedFile as any).filePath === undefined, "Test 16k: filesystem path is strictly OMITTED from client response");

      // Verify physical storage adapter contains the file
      const storage = getStorageAdapter();
      const storageExists = await storage.objectExists(fileRecord.storage_key);
      assert(storageExists === true, "Test 16l: Object successfully persisted in private storage adapter");
    }

    // Test 17: Valid multi-file delivery (PDF, TXT, ZIP) in one batch
    let multiBatchId = 0;
    {
      const pdfBuf = createValidPdfBuffer("Bonus Slides");
      const txtBuf = createValidTxtBuffer("License and quickstart instructions.");
      const zipBuf = createValidZipBuffer("examples.js", "console.log('Hello Hulu');");

      const formData = new FormData();
      formData.append("deliveryNote", "Batch 2: Slides, license, and source code archive.");
      formData.append("files", toBlob(pdfBuf, "application/pdf"), "Bonus_Slides.pdf");
      formData.append("files", toBlob(txtBuf, "text/plain"), "README.txt");
      formData.append("files", toBlob(zipBuf, "application/zip"), "SourceCode.zip");

      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      assert(res.status === 201, "Test 17a: Multi-file delivery returns 201 Created");
      const data = await res.json();
      assert(data.delivery?.file_count === 3, "Test 17b: Delivery batch file_count is 3");
      assert(data.delivery?.files?.length === 3, "Test 17c: Delivery batch returns 3 files");
      multiBatchId = data.delivery?.id;
    }

    // Test 18: Automatic supervisor chat message posted to escrow_messages
    {
      const [messages] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM escrow_messages WHERE order_id = ? AND sender_role = 'admin' ORDER BY id DESC`,
        [activeOrder1Id]
      );
      assert(messages.length >= 2, "Test 18a: System messages generated for deliveries");
      const latestMsg = messages[0];
      assert(latestMsg.message.includes("📦 Seller delivered"), "Test 18b: Delivery notification emoji and prefix");
      assert(latestMsg.message.includes("Bonus_Slides.pdf"), "Test 18c: Includes delivered file names");
      assert(latestMsg.message.includes("Batch 2:"), "Test 18d: Includes seller delivery note");
    }

    // Test 19: Notification created for the buyer
    {
      const [notifs] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC`,
        [buyerAId]
      );
      assert(notifs.length >= 1, "Test 19a: Notification created for Buyer A");
      assert(notifs[0].title.includes("Delivered"), "Test 19b: Notification title mentions delivery");
      assert(notifs[0].action_url === `/inbox?orderId=${activeOrder1Id}`, "Test 19c: Notification links directly to order chat");
    }

    // =========================================================================
    // SECTION D: ORDER & DELIVERY ISOLATION
    // =========================================================================

    // Test 20: Buyer A on Order 1 can fetch deliveries
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        headers: { Authorization: `Bearer ${buyerAToken}` },
      });
      assert(res.status === 200, "Test 20a: Buyer on order can fetch deliveries (200 OK)");
      const data = await res.json();
      assert(data.deliveries?.length >= 2, "Test 20b: Buyer sees all delivery batches for this order");
    }

    // Test 21: Seller on Order 1 can fetch deliveries
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
      });
      assert(res.status === 200, "Test 21a: Seller on order can fetch deliveries (200 OK)");
      const data = await res.json();
      assert(data.deliveries?.length >= 2, "Test 21b: Seller sees all delivery batches for this order");
    }

    // Test 22: Admin can fetch deliveries
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, "Test 22: Admin can inspect delivery batches (200 OK)");
    }

    // Test 23: Buyer B (buyer on Order 2) CANNOT fetch deliveries of Order 1
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        headers: { Authorization: `Bearer ${buyerBToken}` },
      });
      assert(res.status === 403, "Test 23: Buyer B cannot view deliveries of Order 1 (403 Forbidden)");
    }

    // Test 24: Unrelated user CANNOT fetch deliveries of Order 1
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        headers: { Authorization: `Bearer ${unrelatedToken}` },
      });
      assert(res.status === 403, "Test 24: Unrelated user cannot view deliveries of Order 1 (403 Forbidden)");
    }

    // =========================================================================
    // SECTION E: BUSINESS INTEGRITY & ESCROW INVARIANTS
    // =========================================================================

    // Test 25: Escrow order status remains 'processing' after delivery (NO auto-close / NOT Feature 9)
    {
      const [orders] = await pool.query<RowDataPacket[]>(
        `SELECT status FROM escrow_orders WHERE id = ?`,
        [activeOrder1Id]
      );
      assert(orders[0].status === "processing", `Test 25: Escrow order remains 'processing' (got '${orders[0].status}')`);
    }

    // Test 26: Buyer locked balance remains intact (funds NOT released to seller)
    {
      const [buyerRows] = await pool.query<RowDataPacket[]>(
        `SELECT balance, locked_balance FROM users WHERE id = ?`,
        [buyerAId]
      );
      assert(Number(buyerRows[0].locked_balance) === 500.00, `Test 26a: Buyer locked balance still locked at 500.00 ETB (got ${buyerRows[0].locked_balance})`);

      const [sellerRows] = await pool.query<RowDataPacket[]>(
        `SELECT balance FROM users WHERE id = ?`,
        [sellerId]
      );
      assert(Number(sellerRows[0].balance) === 0.00, `Test 26b: Seller balance not credited before escrow release (got ${sellerRows[0].balance})`);
    }

    // Test 27: Digital listing remains 'active' (NOT marked 'sold')
    {
      const [listings] = await pool.query<RowDataPacket[]>(
        `SELECT status, seller_id FROM channels WHERE id = ?`,
        [digitalListingId]
      );
      assert(listings[0].status === "active", `Test 27: Digital listing remains 'active' (got '${listings[0].status}')`);
      assert(listings[0].seller_id === sellerId, "Test 28: Digital listing owner remains original seller");
    }

    // Test 29: Reusable inventory: Seller delivers to Order 2 (Buyer B) independently
    {
      const pdfBuf = createValidPdfBuffer("Course Guide for Buyer B");
      const formData = new FormData();
      formData.append("deliveryNote", "Personalized edition for Buyer B");
      formData.append("files", toBlob(pdfBuf, "application/pdf"), "BuyerB_Guide.pdf");

      const res = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder2Id}/deliveries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 201, "Test 29a: Seller delivers to second buyer on same reusable listing (201 Created)");

      const resGet1 = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder1Id}/deliveries`, {
        headers: { Authorization: `Bearer ${buyerAToken}` },
      });
      const data1 = await resGet1.json();

      const resGet2 = await fetch(`${baseUrl}/api/escrow/orders/${activeOrder2Id}/deliveries`, {
        headers: { Authorization: `Bearer ${buyerBToken}` },
      });
      const data2 = await resGet2.json();

      assert(data1.deliveries.every((d: any) => d.order_id === activeOrder1Id), "Test 29b: Order 1 deliveries strictly contain order 1 batches");
      assert(data2.deliveries.every((d: any) => d.order_id === activeOrder2Id), "Test 29c: Order 2 deliveries strictly contain order 2 batches");
      assert(data2.deliveries.length === 1, "Test 29d: Order 2 has exactly 1 delivery batch");
    }

    // Test 30: Social-media order lifecycle unaffected
    {
      const [socOrders] = await pool.query<RowDataPacket[]>(
        `SELECT status, listing_type FROM escrow_orders WHERE id = ?`,
        [socialOrderId]
      );
      assert(socOrders[0].status === "processing", "Test 30a: Social-media order status unaffected");
      assert(socOrders[0].listing_type === "social-media", "Test 30b: Social-media listing_type preserved");
    }

    // =========================================================================
    // SECTION F: STORAGE CLEANUP ON FAILURE SIMULATION
    // =========================================================================

    // Test 31: Storage cleanup verification on aborted upload
    {
      const storage = getStorageAdapter();
      const testBuf = Buffer.from("Temporary failure simulation buffer", "utf8");
      const putRes = await storage.putObject(testBuf, "pdf");
      const testKey = putRes.storageKey;

      assert(await storage.objectExists(testKey), "Test 31a: Object created in storage");
      // Simulate cleanup on failure
      await storage.deleteObject(testKey);
      assert((await storage.objectExists(testKey)) === false, "Test 31b: Object cleaned up immediately on deleteObject");
    }

  } catch (err) {
    console.error("FATAL ERROR in verification suite:", err);
    failed++;
  } finally {
    // Teardown test server
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Cleanup test records
    try {
      if (activeOrder1Id || activeOrder2Id || socialOrderId || closedOrderId || unrelatedOrderId) {
        await pool.query(
          `DELETE FROM escrow_orders WHERE id IN (?, ?, ?, ?, ?)`,
          [activeOrder1Id, activeOrder2Id, socialOrderId, closedOrderId, unrelatedOrderId]
        );
      }
      if (digitalListingId || socialListingId || unrelatedListingId) {
        await pool.query(
          `DELETE FROM channels WHERE id IN (?, ?, ?)`,
          [digitalListingId, socialListingId, unrelatedListingId]
        );
      }
      if (adminId || sellerId || buyerAId || buyerBId || unrelatedId) {
        await pool.query(
          `DELETE FROM notifications WHERE user_id IN (?, ?, ?, ?, ?)`,
          [adminId, sellerId, buyerAId, buyerBId, unrelatedId]
        );
        await pool.query(
          `DELETE FROM users WHERE id IN (?, ?, ?, ?, ?)`,
          [adminId, sellerId, buyerAId, buyerBId, unrelatedId]
        );
      }
    } catch (cleanupErr) {
      console.error("Error during teardown cleanup:", cleanupErr);
    }
  }

  console.log("\n==========================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDeliveryVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification execution error:", err);
    process.exit(1);
  });
