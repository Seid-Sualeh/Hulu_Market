import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

async function runAdminModerationVerification() {
  console.log("=== HULU MARKET FEATURE 3: ADMIN REVIEW & APPROVAL VERIFICATION SUITE ===");
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

  // Set up test server
  const app = createApp("https://hulu-market.vercel.app");
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Find or verify existing users for test tokens
  let regularUserId = 2;
  let regularUserEmail = "sualehseid@gmail.com";
  let adminUserId = 4;
  let adminUserEmail = "admin@hulumarket.com";
  let secondUserId = 3;
  let secondUserEmail = "mohammed@gmail.com";

  // Check actual users in DB
  const [dbUsers] = await pool.query<RowDataPacket[]>(
    "SELECT id, email, role FROM users ORDER BY id ASC"
  );
  const foundAdmin = dbUsers.find((u) => u.role === "admin");
  const regularUsers = dbUsers.filter((u) => u.role !== "admin");

  if (foundAdmin) {
    adminUserId = Number(foundAdmin.id);
    adminUserEmail = String(foundAdmin.email);
  }
  if (regularUsers.length > 0) {
    regularUserId = Number(regularUsers[0].id);
    regularUserEmail = String(regularUsers[0].email);
  }
  if (regularUsers.length > 1) {
    secondUserId = Number(regularUsers[1].id);
    secondUserEmail = String(regularUsers[1].email);
  }

  const jwtSecret = getJwtSecret();
  const regularUserToken = jwt.sign(
    { userId: regularUserId, id: regularUserId, email: regularUserEmail, role: "user" },
    jwtSecret,
    { expiresIn: "1h" }
  );
  const adminToken = jwt.sign(
    { userId: adminUserId, id: adminUserId, email: adminUserEmail, role: "admin" },
    jwtSecret,
    { expiresIn: "1h" }
  );
  const secondUserToken = jwt.sign(
    { userId: secondUserId, id: secondUserId, email: secondUserEmail, role: "user" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const createdListingIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // GROUP 1: AUTHENTICATION & RBAC ENFORCEMENT ON ADMIN ENDPOINTS
    // -------------------------------------------------------------
    // Test 1: Unauthenticated GET /api/admin/channels returns 401
    {
      const res = await fetch(`${baseUrl}/api/admin/channels`);
      assert(res.status === 401, "Test 1: Unauthenticated GET /api/admin/channels returns 401");
    }

    // Test 2: Unauthenticated POST /api/admin/channels/:id/approve returns 401
    {
      const res = await fetch(`${baseUrl}/api/admin/channels/9999/approve`, {
        method: "POST",
      });
      assert(res.status === 401, "Test 2: Unauthenticated POST /api/admin/channels/:id/approve returns 401");
    }

    // Test 3: Unauthenticated POST /api/admin/channels/:id/reject returns 401
    {
      const res = await fetch(`${baseUrl}/api/admin/channels/9999/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Violation of rules" }),
      });
      assert(res.status === 401, "Test 3: Unauthenticated POST /api/admin/channels/:id/reject returns 401");
    }

    // Test 4: Regular authenticated user (non-admin) calling GET /api/admin/channels returns 403
    {
      const res = await fetch(`${baseUrl}/api/admin/channels`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      assert(res.status === 403, "Test 4: Non-admin user calling GET /api/admin/channels is denied with 403");
    }

    // Test 5: Regular authenticated user calling POST /api/admin/channels/:id/approve returns 403
    {
      const res = await fetch(`${baseUrl}/api/admin/channels/9999/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      assert(res.status === 403, "Test 5: Non-admin user calling POST /api/admin/channels/:id/approve is denied with 403");
    }

    // Test 6: Forged headers or body attempting role elevation cannot bypass RBAC
    {
      const res = await fetch(`${baseUrl}/api/admin/channels`, {
        headers: {
          Authorization: `Bearer ${regularUserToken}`,
          "x-user-role": "admin",
          "x-admin": "true",
        },
      });
      assert(res.status === 403, "Test 6: Forged x-user-role/admin headers with user token strictly returns 403");
    }

    // -------------------------------------------------------------
    // GROUP 2: LISTING CREATION WITH MANDATORY DECLARATION
    // -------------------------------------------------------------
    // Test 7: Digital product submission without agreed_declaration is rejected (400)
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularUserToken}`,
        },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Declaration Test Book",
          description: "Testing declaration requirement enforcement",
          price: 250,
          subcategory: "Ebooks",
          file_format: "PDF",
          agreed_declaration: false,
        }),
      });
      assert(res.status === 400, "Test 7: Digital product submission without declaration is rejected with 400");
    }

    // Test 8: Valid digital product submission with agreed_declaration = true creates pending listing
    let testListingId1 = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularUserToken}`,
        },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Complete Python Mastery Course Notes",
          description: "Full guide with Python exercises, cheat sheets, and examples.",
          price: 350,
          subcategory: "Study Notes",
          file_format: "PDF",
          page_count: 140,
          language: "English",
          contact_phone: "+251911223344",
          agreed_declaration: true,
        }),
      });
      assert(res.status === 201, "Test 8a: Valid digital product created with 201 Created");
      const data = await res.json();
      testListingId1 = data.channelId || data.channel?.id;
      assert(Boolean(testListingId1), "Test 8b: Created channel has valid numeric ID");
      if (testListingId1) createdListingIds.push(testListingId1);

      // Verify DB record
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT status, listing_type, agreed_declaration, declared_at, digital_metadata FROM channels WHERE id = ?",
        [testListingId1]
      );
      assert(rows.length > 0, "Test 8c: Channel record exists in database");
      assert(rows[0].status === "pending", "Test 8d: Listing is initialised with status = 'pending'");
      assert(rows[0].listing_type === "ebooks-digital", "Test 8e: listing_type is 'ebooks-digital'");
      assert(Boolean(rows[0].agreed_declaration), "Test 8f: agreed_declaration is persisted as TRUE");
      assert(Boolean(rows[0].declared_at), "Test 8g: declared_at timestamp is populated");
    }

    // Test 9: Pending digital product is strictly HIDDEN from public marketplace
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      assert(res.status === 200, "Test 9a: Public GET /api/channels succeeds");
      const data = await res.json();
      const foundInPublic = data.channels?.some((c: any) => c.id === testListingId1);
      assert(!foundInPublic, "Test 9b: Pending listing is strictly excluded from public marketplace browse");
    }

    // -------------------------------------------------------------
    // GROUP 3: ADMIN QUERYING & METADATA PRESENTATION
    // -------------------------------------------------------------
    // Test 10: Admin GET /api/admin/channels includes digital product metadata and seller details
    {
      const res = await fetch(`${baseUrl}/api/admin/channels?listing_type=ebooks-digital&status=pending`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, "Test 10a: Admin GET /api/admin/channels with filters returns 200");
      const data = await res.json();
      const listing = data.channels?.find((c: any) => c.id === testListingId1);
      assert(Boolean(listing), "Test 10b: Admin can find pending digital product");
      assert(listing.title === "Complete Python Mastery Course Notes", "Test 10c: Metadata title is present");
      assert(listing.subcategory === "Study Notes", "Test 10d: Subcategory is present");
      assert(listing.file_format === "PDF", "Test 10e: File format is present");
      assert(Number(listing.page_count) === 140, "Test 10f: Page count is present");
      assert(listing.language === "English", "Test 10g: Language is present");
      assert(Boolean(listing.seller_email), "Test 10h: Joined seller email is present");
      assert(Boolean(listing.agreed_declaration), "Test 10i: Declaration acceptance status is present");
    }

    // -------------------------------------------------------------
    // GROUP 4: ATOMIC APPROVAL WORKFLOW
    // -------------------------------------------------------------
    // Test 11: Admin approves pending listing
    {
      const res = await fetch(`${baseUrl}/api/admin/channels/${testListingId1}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, "Test 11a: Admin POST /api/admin/channels/:id/approve returns 200");
      const data = await res.json();
      assert(data.success === true, "Test 11b: Response success = true");

      // Verify database update
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT status, reviewed_by, reviewed_at, rejection_reason FROM channels WHERE id = ?",
        [testListingId1]
      );
      assert(rows[0].status === "active", "Test 11c: Status is atomically updated to 'active'");
      assert(Number(rows[0].reviewed_by) === adminUserId, "Test 11d: reviewed_by is set to admin user ID");
      assert(Boolean(rows[0].reviewed_at), "Test 11e: reviewed_at timestamp is set");
      assert(rows[0].rejection_reason === null, "Test 11f: rejection_reason is NULL");
    }

    // Test 12: Approved listing is now visible in public marketplace
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      const data = await res.json();
      const foundInPublic = data.channels?.some((c: any) => c.id === testListingId1);
      assert(foundInPublic, "Test 12: Approved listing is now visible in public marketplace browse");
    }

    // Test 13: Attempting to approve an already approved listing returns 400
    {
      const res = await fetch(`${baseUrl}/api/admin/channels/${testListingId1}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 400, "Test 13: Repeated approval on active listing is rejected with 400");
    }

    // -------------------------------------------------------------
    // GROUP 5: REJECTION WORKFLOW & VALIDATION
    // -------------------------------------------------------------
    // Create a second pending listing for rejection testing
    let testListingId2 = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularUserToken}`,
        },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Copyright Infringing Scanned Textbook",
          description: "Scanned pages of unauthorized commercial textbook.",
          price: 50,
          subcategory: "Educational Documents",
          file_format: "PDF",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      testListingId2 = data.channelId || data.channel?.id;
      if (testListingId2) createdListingIds.push(testListingId2);
    }

    // Test 14: Rejection without reason returns 400 Bad Request
    {
      const res = await fetch(`${baseUrl}/api/admin/channels/${testListingId2}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: "" }),
      });
      assert(res.status === 400, "Test 14a: Rejection with empty reason is rejected with 400");

      const resWhitespace = await fetch(`${baseUrl}/api/admin/channels/${testListingId2}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: "   " }),
      });
      assert(resWhitespace.status === 400, "Test 14b: Rejection with whitespace-only reason is rejected with 400");
    }

    // Test 15: Rejection with valid reason updates status to 'rejected'
    const rejectionReasonText = "Material violates publisher copyright and authorization requirements.";
    {
      const res = await fetch(`${baseUrl}/api/admin/channels/${testListingId2}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: rejectionReasonText }),
      });
      assert(res.status === 200, "Test 15a: Admin rejection with valid reason returns 200");

      // Verify database
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT status, rejection_reason, reviewed_by, reviewed_at FROM channels WHERE id = ?",
        [testListingId2]
      );
      assert(rows[0].status === "rejected", "Test 15b: Status is atomically updated to 'rejected'");
      assert(rows[0].rejection_reason === rejectionReasonText, "Test 15c: Rejection reason matches exactly");
      assert(Number(rows[0].reviewed_by) === adminUserId, "Test 15d: reviewed_by is recorded");
      assert(Boolean(rows[0].reviewed_at), "Test 15e: reviewed_at timestamp is recorded");
    }

    // Test 16: Rejected listing is HIDDEN from public marketplace
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      const data = await res.json();
      const foundInPublic = data.channels?.some((c: any) => c.id === testListingId2);
      assert(!foundInPublic, "Test 16: Rejected listing is strictly excluded from public marketplace");
    }

    // -------------------------------------------------------------
    // GROUP 6: SELLER VISIBILITY & RESUBMISSION
    // -------------------------------------------------------------
    // Test 17: Seller can view rejection reason in GET /api/channels/my
    {
      const res = await fetch(`${baseUrl}/api/channels/my`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      assert(res.status === 200, "Test 17a: Seller GET /api/channels/my returns 200");
      const data = await res.json();
      const myListing = data.channels?.find((c: any) => c.id === testListingId2);
      assert(Boolean(myListing), "Test 17b: Seller sees their rejected listing");
      assert(myListing.status === "rejected", "Test 17c: Seller sees status = 'rejected'");
      assert(myListing.rejection_reason === rejectionReasonText, "Test 17d: Seller sees rejection reason");
    }

    // Test 18: Non-owner cannot resubmit listing (unauthorized)
    {
      const res = await fetch(`${baseUrl}/api/channels/${testListingId2}/resubmit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secondUserToken}`,
        },
        body: JSON.stringify({
          title: "Hijacked Title Update",
          description: "Should fail authorization",
          price: 99,
        }),
      });
      assert(res.status === 403 || res.status === 404, "Test 18: Non-owner cannot resubmit another user's listing");
    }

    // Test 19: Seller resubmits listing with corrections
    {
      const res = await fetch(`${baseUrl}/api/channels/${testListingId2}/resubmit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularUserToken}`,
        },
        body: JSON.stringify({
          title: "Authorized Original Self-Penned Study Guide",
          description: "Author's original work with full distribution rights.",
          price: 80,
          subcategory: "Study Notes",
          file_format: "PDF",
        }),
      });
      assert(res.status === 200, "Test 19a: Seller PATCH /api/channels/:id/resubmit returns 200");

      // Verify database reset
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT status, name, rejection_reason, reviewed_by, reviewed_at FROM channels WHERE id = ?",
        [testListingId2]
      );
      assert(rows[0].status === "pending", "Test 19b: Resubmission resets status to 'pending'");
      assert(rows[0].rejection_reason === null, "Test 19c: Resubmission clears rejection_reason to NULL");
      assert(rows[0].reviewed_by === null, "Test 19d: Resubmission clears reviewed_by to NULL");
      assert(rows[0].reviewed_at === null, "Test 19e: Resubmission clears reviewed_at to NULL");
      assert(rows[0].name === "Authorized Original Self-Penned Study Guide", "Test 19f: Updated title persisted in name column");
    }

    // -------------------------------------------------------------
    // GROUP 7: SOCIAL MEDIA MODERATION BACKWARDS COMPATIBILITY
    // -------------------------------------------------------------
    // Test 20: Existing social media listings can still be created, reviewed, and approved
    let socialListingId = 0;
    {
      // Create social media listing
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularUserToken}`,
        },
        body: JSON.stringify({
          name: "Addis Tech News Channel",
          platform: "telegram",
          handle: "addistech_news",
          subscribers: 15000,
          monthly_income: 2000,
          price: 5000,
          category: "Technology",
          description: "Active Telegram tech news channel.",
          contact_phone: "+251911000111",
          agreed_declaration: true,
        }),
      });
      assert(res.status === 201, "Test 20a: Social media channel created with 201");
      const data = await res.json();
      socialListingId = data.channelId || data.channel?.id;
      if (socialListingId) createdListingIds.push(socialListingId);

      // Verify status is pending
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT status, listing_type, platform FROM channels WHERE id = ?",
        [socialListingId]
      );
      assert(rows[0].status === "pending", "Test 20b: Social media listing is 'pending'");
      assert(rows[0].platform === "telegram", "Test 20c: Social media platform is 'telegram'");

      // Admin approves social media listing
      const approveRes = await fetch(`${baseUrl}/api/admin/channels/${socialListingId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(approveRes.status === 200, "Test 20d: Admin can approve social media channel");

      const [approvedRows] = await pool.query<RowDataPacket[]>(
        "SELECT status, reviewed_by, reviewed_at FROM channels WHERE id = ?",
        [socialListingId]
      );
      assert(approvedRows[0].status === "active", "Test 20e: Social media channel status becomes 'active'");
      assert(Number(approvedRows[0].reviewed_by) === adminUserId, "Test 20f: Social media review audit recorded");
    }

  } finally {
    // Clean up created test channels from database to prevent pollution
    if (createdListingIds.length > 0) {
      try {
        await pool.query(
          `DELETE FROM channels WHERE id IN (${createdListingIds.map(() => "?").join(",")})`,
          createdListingIds
        );
        console.log(`[CLEANUP] Deleted ${createdListingIds.length} test channel(s) from database.`);
      } catch (err) {
        console.warn("[CLEANUP WARNING] Could not clean up test channels:", err);
      }
    }

    server.close();
    await pool.end();
  }

  console.log(`\n=== FEATURE 3 RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdminModerationVerification().catch((err) => {
  console.error("Feature 3 verification suite failed:", err);
  process.exit(1);
});
