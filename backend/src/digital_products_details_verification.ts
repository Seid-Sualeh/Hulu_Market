import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import type { RowDataPacket } from "mysql2/promise";

async function runDetailsVerification() {
  console.log("=== HULU MARKET FEATURE 5: PRODUCT DETAILS & PREVIEW VERIFICATION ===");
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

  // Find seller user and admin user
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
  const adminToken = jwt.sign(
    { userId: adminUser.id, id: adminUser.id, email: adminUser.email, role: "admin" },
    jwtSecret,
    { expiresIn: "1h" }
  );
  const otherUserToken = jwt.sign(
    { userId: otherUser.id, id: otherUser.id, email: otherUser.email, role: "user" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const createdListingIds: number[] = [];

  try {
    // 1. Create and Approve a Digital Product
    let approvedProductId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Comprehensive Ethiopian Civil Code Guide",
          description: "Full reference guide covering Ethiopian contract and property law.",
          price: 450,
          subcategory: "Guides",
          file_format: "PDF",
          page_count: 210,
          language: "Amharic",
          contact_phone: "+251911998877",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      approvedProductId = data.channelId || data.channel?.id;
      createdListingIds.push(approvedProductId);

      // Approve listing
      await fetch(`${baseUrl}/api/admin/channels/${approvedProductId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // 2. Create a Pending (unmoderated) Digital Product
    let pendingProductId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Unmoderated Accounting Spreadsheet",
          description: "Under review pending admin moderation.",
          price: 150,
          subcategory: "Templates",
          file_format: "ZIP",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      pendingProductId = data.channelId || data.channel?.id;
      createdListingIds.push(pendingProductId);
    }

    // 3. Create a Rejected Digital Product
    let rejectedProductId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Rejected Medical Textbook Scan",
          description: "Unauthorized distribution of copyrighted materials.",
          price: 80,
          subcategory: "Ebooks",
          file_format: "PDF",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      rejectedProductId = data.channelId || data.channel?.id;
      createdListingIds.push(rejectedProductId);

      // Reject listing
      await fetch(`${baseUrl}/api/admin/channels/${rejectedProductId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: "Publisher copyright violation." }),
      });
    }

    // --- TEST 1: Public fetch of approved digital product details ---
    {
      const res = await fetch(`${baseUrl}/api/channels/${approvedProductId}`);
      assert(res.status === 200, "Test 1a: Public GET /api/channels/:id returns 200 for approved product");
      const data = await res.json();
      assert(data.success === true, "Test 1b: Response success = true");
      assert(data.channel?.id === approvedProductId, "Test 1c: Returned channel ID matches");
      assert(data.channel?.title === "Comprehensive Ethiopian Civil Code Guide", "Test 1d: Title matches");
      assert(data.channel?.subcategory === "Guides", "Test 1e: Subcategory matches");
      assert(data.channel?.file_format === "PDF", "Test 1f: File format matches");
      assert(Number(data.channel?.price) === 450, "Test 1g: Price matches");
      assert(data.channel?.page_count === 210, "Test 1h: Page count matches");
      assert(data.channel?.language === "Amharic", "Test 1i: Language matches");
    }

    // --- TEST 2: Data privacy in public details response ---
    {
      const res = await fetch(`${baseUrl}/api/channels/${approvedProductId}`);
      const data = await res.json();
      assert(data.channel.rejection_reason === undefined, "Test 2a: Private rejection_reason is excluded");
      assert(data.channel.reviewed_by === undefined, "Test 2b: Private reviewed_by is excluded");
      assert(data.channel.reviewed_at === undefined, "Test 2c: Private reviewed_at is excluded");
      assert(data.channel.seller_phone === undefined, "Test 2d: Private seller_phone is excluded");
    }

    // --- TEST 3: Invalid product IDs return 400 Bad Request ---
    {
      const resNonNumeric = await fetch(`${baseUrl}/api/channels/invalid-id-abc`);
      assert(resNonNumeric.status === 400, "Test 3a: Non-numeric ID returns 400 Bad Request");

      const resNegative = await fetch(`${baseUrl}/api/channels/-10`);
      assert(resNegative.status === 400, "Test 3b: Negative ID returns 400 Bad Request");

      const resZero = await fetch(`${baseUrl}/api/channels/0`);
      assert(resZero.status === 400, "Test 3c: Zero ID returns 400 Bad Request");
    }

    // --- TEST 4: Non-existent product ID returns 404 Not Found ---
    {
      const res = await fetch(`${baseUrl}/api/channels/9999999`);
      assert(res.status === 404, "Test 4: Non-existent product ID returns 404 Not Found");
    }

    // --- TEST 5: Public visitors cannot access pending (unmoderated) listings ---
    {
      const res = await fetch(`${baseUrl}/api/channels/${pendingProductId}`);
      assert(res.status === 404, "Test 5a: Unauthenticated GET for pending product returns 404 Not Found");

      const resOtherUser = await fetch(`${baseUrl}/api/channels/${pendingProductId}`, {
        headers: { Authorization: `Bearer ${otherUserToken}` },
      });
      assert(resOtherUser.status === 404, "Test 5b: Unrelated authenticated user GET for pending product returns 404");
    }

    // --- TEST 6: Public visitors cannot access rejected listings ---
    {
      const res = await fetch(`${baseUrl}/api/channels/${rejectedProductId}`);
      assert(res.status === 404, "Test 6a: Unauthenticated GET for rejected product returns 404 Not Found");

      const resOtherUser = await fetch(`${baseUrl}/api/channels/${rejectedProductId}`, {
        headers: { Authorization: `Bearer ${otherUserToken}` },
      });
      assert(resOtherUser.status === 404, "Test 6b: Unrelated user GET for rejected product returns 404");
    }

    // --- TEST 7: Authenticated seller can view their own pending listing ---
    {
      const res = await fetch(`${baseUrl}/api/channels/${pendingProductId}`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
      });
      assert(res.status === 200, "Test 7: Authenticated seller owner can inspect their own pending listing");
    }

    // --- TEST 8: Authenticated admin can view pending listing ---
    {
      const res = await fetch(`${baseUrl}/api/channels/${pendingProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, "Test 8: Authenticated administrator can inspect pending listing");
    }

  } finally {
    if (createdListingIds.length > 0) {
      await pool.query(
        `DELETE FROM channels WHERE id IN (${createdListingIds.map(() => "?").join(",")})`,
        createdListingIds
      );
      console.log(`[CLEANUP] Deleted ${createdListingIds.length} test channel(s) from database.`);
    }

    server.close();
    await pool.end();
  }

  console.log(`\n=== FEATURE 5 RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDetailsVerification().catch((err) => {
  console.error("Feature 5 verification suite failed:", err);
  process.exit(1);
});
