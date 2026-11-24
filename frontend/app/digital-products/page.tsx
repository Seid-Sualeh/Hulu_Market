"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  SlidersHorizontal,
  X,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  PlusCircle,
} from "lucide-react";
import { fetchBackend } from "@/lib/api";
import DigitalProductCard from "@/components/digital-products/DigitalProductCard";
import type {
  DigitalProductItem,
  DigitalSubcategory,
  DigitalFileFormat,
  DigitalSortOption,
  DigitalPagination,
} from "@/components/digital-products/types";

const SUBCATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All Categories" },
  { id: "Ebooks", label: "Ebooks" },
  { id: "Study Notes", label: "Study Notes" },
  { id: "Educational Documents", label: "Educational Documents" },
  { id: "Templates", label: "Templates" },
  { id: "Guides", label: "Guides" },
  { id: "Other Digital Products", label: "Other Resources" },
];

const FILE_FORMATS: { id: string; label: string }[] = [
  { id: "all", label: "All Formats" },
  { id: "PDF", label: "PDF" },
  { id: "DOC", label: "DOC" },
  { id: "DOCX", label: "DOCX" },
  { id: "PPT", label: "PPT" },
  { id: "PPTX", label: "PPTX" },
  { id: "ZIP", label: "ZIP" },
];

const SORT_OPTIONS: { id: DigitalSortOption; label: string }[] = [
  { id: "newest", label: "Newest First" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "oldest", label: "Oldest First" },
];

export default function DigitalProductsPage() {
  const [products, setProducts] = useState<DigitalProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<DigitalSortOption>("newest");
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<DigitalPagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1); // Reset page on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset to page 1 when subcategory, format, or sort changes
  const handleSubcategoryChange = (sub: string) => {
    setSelectedSubcategory(sub);
    setPage(1);
  };

  const handleFormatChange = (fmt: string) => {
    setSelectedFormat(fmt);
    setPage(1);
  };

  const handleSortChange = (sort: DigitalSortOption) => {
    setSelectedSort(sort);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedSubcategory("all");
    setSelectedFormat("all");
    setSelectedSort("newest");
    setPage(1);
  };

  // Fetch approved digital products from backend
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("listing_type", "ebooks-digital");
      params.set("page", String(page));
      params.set("limit", "12");

      if (selectedSubcategory !== "all") {
        params.set("subcategory", selectedSubcategory);
      }
      if (selectedFormat !== "all") {
        params.set("file_format", selectedFormat);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (selectedSort) {
        params.set("sort", selectedSort);
      }

      const res = await fetchBackend(`channels?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.channels)) {
        setProducts(data.channels);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            page: 1,
            limit: 12,
            total: data.channels.length,
            totalPages: 1,
          });
        }
      } else {
        throw new Error(data.error || "Failed to load digital products.");
      }
    } catch (err: unknown) {
      console.error("[DigitalProducts] Fetch error:", err);
      setError((err as Error).message || "An unexpected error occurred while loading digital products.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedSubcategory, selectedFormat, debouncedSearch, selectedSort]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    selectedSubcategory !== "all" ||
    selectedFormat !== "all" ||
    selectedSort !== "newest";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Page Header & Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#141b27] via-[#0f141e] to-[#0a0d14] p-6 sm:p-10 shadow-2xl">
        {/* Glow Accent */}
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 size-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold text-[#D4AF37]">
              <Sparkles className="size-3.5" />
              <span>Verified Knowledge & Digital Assets</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Digital Products
            </h1>
            <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
              Browse approved Ethiopian educational documents, university study notes, academic ebooks, professional templates, and digital guides from verified sellers.
            </p>
          </div>

          {/* Sell CTA */}
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-[#D4AF37]/20 transition duration-200 hover:brightness-110"
            >
              <PlusCircle className="size-4" />
              <span>Sell Digital Product</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Search & Controls Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#101520] p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, subject, or description (e.g. Physics, Calculus, Accounting)..."
              className="w-full rounded-xl border border-white/10 bg-[#0a0d14] py-2.5 pl-10 pr-9 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* File Format Filter Dropdown */}
          <div className="w-full sm:w-48 shrink-0">
            <select
              value={selectedFormat}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0a0d14] px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              {FILE_FORMATS.map((fmt) => (
                <option key={fmt.id} value={fmt.id} className="bg-[#101520] text-slate-200">
                  {fmt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="w-full sm:w-52 shrink-0">
            <select
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value as DigitalSortOption)}
              className="w-full rounded-xl border border-white/10 bg-[#0a0d14] px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-[#101520] text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subcategory Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="size-3" />
            <span>Category:</span>
          </span>
          {SUBCATEGORIES.map((sub) => {
            const isActive = selectedSubcategory === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSubcategoryChange(sub.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20"
                    : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {sub.label}
              </button>
            );
          })}

          {/* Clear Filters Button if any filter active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition"
            >
              <RotateCcw className="size-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-3 animate-spin text-[#D4AF37]" />
              <span>Updating digital catalog...</span>
            </span>
          ) : (
            <span>
              Showing{" "}
              <strong className="text-white">{products.length}</strong> of{" "}
              <strong className="text-white">{pagination.total}</strong> approved digital products
              {debouncedSearch && (
                <span> matching &ldquo;<span className="text-slate-200 font-semibold">{debouncedSearch}</span>&rdquo;</span>
              )}
            </span>
          )}
        </div>
        {pagination.totalPages > 1 && (
          <span>
            Page <strong className="text-white">{pagination.page}</strong> of{" "}
            <strong className="text-white">{pagination.totalPages}</strong>
          </span>
        )}
      </div>

      {/* 4. Products Grid / Skeletons / Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border border-white/[0.06] bg-[#121722] p-5 space-y-4"
            >
              <div className="flex justify-between">
                <div className="h-6 w-16 rounded-md bg-white/10" />
                <div className="h-5 w-24 rounded-full bg-white/10" />
              </div>
              <div className="h-12 w-full rounded-xl bg-white/5" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-full rounded bg-white/5" />
                <div className="h-3 w-5/6 rounded bg-white/5" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <div className="h-4 w-16 rounded bg-white/5" />
                <div className="h-4 w-16 rounded bg-white/5" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <div className="h-4 w-20 rounded bg-white/5" />
                <div className="h-5 w-16 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-rose-500/10 text-rose-400">
            <X className="size-6" />
          </div>
          <h3 className="text-base font-bold text-white">Failed to Load Products</h3>
          <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={loadProducts}
            className="rounded-xl bg-rose-500/20 border border-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition"
          >
            Retry Connection
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#101520] p-12 text-center shadow-xl space-y-4">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37]">
            <BookOpen className="size-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Digital Products Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {hasActiveFilters
              ? "No approved digital resources match your current search and filter combination. Try clearing some filters or searching with different keywords."
              : "No approved digital products are currently listed in this category. Be the first seller to list an ebook or digital resource!"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                Clear All Filters
              </button>
            )}
            <Link
              href="/sell"
              className="rounded-xl bg-[#D4AF37] px-5 py-2 text-xs font-bold text-slate-950 hover:brightness-110 transition shadow-lg shadow-[#D4AF37]/20"
            >
              List an Ebook or Document
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <DigitalProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* 5. Pagination Controls */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.08] pt-6">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#101520] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-medium text-slate-400">
            Page <strong className="text-white">{pagination.page}</strong> of{" "}
            <strong className="text-white">{pagination.totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#101520] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
