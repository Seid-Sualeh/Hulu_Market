import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import { getStorageAdapter, setStorageAdapter } from "./services/storage.js";
import type { RowDataPacket } from "mysql2/promise";

async function runStorageVerification() {
  console.log("=== HULU MARKET FEATURE 6: SECURE FILE UPLOAD & STORAGE VERIFICATION ===");
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

  // Helper to create a valid minimal ZIP buffer (Local File Header)
  const createValidZipBuffer = (filename: string = "document.txt") => {
    const filenameBuf = Buffer.from(filename, "utf8");
    const contentBuf = Buffer.from("Hulu Market Verified Digital Asset", "utf8");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    header.writeUInt16LE(20, 4); // min version
    header.writeUInt16LE(0, 6); // flags
    header.writeUInt16LE(0, 8); // compression = stored
    header.writeUInt16LE(0, 10); // mod time
    header.writeUInt16LE(0, 12); // mod date
    header.writeUInt32LE(0, 14); // crc32
    header.writeUInt32LE(contentBuf.length, 18); // comp size
    header.writeUInt32LE(contentBuf.length, 22); // uncomp size
    header.writeUInt16LE(filenameBuf.length, 26); // name length
    header.writeUInt16LE(0, 28); // extra length
    return Buffer.concat([header, filenameBuf, contentBuf]);
  };

  try {
    // 1. Setup Test Listings
    // Listing 1: Digital product owned by sellerUser
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

    // Listing 2: Social media listing owned by sellerUser
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

    // --- TEST 1: Authenticated seller uploads a valid file to their own listing ---
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

      assert(res.status === 201, "Test 1a: Valid file upload returns 201 Created");
      const data = await res.json();
      assert(data.success === true, "Test 1b: Response success = true");
      assert(data.file?.original_filename === "Calculus_Notes.pdf", "Test 1c: Original filename preserved");
      assert(data.file?.file_format === "PDF", "Test 1d: Detected format is PDF");
      assert(data.file?.file_size_bytes === validPdf.length, "Test 1e: File size matches bytes");
      assert(Boolean(data.file?.checksum_sha256), "Test 1f: Cryptographic SHA-256 checksum generated");
      uploadedFileId = data.file?.id;

      // Verify in database
      const [files] = await pool.query<RowDataPacket[]>(
        "SELECT storage_key, checksum_sha256, status FROM digital_product_files WHERE id = ?",
        [uploadedFileId]
      );
      assert(files.length > 0, "Test 1g: File record exists in digital_product_files table");
      assert(files[0].status === "uploaded", "Test 1h: File status is 'uploaded'");
      initialStorageKey = files[0].storage_key;
    }

    // --- TEST 2: Unauthenticated upload is rejected with 401 ---
    {
      const validPdf = createValidPdfBuffer();
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "test.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        body: formData,
      });
      assert(res.status === 401, "Test 2: Unauthenticated upload is strictly rejected with 401");
    }

    // --- TEST 3: Seller cannot upload to another seller's listing (403 Forbidden) ---
    {
      const validPdf = createValidPdfBuffer();
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "test.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${otherUserToken}` },
        body: formData,
      });
      assert(res.status === 403, "Test 3: Non-owner upload attempt is strictly rejected with 403 Forbidden");
    }

    // --- TEST 4: Seller cannot upload to a social-media listing (400 Bad Request) ---
    {
      const validPdf = createValidPdfBuffer();
      const formData = new FormData();
      formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "test.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${socialListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 4: Digital file upload to social media listing is rejected with 400");
    }

    // --- TEST 5: Unsupported extensions are rejected ---
    {
      const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00FakeExePayload");
      const formData = new FormData();
      formData.append("file", new Blob([exeBuffer], { type: "application/x-msdownload" }), "malware.exe");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 5: Dangerous executable extension .exe is rejected with 400");
    }

    // --- TEST 6: Dangerous MIME mismatch is rejected ---
    {
      const textBuffer = Buffer.from("Normal text document");
      const formData = new FormData();
      formData.append("file", new Blob([textBuffer], { type: "application/javascript" }), "document.txt");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 6: JavaScript script MIME type rejected with 400");
    }

    // --- TEST 7: Invalid file signatures (disguised files) are rejected ---
    {
      // Renamed executable pretending to be PDF
      const disguisedExe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00BinaryExeSignatureDisguisedAsPdf");
      const formData = new FormData();
      formData.append("file", new Blob([disguisedExe], { type: "application/pdf" }), "invoice.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 7: Executable disguised as PDF fails magic bytes check and is rejected with 400");
    }

    // --- TEST 8: Empty files (0 bytes) are rejected ---
    {
      const emptyBuffer = Buffer.alloc(0);
      const formData = new FormData();
      formData.append("file", new Blob([emptyBuffer], { type: "application/pdf" }), "empty.pdf");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 8: Empty file (0 bytes) is rejected with 400");
    }

    // --- TEST 9: Oversized files are rejected ---
    {
      // Set limit temporarily or test large buffer
      const prevEnv = process.env.MAX_DIGITAL_FILE_SIZE_MB;
      process.env.MAX_DIGITAL_FILE_SIZE_MB = "1"; // 1MB for test
      try {
        const largeBuffer = Buffer.alloc(2 * 1024 * 1024, "A"); // 2MB
        const formData = new FormData();
        formData.append("file", new Blob([largeBuffer], { type: "text/plain" }), "large.txt");

        const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sellerToken}` },
          body: formData,
        });
        assert(res.status === 400, "Test 9: File exceeding maximum size is rejected with 400");
      } finally {
        process.env.MAX_DIGITAL_FILE_SIZE_MB = prevEnv;
      }
    }

    // --- TEST 10: Malformed documents (Zip Slip directory traversal) are rejected ---
    {
      // Create ZIP with directory traversal path in local header
      const zipSlipBuffer = createValidZipBuffer("../../etc/passwd");
      const formData = new FormData();
      formData.append("file", new Blob([zipSlipBuffer], { type: "application/zip" }), "exploit.zip");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 400, "Test 10: Malformed ZIP with directory traversal is detected and rejected with 400");
    }

    // --- TEST 11: Storage failure does not create false successful database record ---
    {
      const originalStorage = getStorageAdapter();
      // Inject failing mock adapter
      setStorageAdapter({
        getProviderName: () => "failing-mock",
        putObject: async () => { throw new Error("Simulated S3 outage"); },
        getObject: async () => Buffer.alloc(0),
        deleteObject: async () => {},
        objectExists: async () => false,
      });

      try {
        const validPdf = createValidPdfBuffer();
        const formData = new FormData();
        formData.append("file", new Blob([validPdf], { type: "application/pdf" }), "fail.pdf");

        const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sellerToken}` },
          body: formData,
        });
        assert(res.status === 500, "Test 11a: Storage failure returns 500 server error");
        const data = await res.json();
        assert(data.success === false, "Test 11b: Storage failure does not report success");
      } finally {
        setStorageAdapter(originalStorage);
      }
    }

    // --- TEST 12: Storage keys are random and server-generated ---
    {
      const [files] = await pool.query<RowDataPacket[]>(
        "SELECT storage_key FROM digital_product_files WHERE id = ?",
        [uploadedFileId]
      );
      const key = files[0]?.storage_key || "";
      assert(key.startsWith("dig_"), "Test 12a: Storage key starts with random prefix 'dig_'");
      assert(!key.includes("Calculus_Notes"), "Test 12b: Storage key does NOT leak original client filename");
      assert(key.length >= 30, "Test 12c: Storage key contains sufficient cryptographic entropy");
    }

    // --- TEST 13: Replacement does not delete the previous valid file prematurely ---
    {
      const storage = getStorageAdapter();
      const initialKeyExistsBefore = await storage.objectExists(initialStorageKey);
      assert(initialKeyExistsBefore, "Test 13a: Initial storage object exists before replacement");

      // Upload replacement file (ZIP format)
      const validZip = createValidZipBuffer("lecture_audio.txt");
      const formData = new FormData();
      formData.append("file", new Blob([validZip], { type: "application/zip" }), "Updated_Notes.zip");

      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });
      assert(res.status === 201, "Test 13b: Replacement file upload succeeds with 201");
      const data = await res.json();
      assert(data.file?.file_format === "ZIP", "Test 13c: Replaced file format updated to ZIP");

      // Verify old key was cleaned up after successful replacement commit
      const [newFiles] = await pool.query<RowDataPacket[]>(
        "SELECT storage_key FROM digital_product_files WHERE listing_id = ?",
        [sellerListingId]
      );
      const newKey = newFiles[0]?.storage_key;
      assert(newKey !== initialStorageKey, "Test 13d: New storage key generated for replacement");
      const oldKeyExistsAfter = await storage.objectExists(initialStorageKey);
      assert(!oldKeyExistsAfter, "Test 13e: Old storage key cleaned up after successful commit");
    }

    // --- TEST 14: Public API responses never expose private storage keys or URLs ---
    {
      // 1. Check public browse endpoint GET /api/channels
      const resPublicList = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      const dataList = await resPublicList.json();
      const itemInList = dataList.channels.find((c: any) => c.id === sellerListingId);
      if (itemInList) {
        assert(itemInList.storage_key === undefined, "Test 14a: Public listing browse excludes storage_key");
        assert(itemInList.storage_url === undefined, "Test 14b: Public listing browse excludes storage_url");
      }

      // 2. Check public details endpoint GET /api/channels/:id
      // Approve listing first to view publicly
      await fetch(`${baseUrl}/api/admin/channels/${sellerListingId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const resPublicDetails = await fetch(`${baseUrl}/api/channels/${sellerListingId}`);
      const dataDetails = await resPublicDetails.json();
      assert(dataDetails.channel?.storage_key === undefined, "Test 14c: Public details excludes storage_key");
      assert(dataDetails.channel?.storage_url === undefined, "Test 14d: Public details excludes storage_url");
      assert(dataDetails.channel?.rejection_reason === undefined, "Test 14e: Public details excludes rejection_reason");
    }

    // --- TEST 15: Seller can retrieve metadata via GET /api/channels/:id/file ---
    {
      const res = await fetch(`${baseUrl}/api/channels/${sellerListingId}/file`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
      });
      assert(res.status === 200, "Test 15a: Seller GET /api/channels/:id/file returns 200");
      const data = await res.json();
      assert(data.file?.original_filename === "Updated_Notes.zip", "Test 15b: Returns verified original filename");
      assert(data.file?.file_format === "ZIP", "Test 15c: Returns file format");
      assert(data.file?.storage_key === undefined, "Test 15d: Seller metadata response does NOT leak internal storage_key");
    }

    // --- TEST 16: Existing public image uploads remain functional ---
    {
      // Valid small PNG: 89 50 4E 47 0D 0A 1A 0A
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
      assert(res.status === 201, "Test 16: Existing image upload route /api/upload remains 100% functional");
    }

    // --- TEST 17: Existing social media channels creation remains functional ---
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
      assert(res.status === 201, "Test 17: Social media channels creation remains 100% functional");
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
    await pool.end();
  }

  console.log(`\n=== FEATURE 6 RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runStorageVerification().catch((err) => {
  console.error("Feature 6 verification failed:", err);
  process.exit(1);
});
