import http from "http";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { pool } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";
import type { RowDataPacket } from "mysql2/promise";

async function runMarketplaceVerification() {
  console.log("=== HULU MARKET FEATURE 4: DIGITAL PRODUCTS MARKETPLACE API VERIFICATION ===");
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

  // Find a seller user and an admin user
  const [dbUsers] = await pool.query<RowDataPacket[]>(
    "SELECT id, email, role FROM users ORDER BY id ASC"
  );
  const adminUser = dbUsers.find((u) => u.role === "admin") || { id: 4, email: "admin@hulumarket.com" };
  const sellerUser = dbUsers.find((u) => u.role !== "admin") || { id: 2, email: "sualehseid@gmail.com" };

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

  const createdListingIds: number[] = [];

  try {
    // Setup test items:
    // Item A: Ebook, PDF, price 200, title "Advanced Mathematics Guide for University Students"
    // Item B: Template, ZIP, price 500, title "Financial Accounting Spreadsheet Model"
    // Item C: Study Notes, DOCX, price 100, title "Grade 12 Biology Comprehensive Summary"
    // Item D: Rejected item: title "Copyrighted Physics Book"
    // Item E: Pending item: title "Pending Unmoderated Chemistry Notes"

    // 1. Create Item A (Approved)
    let itemAId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Advanced Mathematics Guide for University Students",
          description: "Rigorous calculus and linear algebra textbook with worked exercises.",
          price: 200,
          subcategory: "Ebooks",
          file_format: "PDF",
          page_count: 320,
          language: "English",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      itemAId = data.channelId || data.channel?.id;
      createdListingIds.push(itemAId);
      // Admin approve
      await fetch(`${baseUrl}/api/admin/channels/${itemAId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // 2. Create Item B (Approved)
    let itemBId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Financial Accounting Spreadsheet Model",
          description: "Fully automated cash flow forecasting and balance sheet model.",
          price: 500,
          subcategory: "Templates",
          file_format: "ZIP",
          language: "English",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      itemBId = data.channelId || data.channel?.id;
      createdListingIds.push(itemBId);
      // Admin approve
      await fetch(`${baseUrl}/api/admin/channels/${itemBId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // 3. Create Item C (Approved)
    let itemCId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Grade 12 Biology Comprehensive Summary",
          description: "Cell biology, genetics, and ecology exam preparation review notes.",
          price: 100,
          subcategory: "Study Notes",
          file_format: "DOCX",
          page_count: 95,
          language: "Amharic",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      itemCId = data.channelId || data.channel?.id;
      createdListingIds.push(itemCId);
      // Admin approve
      await fetch(`${baseUrl}/api/admin/channels/${itemCId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // 4. Create Item D (Rejected)
    let itemDId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Copyrighted Physics Book",
          description: "Unauthorized copyrighted reprint.",
          price: 50,
          subcategory: "Ebooks",
          file_format: "PDF",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      itemDId = data.channelId || data.channel?.id;
      createdListingIds.push(itemDId);
      // Admin reject
      await fetch(`${baseUrl}/api/admin/channels/${itemDId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: "Direct copyright violation of publisher textbook." }),
      });
    }

    // 5. Create Item E (Pending - unmoderated)
    let itemEId = 0;
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Pending Unmoderated Chemistry Notes",
          description: "Organic reactions summary waiting for review.",
          price: 150,
          subcategory: "Study Notes",
          file_format: "PDF",
          agreed_declaration: true,
        }),
      });
      const data = await res.json();
      itemEId = data.channelId || data.channel?.id;
      createdListingIds.push(itemEId);
    }

    // --- TEST 1: Public endpoint returns only approved listings ---
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      assert(res.status === 200, "Test 1a: GET /api/channels?listing_type=ebooks-digital returns 200");
      const data = await res.json();
      assert(data.success === true, "Test 1b: Response success = true");
      const ids = data.channels.map((c: any) => c.id);
      assert(ids.includes(itemAId), "Test 1c: Approved Item A is present");
      assert(ids.includes(itemBId), "Test 1d: Approved Item B is present");
      assert(ids.includes(itemCId), "Test 1e: Approved Item C is present");
      assert(!ids.includes(itemDId), "Test 1f: Rejected Item D is strictly EXCLUDED");
      assert(!ids.includes(itemEId), "Test 1g: Pending Item E is strictly EXCLUDED");
    }

    // --- TEST 2: Data privacy in public responses ---
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      const data = await res.json();
      const listingA = data.channels.find((c: any) => c.id === itemAId);
      assert(listingA !== undefined, "Test 2a: Found item in public response");
      assert(listingA.rejection_reason === undefined, "Test 2b: Private rejection_reason is NOT exposed in public response");
      assert(listingA.reviewed_by === undefined, "Test 2c: Private reviewed_by is NOT exposed in public response");
      assert(listingA.seller_phone === undefined, "Test 2d: Private seller_phone is NOT exposed in public response");
      assert(Boolean(listingA.title), "Test 2e: Public title field is present");
      assert(Boolean(listingA.subcategory), "Test 2f: Public subcategory field is present");
      assert(Boolean(listingA.file_format), "Test 2g: Public file_format field is present");
      assert(Boolean(listingA.price), "Test 2h: Public price field is present");
    }

    // --- TEST 3: Subcategory filtering ---
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&subcategory=Templates`);
      const data = await res.json();
      const ids = data.channels.map((c: any) => c.id);
      assert(ids.includes(itemBId), "Test 3a: Subcategory 'Templates' returns Item B");
      assert(!ids.includes(itemAId), "Test 3b: Subcategory 'Templates' excludes Item A (Ebooks)");
      assert(!ids.includes(itemCId), "Test 3c: Subcategory 'Templates' excludes Item C (Study Notes)");
    }

    // --- TEST 4: File format filtering ---
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&file_format=PDF`);
      const data = await res.json();
      const ids = data.channels.map((c: any) => c.id);
      assert(ids.includes(itemAId), "Test 4a: Format filter 'PDF' returns Item A");
      assert(!ids.includes(itemBId), "Test 4b: Format filter 'PDF' excludes Item B (ZIP)");
      assert(!ids.includes(itemCId), "Test 4c: Format filter 'PDF' excludes Item C (DOCX)");
    }

    // --- TEST 5: Text Search across title and description ---
    {
      const resTitle = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&search=Calculus`);
      const dataTitle = await resTitle.json();
      const idsTitle = dataTitle.channels.map((c: any) => c.id);
      assert(idsTitle.includes(itemAId), "Test 5a: Search for 'Calculus' matches Item A description");
      assert(!idsTitle.includes(itemBId), "Test 5b: Search for 'Calculus' excludes Item B");

      const resWord = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&search=Forecasting`);
      const dataWord = await resWord.json();
      const idsWord = dataWord.channels.map((c: any) => c.id);
      assert(idsWord.includes(itemBId), "Test 5c: Search for 'Forecasting' matches Item B description");
    }

    // --- TEST 6: Sorting ---
    {
      // Price Ascending: Item C (100) -> Item A (200) -> Item B (500)
      const resAsc = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&sort=price_asc`);
      const dataAsc = await resAsc.json();
      const filteredAsc = dataAsc.channels.filter((c: any) => [itemAId, itemBId, itemCId].includes(c.id));
      assert(
        filteredAsc[0].id === itemCId && filteredAsc[1].id === itemAId && filteredAsc[2].id === itemBId,
        "Test 6a: Sort price_asc orders Item C (100) < Item A (200) < Item B (500)"
      );

      // Price Descending: Item B (500) -> Item A (200) -> Item C (100)
      const resDesc = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&sort=price_desc`);
      const dataDesc = await resDesc.json();
      const filteredDesc = dataDesc.channels.filter((c: any) => [itemAId, itemBId, itemCId].includes(c.id));
      assert(
        filteredDesc[0].id === itemBId && filteredDesc[1].id === itemAId && filteredDesc[2].id === itemCId,
        "Test 6b: Sort price_desc orders Item B (500) > Item A (200) > Item C (100)"
      );
    }

    // --- TEST 7: Pagination ---
    {
      const resPage1 = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&limit=1&page=1`);
      const dataPage1 = await resPage1.json();
      assert(dataPage1.channels.length === 1, "Test 7a: Pagination limit=1 returns exactly 1 item");
      assert(dataPage1.pagination.page === 1, "Test 7b: Pagination object reflects page=1");
      assert(dataPage1.pagination.limit === 1, "Test 7c: Pagination object reflects limit=1");
      assert(dataPage1.pagination.total >= 3, "Test 7d: Pagination object reflects total >= 3");
      assert(dataPage1.pagination.totalPages >= 3, "Test 7e: Pagination object reflects totalPages >= 3");

      const resPage2 = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital&limit=1&page=2`);
      const dataPage2 = await resPage2.json();
      assert(dataPage2.channels.length === 1, "Test 7f: Page 2 returns 1 item");
      assert(dataPage2.channels[0].id !== dataPage1.channels[0].id, "Test 7g: Page 2 item is distinct from Page 1 item");
    }

    // --- TEST 8: Combined filters ---
    {
      const resCombined = await fetch(
        `${baseUrl}/api/channels?listing_type=ebooks-digital&subcategory=Ebooks&file_format=PDF&search=Mathematics&sort=price_asc`
      );
      const dataCombined = await resCombined.json();
      const ids = dataCombined.channels.map((c: any) => c.id);
      assert(ids.includes(itemAId), "Test 8a: Combined filters return matching Item A");
      assert(ids.length === 1, "Test 8b: Combined filters return exactly 1 matching item");
    }

    // --- TEST 9: Social media channels isolation ---
    {
      const resSocial = await fetch(`${baseUrl}/api/channels?listing_type=social-media`);
      const dataSocial = await resSocial.json();
      const idsSocial = dataSocial.channels.map((c: any) => c.id);
      assert(!idsSocial.includes(itemAId), "Test 9a: listing_type=social-media strictly excludes digital Item A");
      assert(!idsSocial.includes(itemBId), "Test 9b: listing_type=social-media strictly excludes digital Item B");
      assert(!idsSocial.includes(itemCId), "Test 9c: listing_type=social-media strictly excludes digital Item C");
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

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runMarketplaceVerification().catch((err) => {
  console.error("Marketplace verification failed:", err);
  process.exit(1);
});
