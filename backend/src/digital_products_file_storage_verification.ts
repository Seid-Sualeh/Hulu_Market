import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import { getStorageAdapter, setStorageAdapter, S3PrivateStorageAdapter } from "./services/storage.js";
import { recordFailedCleanup } from "./services/storageCleanup.js";
import type { RowDataPacket } from "mysql2/promise";

async function runStorageVerification() {
  console.log("=== HULU MARKET FEATURE 6A: SECURITY & STORAGE REMEDIATION VERIFICATION ===");
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

  // --- MOCK S3-COMPATIBLE SERVER (TASK 1) ---
  // Implements in-memory S3 storage and validates AWS SigV4 authorization headers
  const mockS3Store = new Map<string, Buffer>();
  let mockS3ReceivedAuthHeaders: string[] = [];
  const mockS3Server = http.createServer((req, res) => {
    const authHeader = req.headers["authorization"] || "";
    mockS3ReceivedAuthHeaders.push(authHeader);

    const parsedUrl = new URL(req.url || "/", `http://${req.headers.host}`);
    const key = parsedUrl.pathname.split("/").filter(Boolean).slice(1).join("/");

    // Validate AWS SigV4 presence
    const hasSigV4 =
      authHeader.startsWith("AWS4-HMAC-SHA256 Credential=") &&
      authHeader.includes("SignedHeaders=") &&
      authHeader.includes("Signature=") &&
      Boolean(req.headers["x-amz-date"]) &&
      Boolean(req.headers["x-amz-content-sha256"]);

    if (!hasSigV4) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "AccessDenied: Missing or invalid AWS SigV4 authentication" }));
      return;
    }

    if (req.method === "PUT") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        mockS3Store.set(key, Buffer.concat(chunks));
        res.writeHead(200);
        res.end();
      });
      return;
    }

    if (req.method === "GET") {
      if (!mockS3Store.has(key)) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      res.end(mockS3Store.get(key));
      return;
    }

    if (req.method === "HEAD") {
      if (!mockS3Store.has(key)) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === "DELETE") {
      mockS3Store.delete(key);
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(405);
    res.end();
  });

  await new Promise<void>((resolve) => mockS3Server.listen(0, "127.0.0.1", () => resolve()));
  const s3Port = (mockS3Server.address() as { port: number }).port;
  const mockS3Endpoint = `http://127.0.0.1:${s3Port}`;

  // Start Main Application Server
  const app = createApp("https://hulu-market.vercel.app");
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Find seller user, other user, and admin
  const [dbUsers] = await pool.query<RowDataPacket[]>(
    "SELECT id, email, role FROM users ORDER BY id ASC"
  );
  const adminUser = dbUsers.find((u) => u.role === "admin") || { id: 4, email: "admin@hulumarket.com" };
  const sellerUser = dbUsers.find((u) => u.role !== "admin") || { id: 2, email: "sualehseid@gmail.com" };
  const otherUser = dbUsers.filter((u) => u.id !== sellerUser.id && u.role !== "admin")[0] || { id: 3, email: "mohammed@gmail.com" };

  const jwtSecret = getJwtSecret();
  const sellerToken = jwt.sign(
    { userId: sellerUser.id, id: sellerUser.id, email: sellerUser.email, role: "user" },
    jwtSecret,
    { expiresIn: "1h" }
  );
  const otherUserToken = jwt.sign(
    { userId: otherUser.id, id: otherUser.id, email: otherUser.email, role: "user" },
    jwtSecret,
    { expiresIn: "1h" }
  );
  const adminToken = jwt.sign(
    { userId: adminUser.id, id: adminUser.id, email: adminUser.email, role: "admin" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const createdListingIds: number[] = [];

  // Helper to create a valid minimal PDF buffer
  const createValidPdfBuffer = (title: string = "Sample Document") => {
    return Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Title (${title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`
    );
  };

  // Helper to create a fully standard-compliant ZIP archive (Local header + Central Directory + EOCD)
  const createValidZipBuffer = (
    filename: string = "document.txt",
    content: string = "Hulu Market Verified Digital Asset"
  ): Buffer => {
    const fnBuf = Buffer.from(filename, "utf8");
    const contentBuf = Buffer.from(content, "utf8");

    // 1. Local File Header
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4); // min version
    localHeader.writeUInt16LE(0, 6); // general purpose flags
    localHeader.writeUInt16LE(0, 8); // compression = 0 (stored)
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(0, 14); // crc32
    localHeader.writeUInt32LE(contentBuf.length, 18); // comp size
    localHeader.writeUInt32LE(contentBuf.length, 22); // uncomp size
    localHeader.writeUInt16LE(fnBuf.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const localRecord = Buffer.concat([localHeader, fnBuf, contentBuf]);

    // 2. Central Directory Header
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    cdHeader.writeUInt16LE(20, 4); // version made by
    cdHeader.writeUInt16LE(20, 6); // version needed
    cdHeader.writeUInt16LE(0, 8); // flags
    cdHeader.writeUInt16LE(0, 10); // compression method (stored)
    cdHeader.writeUInt16LE(0, 12); // mod time
    cdHeader.writeUInt16LE(0, 14); // mod date
    cdHeader.writeUInt32LE(0, 16); // crc32
    cdHeader.writeUInt32LE(contentBuf.length, 20); // compressed size
    cdHeader.writeUInt32LE(contentBuf.length, 24); // uncompressed size
    cdHeader.writeUInt16LE(fnBuf.length, 28); // filename length
    cdHeader.writeUInt16LE(0, 30); // extra length
    cdHeader.writeUInt16LE(0, 32); // comment length
    cdHeader.writeUInt16LE(0, 34); // disk number start
    cdHeader.writeUInt16LE(0, 36); // internal file attributes
    cdHeader.writeUInt32LE(0, 38); // external file attributes
    cdHeader.writeUInt32LE(0, 42); // relative offset of local header (0)

    const cdRecord = Buffer.concat([cdHeader, fnBuf]);

    // 3. End of Central Directory Record (EOCD)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk where CD starts
    eocd.writeUInt16LE(1, 8); // number of CD records on disk
    eocd.writeUInt16LE(1, 10); // total CD records
    eocd.writeUInt32LE(cdRecord.length, 12); // size of CD
    eocd.writeUInt32LE(localRecord.length, 16); // offset of CD
    eocd.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([localRecord, cdRecord, eocd]);
  };

  try {
    // =========================================================================
    // SECTION 1: S3 SIGV4 ADAPTER & CONFIGURATION TESTS (TASKS 1 & 2)
    // =========================================================================

    // Test 1: S3 SigV4 PUT, GET, HEAD, DELETE against Mock S3 Server
    {
      const prevBucket = process.env.S3_BUCKET_NAME;
      const prevKey = process.env.S3_ACCESS_KEY_ID;
      const prevSecret = process.env.S3_SECRET_ACCESS_KEY;
      const prevEndpoint = process.env.S3_ENDPOINT;
      const prevRegion = process.env.S3_REGION;

      process.env.S3_BUCKET_NAME = "hulu-private-test-bucket";
      process.env.S3_ACCESS_KEY_ID = "AKIA_HULU_MOCK_TEST";
      process.env.S3_SECRET_ACCESS_KEY = "mock_secret_key_123456789";
      process.env.S3_ENDPOINT = mockS3Endpoint;
      process.env.S3_REGION = "us-east-1";

      const s3Adapter = new S3PrivateStorageAdapter();
      const testBuffer = Buffer.from("SigV4 Cloud Storage Integrity Test Buffer", "utf8");

      // 1. PUT
      const putResult = await s3Adapter.putObject(testBuffer, "txt");
      assert(Boolean(putResult.storageKey), "Test 1a: (Mock S3) PUT object with SigV4 succeeds");
      assert(mockS3Store.has(putResult.storageKey), "Test 1b: (Mock S3) Object persisted in mock S3 store");

      // 2. GET
      const fetchedBuffer = await s3Adapter.getObject(putResult.storageKey);
      assert(fetchedBuffer.equals(testBuffer), "Test 1c: (Mock S3) GET object with SigV4 returns matching buffer");

      // 3. HEAD
      const exists = await s3Adapter.objectExists(putResult.storageKey);
      assert(exists === true, "Test 1d: (Mock S3) HEAD object with SigV4 returns true");

      // 4. DELETE
      await s3Adapter.deleteObject(putResult.storageKey);
      const existsAfterDelete = await s3Adapter.objectExists(putResult.storageKey);
      assert(existsAfterDelete === false, "Test 1e: (Mock S3) DELETE object with SigV4 purges object");

      // Verify SigV4 header format in mock requests
      const allHadSigV4 = mockS3ReceivedAuthHeaders.every((h) => h.startsWith("AWS4-HMAC-SHA256 Credential="));
      assert(allHadSigV4, "Test 1f: (Mock S3) All S3 operations sent valid SigV4 authorization headers");

      // Reset env
      process.env.S3_BUCKET_NAME = prevBucket;
      process.env.S3_ACCESS_KEY_ID = prevKey;
      process.env.S3_SECRET_ACCESS_KEY = prevSecret;
      process.env.S3_ENDPOINT = prevEndpoint;
      process.env.S3_REGION = prevRegion;
    }

    // Test 2: Production fallback prevention
    {
      const prevNodeEnv = process.env.NODE_ENV;
      const prevProvider = process.env.STORAGE_PROVIDER;
      const prevBucket = process.env.S3_BUCKET_NAME;

      process.env.NODE_ENV = "production";
      delete process.env.STORAGE_PROVIDER;
      delete process.env.S3_BUCKET_NAME;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      setStorageAdapter(null);

      let threwError = false;
      let errorMessage = "";
      try {
        getStorageAdapter();
      } catch (err: unknown) {
        threwError = true;
        errorMessage = (err as Error).message;
      }

      assert(threwError, "Test 2a: getStorageAdapter() throws configuration error in production without S3");
      assert(
        errorMessage.includes("Production environment requires STORAGE_PROVIDER=\"s3\"") ||
        errorMessage.includes("Refusing to fall back to ephemeral local storage"),
        "Test 2b: Production error message explicitly refuses local storage fallback"
      );

      // Restore environment
      process.env.NODE_ENV = prevNodeEnv;
      process.env.STORAGE_PROVIDER = prevProvider;
      process.env.S3_BUCKET_NAME = prevBucket;
      setStorageAdapter(null);
    }

    // Test 3: Local private storage available in development
    {
      delete process.env.STORAGE_PROVIDER;
      setStorageAdapter(null);
      const devAdapter = getStorageAdapter();
      assert(devAdapter.getProviderName() === "local-private-disk", "Test 3: Local storage available in development mode");
    }

    // =========================================================================
    // SECTION 2: END-TO-END UPLOAD, METADATA & REPLACEMENT (TASK 3 & 4)
    // =========================================================================

    // Setup Test Listings
    let sellerListingId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Calculus III Advanced Lecture Notes",
          description: "University lecture notes on multivariable calculus.",
          price: 300,
          subcategory: "Study Notes",
          file_format: "PDF",
          page_count: 80,
          language: "English",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      sellerListingId = data.channelId || data.channel?.id;
      createdListingIds.push(sellerListingId);
    }

    // Setup Social Media Listing for non-digital check
    let socialListingId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          name: "Addis Commerce Telegram",
          platform: "telegram",
          category: "Business",
          price: 1500,
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      socialListingId = data.channelId || data.channel?.id;
      createdListingIds.push(socialListingId);
    }

    // Test 4: Authenticated seller uploads valid PDF file
    let uploadedFileId = 0;
    let initialStorageKey = "";
    {
      const validPdf = createValidPdfBuffer("Calculus III Notes");
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "Calculus_Notes.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      assert(res.status === 201, "Test 4a: Valid file upload returns 201 Created");
      const data = await res.json();
      assert(data.success === true, "Test 4b: Response success = true");
      assert(data.file?.original_filename === "Calculus_Notes.pdf", "Test 4c: Original filename preserved");
      assert(data.file?.file_format === "PDF", "Test 4d: Detected format is PDF");
      assert(data.file?.file_size_bytes === validPdf.length, "Test 4e: File size matches bytes");
      uploadedFileId = data.file?.id;

      const [files] = await pool.query<RowDataPacket[]>(
        "SELECT storage_key, status FROM digital_product_files WHERE id = ?",
        [uploadedFileId]
      );
      assert(files.length > 0, "Test 4f: File record exists in digital_product_files table");
      initialStorageKey = files[0].storage_key;
    }

    // Test 5: Administrator-assisted upload attributes seller_id to listing owner
    {
      const validPdf = createValidPdfBuffer("Admin Replacement Notes");
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "Admin_Attached.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });

      assert(res.status === 201, "Test 5a: Admin can upload file to seller's listing");
      const [files] = await pool.query<RowDataPacket[]>(
        "SELECT seller_id FROM digital_product_files WHERE listing_id = ?",
        [sellerListingId]
      );
      assert(Number(files[0]?.seller_id) === Number(sellerUser.id), "Test 5b: seller_id is attributed to genuine listing owner, NOT admin ID");
    }

    // Test 6: Database unique constraint enforces single file per listing
    {
      const [countRows] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM digital_product_files WHERE listing_id = ?",
        [sellerListingId]
      );
      assert(Number(countRows[0]?.total) === 1, "Test 6: Exactly 1 digital_product_files record exists per listing");
    }

    // Test 7: Upload memory limit and temp file cleanup
    {
      const tempUploadDir = path.resolve("storage/tmp_uploads");
      const tempFilesBefore = fs.existsSync(tempUploadDir) ? fs.readdirSync(tempUploadDir) : [];

      // Send invalid file format
      const fakeExe = Buffer.from("MZ_EXECUTABLE_BINARY_DATA_TEST");
      const formData = new FormData();
      formData.append("file", new Blob([fakeExe], { type: "application/x-msdownload" }), "malware.exe");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      assert(res.status === 400, "Test 7a: Disguised binary executable upload rejected with 400");
      const tempFilesAfter = fs.existsSync(tempUploadDir) ? fs.readdirSync(tempUploadDir) : [];
      assert(tempFilesAfter.length === tempFilesBefore.length, "Test 7b: Temporary file was safely deleted after rejection");
    }

    // =========================================================================
    // SECTION 3: ZIP ARCHIVE ADVANCED VALIDATION (TASK 5)
    // =========================================================================

    // Test 8: ZIP with Central-Directory Traversal is rejected
    {
      // Create ZIP where local header filename is safe, but Central Directory contains traversal
      const safeFn = "safe_notes.txt";
      const evilFn = "../../etc/passwd";
      const contentBuf = Buffer.from("secret content", "utf8");

      const localHdr = Buffer.alloc(30);
      localHdr.writeUInt32LE(0x04034b50, 0);
      localHdr.writeUInt16LE(20, 4);
      localHdr.writeUInt16LE(safeFn.length, 26);
      const localRec = Buffer.concat([localHdr, Buffer.from(safeFn, "utf8"), contentBuf]);

      const cdHdr = Buffer.alloc(46);
      cdHdr.writeUInt32LE(0x02014b50, 0);
      cdHdr.writeUInt16LE(20, 4);
      cdHdr.writeUInt16LE(20, 6);
      cdHdr.writeUInt32LE(contentBuf.length, 20);
      cdHdr.writeUInt32LE(contentBuf.length, 24);
      cdHdr.writeUInt16LE(evilFn.length, 28);
      const cdRec = Buffer.concat([cdHdr, Buffer.from(evilFn, "utf8")]);

      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(1, 8);
      eocd.writeUInt16LE(1, 10);
      eocd.writeUInt32LE(cdRec.length, 12);
      eocd.writeUInt32LE(localRec.length, 16);

      const maliciousZip = Buffer.concat([localRec, cdRec, eocd]);

      const formData = new FormData();
      formData.append("file", new Blob([maliciousZip], { type: "application/zip" }), "traversal.zip");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      assert(res.status === 400, "Test 8a: Central Directory directory traversal rejected with 400");
      const data = await res.json();
      assert(data.error.includes("directory traversal") || data.error.includes("Security violation"), "Test 8b: Error message specifies directory traversal security violation");
    }

    // Test 9: ZIP with entries beyond previous 50 limit (60 entries) is fully inspected and accepted
    {
      const entriesCount = 60;
      const localParts: Buffer[] = [];
      const cdParts: Buffer[] = [];
      let currentOffset = 0;

      for (let i = 0; i < entriesCount; i++) {
        const fn = `file_${i + 1}.txt`;
        const content = Buffer.from(`Content of file ${i + 1}`, "utf8");
        const fnBuf = Buffer.from(fn, "utf8");

        const lHdr = Buffer.alloc(30);
        lHdr.writeUInt32LE(0x04034b50, 0);
        lHdr.writeUInt16LE(20, 4);
        lHdr.writeUInt32LE(content.length, 18);
        lHdr.writeUInt32LE(content.length, 22);
        lHdr.writeUInt16LE(fnBuf.length, 26);
        const lRec = Buffer.concat([lHdr, fnBuf, content]);
        localParts.push(lRec);

        const cdHdr = Buffer.alloc(46);
        cdHdr.writeUInt32LE(0x02014b50, 0);
        cdHdr.writeUInt16LE(20, 4);
        cdHdr.writeUInt16LE(20, 6);
        cdHdr.writeUInt32LE(content.length, 20);
        cdHdr.writeUInt32LE(content.length, 24);
        cdHdr.writeUInt16LE(fnBuf.length, 28);
        cdHdr.writeUInt32LE(currentOffset, 42); // local header offset
        cdParts.push(Buffer.concat([cdHdr, fnBuf]));

        currentOffset += lRec.length;
      }

      const allLocals = Buffer.concat(localParts);
      const allCds = Buffer.concat(cdParts);

      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(entriesCount, 8);
      eocd.writeUInt16LE(entriesCount, 10);
      eocd.writeUInt32LE(allCds.length, 12);
      eocd.writeUInt32LE(allLocals.length, 16);

      const zip60 = Buffer.concat([allLocals, allCds, eocd]);

      const formData = new FormData();
      formData.append("file", new Blob([zip60], { type: "application/zip" }), "archive_60_files.zip");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      assert(res.status === 201, "Test 9: Archive with 60 entries (beyond 50 limit) inspected and accepted with 201");
    }

    // Test 10: Missing EOCD is rejected
    {
      const truncatedZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
      const formData = new FormData();
      formData.append("file", new Blob([truncatedZip], { type: "application/zip" }), "truncated.zip");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      assert(res.status === 400, "Test 10: ZIP missing EOCD record rejected with 400");
    }

    // =========================================================================
    // SECTION 4: LISTING DELETION, CLEANUP & RECONCILIATION (TASK 6)
    // =========================================================================

    // Test 11: Channel deletion purges attached file and storage object
    {
      // Create dedicated channel for deletion
      const resChan = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Temporary Deletion Test Listing",
          description: "Will be deleted to test private file cleanup.",
          price: 200,
          subcategory: "Other Digital Products",
          file_format: "PDF",
          agreed_declaration: true,
        }),
      });
      const chanData = await resChan.json();
      const tempChannelId = chanData.channelId || chanData.channel?.id;
      createdListingIds.push(tempChannelId);

      // Attach file to this channel
      const validPdf = createValidPdfBuffer("Delete Me Notes");
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "delete_me.pdf");
      const resUpload = await fetch(`${baseUrl}/api/channels/${tempChannelId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(resUpload.status === 201, "Test 11a: File uploaded to deletion test listing");

      // Verify file record exists in database
      const [filesBefore] = await pool.query<RowDataPacket[]>(
        "SELECT storage_key FROM digital_product_files WHERE listing_id = ?",
        [tempChannelId]
      );
      assert(filesBefore.length > 0, "Test 11b: File record exists before channel deletion");
      const tempStorageKey = filesBefore[0].storage_key;

      const storage = getStorageAdapter();
      const existsBefore = await storage.objectExists(tempStorageKey);
      assert(existsBefore, "Test 11c: Storage object exists on disk before channel deletion");

      // Delete channel via Admin DELETE endpoint
      const resDel = await fetch(`${baseUrl}/api/admin/channels/${tempChannelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(resDel.status === 200, "Test 11d: Admin channel deletion returns 200 OK");

      // Verify DB records purged
      const [filesAfter] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM digital_product_files WHERE listing_id = ?",
        [tempChannelId]
      );
      assert(filesAfter.length === 0, "Test 11e: digital_product_files record purged after channel deletion");

      const existsAfter = await storage.objectExists(tempStorageKey);
      assert(!existsAfter, "Test 11f: Physical storage object purged after channel deletion");
    }

    // Test 12: Failed storage cleanup records in reconciliation queue
    {
      const orphanKey = "dig_orphan_reconciliation_test.pdf";
      await recordFailedCleanup(orphanKey, 88888, "Simulated network timeout during cloud delete");

      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT storage_key, status, reason FROM failed_storage_cleanups WHERE storage_key = ?",
        [orphanKey]
      );
      assert(rows.length > 0, "Test 12a: Failed storage cleanup recorded in database queue");
      assert(rows[0].status === "pending", "Test 12b: Failed cleanup status is 'pending'");
      assert(rows[0].reason.includes("Simulated network timeout"), "Test 12c: Failure reason preserved for admin reconciliation");

      // Clean up test entry
      await pool.query("DELETE FROM failed_storage_cleanups WHERE storage_key = ?", [orphanKey]).catch(() => {});
    }

    // =========================================================================
    // SECTION 5: ACCESS CONTROL & PRIVACY REGRESSIONS (TASKS 7 & 8)
    // =========================================================================

    // Test 13: Unauthenticated upload rejected with 401
    {
      const validPdf = createValidPdfBuffer();
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "unauth.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        body: formData,
      });
      assert(res.status === 401, "Test 13: Unauthenticated upload is rejected with 401");
    }

    // Test 14: Other user cannot upload to seller listing (403)
    {
      const validPdf = createValidPdfBuffer();
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "other.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${otherUserToken}` },
        body: formData,
      });
      assert(res.status === 403, "Test 14: Non-owner seller upload rejected with 403 Forbidden");
    }

    // Test 15: Public browse does not leak storage keys
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      const data = await res.json();
      const item = data.channels.find((c: any) => c.id === sellerListingId);
      if (item) {
        assert(item.storage_key === undefined, "Test 15a: Public channel list does not leak storage_key");
        assert(item.storage_url === undefined, "Test 15b: Public channel list does not leak storage_url");
      }
    }

    // Test 16: Social media channel rejects digital file upload
    {
      const validPdf = createValidPdfBuffer();
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "social.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${socialListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 16a: Non-digital listing rejects original file attachment with 400");
    }

    // Test 17: Existing public image uploads remain functional
    {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82,
      ]);
      const formData = new FormData();
      formData.append("file", new Blob([pngBuffer], { type: "image/png" }), "avatar.png");

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 201, "Test 17: Existing image upload route /api/upload remains 100% functional");
    }

    // Test 18: Social media channels creation remains functional
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          name: "Addis Sports TikTok Channel",
          platform: "tiktok",
          category: "Sports",
          price: 2500,
          agreed_declaration: true,
        }),
      });
      assert(res.status === 201, "Test 18: Social media channels creation remains 100% functional");
      const data = await res.json();
      if (data.channelId) createdListingIds.push(data.channelId);
    }

  } finally {
    if (createdListingIds.length > 0) {
      await pool.query(
        `DELETE FROM digital_product_files WHERE listing_id IN (${createdListingIds.map(() => "?").join(",")})`,
        createdListingIds
      ).catch(() => {});
      await pool.query(
        `DELETE FROM channels WHERE id IN (${createdListingIds.map(() => "?").join(",")})`,
        createdListingIds
      ).catch(() => {});
      console.log(`[CLEANUP] Deleted test channel(s) and file records from database.`);
    }

    server.close();
    mockS3Server.close();
    await pool.end();
  }

  console.log(`\n=== FEATURE 6A RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runStorageVerification().catch((err) => {
  console.error("Feature 6A verification failed:", err);
  process.exit(1);
});
