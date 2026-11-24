/**
 * Marketplace Categories and Digital Product Metadata Types & Validators
 */

export const MARKETPLACE_CATEGORIES = [
  { id: "social-media", name: "Social Media Channels" },
  { id: "ebooks-digital", name: "Ebooks & Digital Products" },
] as const;

export type MarketplaceCategorySlug = "social-media" | "ebooks-digital";

export const DIGITAL_PRODUCT_CATEGORY_NAME = "Ebooks & Digital Products";
export const DIGITAL_PRODUCT_CATEGORY_SLUG = "ebooks-digital";

export const DIGITAL_PRODUCT_SUBCATEGORIES = [
  "Ebooks",
  "Study Notes",
  "Educational Documents",
  "Templates",
  "Guides",
  "Other Digital Products",
] as const;

export type DigitalProductSubcategory = (typeof DIGITAL_PRODUCT_SUBCATEGORIES)[number];

export const DIGITAL_PRODUCT_FILE_FORMATS = [
  "PDF",
  "DOC",
  "DOCX",
  "PPT",
  "PPTX",
  "ZIP",
  "EPUB",
  "TXT",
  "XLS",
  "XLSX",
] as const;

export type DigitalProductFileFormat = (typeof DIGITAL_PRODUCT_FILE_FORMATS)[number];

export interface DigitalProductInput {
  name?: string;
  title?: string;
  price?: number | string;
  description?: string;
  category?: string;
  listing_type?: string;
  subcategory?: string;
  file_format?: string;
  page_count?: number | string | null;
  language?: string | null;
  digital_metadata?: Record<string, unknown> | null;
  link_url?: string;
  screenshot_url?: string;
  seller_username?: string;
  seller_phone?: string;
  agreed_declaration?: boolean;
}

export interface SanitizedDigitalProduct {
  name: string;
  price: number;
  description: string | null;
  category: string;
  listing_type: "ebooks-digital";
  subcategory: DigitalProductSubcategory;
  file_format: DigitalProductFileFormat;
  page_count: number | null;
  language: string | null;
  digital_metadata: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: SanitizedDigitalProduct;
}

/**
 * Validates and sanitizes a digital product payload server-side.
 * Never trusts frontend input.
 */
export function validateDigitalProductInput(data: unknown): ValidationResult {
  const input = (typeof data === "object" && data !== null ? data : {}) as DigitalProductInput;
  const resultErrors: string[] = [];

  // 1. Title / Name validation
  const rawTitle = input.name || input.title;
  if (!rawTitle || typeof rawTitle !== "string" || !rawTitle.trim()) {
    resultErrors.push("Product title is required.");
  } else if (rawTitle.trim().length < 2) {
    resultErrors.push("Product title must be at least 2 characters.");
  } else if (rawTitle.trim().length > 255) {
    resultErrors.push("Product title must not exceed 255 characters.");
  }
  const cleanTitle = typeof rawTitle === "string" ? rawTitle.trim() : "";

  // 2. Price validation
  const rawPrice = input.price;
  const numPrice = Number(rawPrice);
  if (rawPrice === undefined || rawPrice === null || isNaN(numPrice) || numPrice <= 0) {
    resultErrors.push("A valid price greater than 0 ETB is required.");
  }

  // 3. Subcategory validation (case-insensitive lookup against allowed subcategories)
  const rawSubcategory = typeof input.subcategory === "string" ? input.subcategory.trim() : "";
  const matchedSubcategory = DIGITAL_PRODUCT_SUBCATEGORIES.find(
    (sub) => sub.toLowerCase() === rawSubcategory.toLowerCase()
  );
  if (!matchedSubcategory) {
    resultErrors.push(
      `Invalid subcategory '${rawSubcategory}'. Allowed subcategories are: ${DIGITAL_PRODUCT_SUBCATEGORIES.join(", ")}.`
    );
  }

  // 4. File format validation (case-insensitive lookup against allowed formats)
  const rawFormat = typeof input.file_format === "string" ? input.file_format.trim().toUpperCase() : "";
  const matchedFormat = DIGITAL_PRODUCT_FILE_FORMATS.find(
    (fmt) => fmt === rawFormat
  );
  if (!matchedFormat) {
    resultErrors.push(
      `Invalid file format '${rawFormat}'. Allowed file formats are: ${DIGITAL_PRODUCT_FILE_FORMATS.join(", ")}.`
    );
  }

  // 5. Page count validation (optional, but must be positive integer if supplied)
  let cleanPageCount: number | null = null;
  if (input.page_count !== undefined && input.page_count !== null && String(input.page_count).trim() !== "") {
    const parsedPage = Number(input.page_count);
    if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
      resultErrors.push("Page count must be a positive whole number.");
    } else if (parsedPage > 100000) {
      resultErrors.push("Page count must not exceed 100,000.");
    } else {
      cleanPageCount = parsedPage;
    }
  }

  // 6. Language validation (optional, max 50 chars)
  let cleanLanguage: string | null = null;
  if (input.language !== undefined && input.language !== null && typeof input.language === "string") {
    const trimmedLang = input.language.trim();
    if (trimmedLang.length > 50) {
      resultErrors.push("Language must not exceed 50 characters.");
    } else if (trimmedLang.length > 0) {
      cleanLanguage = trimmedLang;
    }
  }

  // 7. Description validation (optional, max 5000 chars)
  let cleanDescription: string | null = null;
  if (input.description !== undefined && input.description !== null && typeof input.description === "string") {
    const trimmedDesc = input.description.trim();
    if (trimmedDesc.length > 5000) {
      resultErrors.push("Description must not exceed 5,000 characters.");
    } else if (trimmedDesc.length > 0) {
      cleanDescription = trimmedDesc;
    }
  }

  // 8. Metadata object validation (optional JSON)
  let cleanMetadata: string | null = null;
  if (input.digital_metadata !== undefined && input.digital_metadata !== null) {
    if (typeof input.digital_metadata === "object") {
      try {
        cleanMetadata = JSON.stringify(input.digital_metadata);
      } catch {
        resultErrors.push("Digital metadata must be a valid JSON object.");
      }
    } else if (typeof input.digital_metadata === "string") {
      try {
        JSON.parse(input.digital_metadata);
        cleanMetadata = input.digital_metadata;
      } catch {
        resultErrors.push("Digital metadata string must be valid JSON.");
      }
    }
  }

  if (resultErrors.length > 0) {
    return { valid: false, errors: resultErrors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      name: cleanTitle,
      price: numPrice,
      description: cleanDescription,
      category: DIGITAL_PRODUCT_CATEGORY_NAME,
      listing_type: "ebooks-digital",
      subcategory: matchedSubcategory!,
      file_format: matchedFormat!,
      page_count: cleanPageCount,
      language: cleanLanguage,
      digital_metadata: cleanMetadata,
    },
  };
}
