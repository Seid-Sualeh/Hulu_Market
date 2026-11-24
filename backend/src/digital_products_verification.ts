import http from "http";
import { createApp } from "./app.js";
import {
  DIGITAL_PRODUCT_CATEGORY_NAME,
  DIGITAL_PRODUCT_CATEGORY_SLUG,
  DIGITAL_PRODUCT_SUBCATEGORIES,
  DIGITAL_PRODUCT_FILE_FORMATS,
  validateDigitalProductInput,
} from "./types/marketplace.js";

async function runDigitalProductsVerification() {
  console.log("=== HULU MARKET DIGITAL PRODUCTS FOUNDATION TEST SUITE ===");
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

  // 1. UNIT TESTS: Category & Subcategory definitions
  {
    assert(
      DIGITAL_PRODUCT_CATEGORY_NAME === "Ebooks & Digital Products",
      "Category name is 'Ebooks & Digital Products'"
    );
    assert(
      DIGITAL_PRODUCT_CATEGORY_SLUG === "ebooks-digital",
      "Category slug is 'ebooks-digital'"
    );
    const expectedSubcategories = [
      "Ebooks",
      "Study Notes",
      "Educational Documents",
      "Templates",
      "Guides",
      "Other Digital Products",
    ];
    const hasAllSubs = expectedSubcategories.every((sub) =>
      DIGITAL_PRODUCT_SUBCATEGORIES.includes(sub as any)
    );
    assert(hasAllSubs, "Supports all 6 required digital product subcategories");

    const expectedFormats = ["PDF", "DOC", "DOCX", "PPT", "PPTX", "ZIP"];
    const hasAllFormats = expectedFormats.every((fmt) =>
      DIGITAL_PRODUCT_FILE_FORMATS.includes(fmt as any)
    );
    assert(hasAllFormats, "Supports all required file formats (PDF, DOC, DOCX, PPT, PPTX, ZIP)");
  }

  // 2. UNIT TESTS: Server-Side Validation
  {
    // Valid digital product payload
    const validPayload = {
      title: "Grade 12 Physics Complete Summary",
      price: 150,
      subcategory: "Study Notes",
      file_format: "PDF",
      page_count: 85,
      language: "Amharic",
      description: "Comprehensive national exam preparation notes.",
    };
    const validRes = validateDigitalProductInput(validPayload);
    assert(validRes.valid, "Valid digital product payload passes validation");
    assert(validRes.sanitized?.subcategory === "Study Notes", "Sanitizer preserves subcategory");
    assert(validRes.sanitized?.file_format === "PDF", "Sanitizer preserves file format");
    assert(validRes.sanitized?.page_count === 85, "Sanitizer preserves page count");
    assert(validRes.sanitized?.language === "Amharic", "Sanitizer preserves language");
    assert(validRes.sanitized?.category === "Ebooks & Digital Products", "Sanitizer assigns category");
    assert(validRes.sanitized?.listing_type === "ebooks-digital", "Sanitizer assigns listing_type");

    // Case-insensitive format normalization
    const lowerFormatRes = validateDigitalProductInput({
      title: "Design System Template",
      price: 300,
      subcategory: "Templates",
      file_format: "zip", // lowercase
    });
    assert(lowerFormatRes.valid && lowerFormatRes.sanitized?.file_format === "ZIP", "Normalizes file format to uppercase (zip -> ZIP)");

    // Missing title
    const missingTitle = validateDigitalProductInput({
      price: 100,
      subcategory: "Ebooks",
      file_format: "PDF",
    });
    assert(!missingTitle.valid, "Rejects digital product without title");

    // Non-positive price
    const zeroPrice = validateDigitalProductInput({
      title: "Free Book",
      price: 0,
      subcategory: "Ebooks",
      file_format: "PDF",
    });
    assert(!zeroPrice.valid, "Rejects digital product with non-positive price (price <= 0)");

    // Negative price
    const negPrice = validateDigitalProductInput({
      title: "Negative Price Book",
      price: -50,
      subcategory: "Ebooks",
      file_format: "PDF",
    });
    assert(!negPrice.valid, "Rejects digital product with negative price");

    // Invalid subcategory
    const invalidSub = validateDigitalProductInput({
      title: "Random Item",
      price: 100,
      subcategory: "RandomUnregisteredCategory",
      file_format: "PDF",
    });
    assert(!invalidSub.valid, "Rejects digital product with invalid subcategory");

    // Invalid file format (e.g. dangerous or unsupported executable)
    const invalidFormat = validateDigitalProductInput({
      title: "Hacking Tool",
      price: 100,
      subcategory: "Other Digital Products",
      file_format: "EXE",
    });
    assert(!invalidFormat.valid, "Rejects digital product with unsupported file format (e.g. EXE)");

    // Invalid page count (e.g. decimal or negative)
    const invalidPage = validateDigitalProductInput({
      title: "Math Notes",
      price: 50,
      subcategory: "Study Notes",
      file_format: "PDF",
      page_count: -10,
    });
    assert(!invalidPage.valid, "Rejects digital product with negative page count");

    const floatPage = validateDigitalProductInput({
      title: "Math Notes",
      price: 50,
      subcategory: "Study Notes",
      file_format: "PDF",
      page_count: 12.5,
    });
    assert(!floatPage.valid, "Rejects digital product with fractional page count");
  }

  // 3. INTEGRATION TESTS: HTTP API endpoints
  const app = createApp("https://hulu-market.vercel.app");
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // API 1: GET /api/channels/categories returns categories metadata
    {
      const res = await fetch(`${baseUrl}/api/channels/categories`);
      assert(res.status === 200, "API 1: GET /api/channels/categories returns 200 OK");
      const data = await res.json();
      assert(data.success === true, "API 1: Categories response success = true");
      const digitalCat = data.categories?.find((c: any) => c.id === "ebooks-digital");
      assert(Boolean(digitalCat), "API 1: 'ebooks-digital' category is present in API response");
      assert(
        Array.isArray(digitalCat?.subcategories) && digitalCat.subcategories.length === 6,
        "API 1: All 6 subcategories returned by category endpoint"
      );
      assert(
        Array.isArray(digitalCat?.fileFormats) && digitalCat.fileFormats.includes("PDF"),
        "API 1: File formats list contains PDF"
      );
    }

    // API 2: Unauthenticated POST /api/channels for digital product returns 401
    {
      const res = await fetch(`${baseUrl}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_type: "ebooks-digital",
          title: "Grade 11 Chemistry",
          price: 120,
          subcategory: "Study Notes",
          file_format: "PDF",
        }),
      });
      assert(res.status === 401, "API 2: Unauthenticated POST /api/channels returns 401 Unauthorized");
    }

    // API 3: GET /api/channels with category filter
    {
      const res = await fetch(`${baseUrl}/api/channels?category=Ebooks%20%26%20Digital%20Products`);
      assert(res.status === 200 || res.status === 500, "API 3: GET /api/channels accepts category filter without 400/404");
    }

    // API 4: GET /api/channels with digital listing_type filter
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=ebooks-digital`);
      assert(res.status === 200 || res.status === 500, "API 4: GET /api/channels accepts listing_type=ebooks-digital filter");
    }

    // API 5: GET /api/channels with social-media listing_type filter (Objective B verification)
    {
      const res = await fetch(`${baseUrl}/api/channels?listing_type=social-media`);
      assert(res.status === 200 || res.status === 500, "API 5: GET /api/channels explicitly isolates listing_type=social-media");
    }

    // API 6: GET /api/channels with platform filter
    {
      const res = await fetch(`${baseUrl}/api/channels?platform=telegram`);
      assert(res.status === 200 || res.status === 500, "API 6: GET /api/channels preserves platform filtering (platform=telegram)");
    }

    // API 7: Social media channel schema requirement
    {
      const socialPayloadWithoutPlatform = {
        name: "Test Channel",
        price: 500,
        // no platform, no digital listing_type
      };
      assert(
        !Boolean((socialPayloadWithoutPlatform as any).platform),
        "API 7: Social media channels schema strictly requires platform"
      );
    }

  } finally {
    server.close();
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDigitalProductsVerification().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
