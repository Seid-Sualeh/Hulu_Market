export type DigitalSubcategory =
  | "Ebooks"
  | "Study Notes"
  | "Educational Documents"
  | "Templates"
  | "Guides"
  | "Other Digital Products";

export type DigitalFileFormat =
  | "PDF"
  | "DOC"
  | "DOCX"
  | "PPT"
  | "PPTX"
  | "ZIP";

export interface DigitalProductItem {
  id: number;
  seller_id: number;
  name: string;
  title?: string;
  description: string;
  price: number;
  listing_type?: string;
  category?: string;
  subcategory?: DigitalSubcategory | string;
  file_format?: DigitalFileFormat | string;
  page_count?: number | null;
  language?: string | null;
  status: string;
  seller_username?: string | null;
  seller_first_name?: string | null;
  seller_last_name?: string | null;
  screenshot_url?: string | null;
  created_at?: string;
}

export type DigitalSortOption = "newest" | "price_asc" | "price_desc" | "oldest";

export interface DigitalPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
