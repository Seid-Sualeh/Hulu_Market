"use client";

import React from "react";
import {
  BookOpen,
  FileText,
  Presentation,
  Archive,
  FileCode,
  Globe,
  User,
  Calendar,
  CheckCircle2,
  File,
} from "lucide-react";
import type { DigitalProductItem } from "./types";

interface DigitalProductCardProps {
  product: DigitalProductItem;
}

export default function DigitalProductCard({ product }: DigitalProductCardProps) {
  const displayTitle = product.title || product.name || "Untitled Digital Product";
  const format = (product.file_format || "PDF").toUpperCase();

  // Helper for format styling and icon
  const getFormatBadge = (fmt: string) => {
    switch (fmt) {
      case "PDF":
        return {
          icon: FileText,
          bg: "bg-rose-500/10",
          border: "border-rose-500/30",
          text: "text-rose-400",
          glow: "from-rose-500/10 to-transparent",
        };
      case "DOC":
      case "DOCX":
        return {
          icon: FileText,
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          glow: "from-blue-500/10 to-transparent",
        };
      case "PPT":
      case "PPTX":
        return {
          icon: Presentation,
          bg: "bg-orange-500/10",
          border: "border-orange-500/30",
          text: "text-orange-400",
          glow: "from-orange-500/10 to-transparent",
        };
      case "ZIP":
        return {
          icon: Archive,
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          glow: "from-amber-500/10 to-transparent",
        };
      default:
        return {
          icon: File,
          bg: "bg-slate-500/10",
          border: "border-slate-500/30",
          text: "text-slate-300",
          glow: "from-slate-500/10 to-transparent",
        };
    }
  };

  const badgeStyle = getFormatBadge(format);
  const FormatIcon = badgeStyle.icon;

  const formattedDate = product.created_at
    ? new Date(product.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const sellerDisplayName =
    product.seller_username
      ? `@${product.seller_username}`
      : product.seller_first_name
      ? product.seller_first_name
      : "Verified Seller";

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#121722] to-[#0c1017] p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/40 hover:shadow-xl hover:shadow-[#D4AF37]/5">
      {/* Top Background subtle gradient accent */}
      <div
        className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${badgeStyle.glow} pointer-events-none opacity-40 group-hover:opacity-60 transition`}
      />

      <div>
        {/* Top Header: Format Badge & Subcategory Tag */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* File Format Badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold tracking-wide ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}
          >
            <FormatIcon className="size-3.5" />
            <span>{format}</span>
          </div>

          {/* Subcategory Pill */}
          <span className="truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
            {product.subcategory || "Digital Product"}
          </span>
        </div>

        {/* Visual Document Placeholder Header */}
        <div className="relative z-10 mt-4 flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-lg border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}
          >
            <FormatIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-400">
              <CheckCircle2 className="size-3 text-teal-400" />
              <span>Approved Resource</span>
            </div>
            <p className="truncate text-xs text-slate-400">
              {product.subcategory ? `${product.subcategory} Document` : "Verified Resource"}
            </p>
          </div>
        </div>

        {/* Product Title */}
        <h3
          className="relative z-10 mt-3.5 text-base font-bold text-white tracking-tight line-clamp-2 leading-snug group-hover:text-[#D4AF37] transition-colors"
          title={displayTitle}
        >
          {displayTitle}
        </h3>

        {/* Product Description Excerpt */}
        {product.description && (
          <p className="relative z-10 mt-2 text-xs leading-relaxed text-slate-400 line-clamp-3">
            {product.description}
          </p>
        )}

        {/* Metadata Badges Row (Page count, Language, Date) */}
        <div className="relative z-10 mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
          {product.page_count && Number(product.page_count) > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-300">
              <BookOpen className="size-3 text-slate-400" />
              {product.page_count} {Number(product.page_count) === 1 ? "page" : "pages"}
            </span>
          ) : null}

          {product.language ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-300">
              <Globe className="size-3 text-slate-400" />
              {product.language}
            </span>
          ) : null}

          {formattedDate ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-400">
              <Calendar className="size-3 text-slate-500" />
              {formattedDate}
            </span>
          ) : null}
        </div>
      </div>

      {/* Footer: Seller & Price (No purchase/download buttons per strict Feature 4 boundary) */}
      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
        {/* Seller Info */}
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <div className="grid size-6 place-items-center rounded-full bg-white/5 border border-white/10 text-slate-400 shrink-0">
            <User className="size-3" />
          </div>
          <span className="truncate text-xs font-medium text-slate-300" title={sellerDisplayName}>
            {sellerDisplayName}
          </span>
        </div>

        {/* Price Display */}
        <div className="text-right shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            Price
          </span>
          <span className="text-base font-extrabold text-[#D4AF37] tracking-tight">
            {Number(product.price || 0).toLocaleString()} ETB
          </span>
        </div>
      </div>
    </div>
  );
}
