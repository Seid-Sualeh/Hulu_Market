"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Presentation,
  Archive,
  FileCode,
  Globe,
  User,
  Star,
  Eye,
  CheckCircle2,
  File,
} from "lucide-react";
import type { DigitalProductItem } from "./types";
import { resolveImageUrl, fetchBackend } from "@/lib/api";

interface DigitalProductCardProps {
  product: DigitalProductItem;
}

export default function DigitalProductCard({ product }: DigitalProductCardProps) {
  const [starred, setStarred] = useState(false);
  const displayTitle = product.title || product.name || "Untitled Digital Product";
  const rawFormat = (product.file_format || "PDF").toUpperCase();

  // Sync star status from localStorage
  useEffect(() => {
    const checkStarred = () => {
      try {
        const stored = localStorage.getItem("hulu_favorites");
        if (stored) {
          const parsed = JSON.parse(stored);
          const isFav =
            Array.isArray(parsed) &&
            parsed.some(
              (item: any) =>
                String(item.id) === String(product.id) ||
                String(item.channel_id) === String(product.id) ||
                (item.title &&
                  String(item.title).toLowerCase() === displayTitle.toLowerCase())
            );
          setStarred(isFav);
        } else {
          setStarred(false);
        }
      } catch {
        // ignore JSON error
      }
    };

    checkStarred();
    window.addEventListener("hulu_favorites_updated", checkStarred);
    window.addEventListener("storage", checkStarred);
    return () => {
      window.removeEventListener("hulu_favorites_updated", checkStarred);
      window.removeEventListener("storage", checkStarred);
    };
  }, [product.id, displayTitle]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const stored = localStorage.getItem("hulu_favorites");
      let currentList = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(currentList)) currentList = [];

      const rawUser = localStorage.getItem("hulu_user");
      const userId = rawUser ? JSON.parse(rawUser)?.id : null;

      const exists = currentList.some(
        (item: any) =>
          String(item.id) === String(product.id) ||
          String(item.channel_id) === String(product.id) ||
          (item.title &&
            String(item.title).toLowerCase() === displayTitle.toLowerCase())
      );

      if (exists) {
        currentList = currentList.filter(
          (item: any) =>
            String(item.id) !== String(product.id) &&
            String(item.channel_id) !== String(product.id) &&
            !(
              item.title &&
              String(item.title).toLowerCase() === displayTitle.toLowerCase()
            )
        );
        setStarred(false);
        if (userId) {
          fetchBackend(`user/favorites/${product.id}?userId=${userId}`, {
            method: "DELETE",
          }).catch(() => {});
        }
      } else {
        const newFav = {
          id: product.id,
          channel_id: product.id,
          dbId: product.id,
          title: displayTitle,
          name: displayTitle,
          category: product.category || "Ebooks & Digital Products",
          categorySlug: "ebooks-digital",
          subcategory: product.subcategory || "Digital Product",
          file_format: product.file_format || "PDF",
          price: product.price,
          screenshot_url: product.screenshot_url,
          savedDate: "Saved just now",
          verified: true,
        };
        currentList = [newFav, ...currentList];
        setStarred(true);
        if (userId) {
          fetchBackend("user/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, channelId: product.id }),
          }).catch(() => {});
        }
      }

      localStorage.setItem("hulu_favorites", JSON.stringify(currentList));
      window.dispatchEvent(new Event("hulu_favorites_updated"));
    } catch (err) {
      console.error("Failed to update favorites in localStorage", err);
    }
  };

  // Format Ribbon, Colors & Icon Configuration matching ChannelCard pattern
  const formatConfig = (() => {
    switch (rawFormat) {
      case "PDF":
        return {
          name: "PDF",
          ribbonClass: "bg-[#E42528] text-white",
          btnClass: "bg-[#E42528] hover:bg-[#c91e21] text-white",
          linkClass: "text-[#ff6b6e] hover:text-[#ff9496]",
          placeholderGradient: "from-rose-950 via-slate-900 to-black",
          coverBorder: "border-rose-500/40",
          icon: <FileText className="size-4 text-white" />,
          smallIcon: <FileText className="size-3.5 fill-current" />,
        };
      case "DOC":
      case "DOCX":
        return {
          name: "DOCX",
          ribbonClass: "bg-[#2B579A] text-white",
          btnClass: "bg-[#2B579A] hover:bg-[#22457a] text-white",
          linkClass: "text-[#5b95e0] hover:text-[#8cbcf5]",
          placeholderGradient: "from-blue-950 via-slate-900 to-black",
          coverBorder: "border-blue-500/40",
          icon: <FileText className="size-4 text-white" />,
          smallIcon: <FileText className="size-3.5 fill-current" />,
        };
      case "PPT":
      case "PPTX":
        return {
          name: "PPTX",
          ribbonClass: "bg-[#D24726] text-white",
          btnClass: "bg-[#D24726] hover:bg-[#b53c1f] text-white",
          linkClass: "text-[#ff8264] hover:text-[#ffa58f]",
          placeholderGradient: "from-orange-950 via-slate-900 to-black",
          coverBorder: "border-orange-500/40",
          icon: <Presentation className="size-4 text-white" />,
          smallIcon: <Presentation className="size-3.5 fill-current" />,
        };
      case "ZIP":
      case "RAR":
        return {
          name: "ZIP",
          ribbonClass: "bg-[#D97706] text-white",
          btnClass: "bg-[#D97706] hover:bg-[#b45309] text-white",
          linkClass: "text-[#fbbf24] hover:text-[#fde68a]",
          placeholderGradient: "from-amber-950 via-slate-900 to-black",
          coverBorder: "border-amber-500/40",
          icon: <Archive className="size-4 text-white" />,
          smallIcon: <Archive className="size-3.5 fill-current" />,
        };
      case "EPUB":
        return {
          name: "EPUB",
          ribbonClass: "bg-gradient-to-t from-[#6D28D9] to-[#8B5CF6] text-white",
          btnClass: "bg-[#7C3AED] hover:bg-[#6D28D9] text-white",
          linkClass: "text-[#c4b5fd] hover:text-[#ddd6fe]",
          placeholderGradient: "from-purple-950 via-slate-900 to-black",
          coverBorder: "border-purple-500/40",
          icon: <BookOpen className="size-4 text-white" />,
          smallIcon: <BookOpen className="size-3.5 fill-current" />,
        };
      default:
        return {
          name: rawFormat || "FILE",
          ribbonClass: "bg-slate-700 text-white",
          btnClass: "bg-blue-600 hover:bg-blue-500 text-white",
          linkClass: "text-cyan-400 hover:text-cyan-300",
          placeholderGradient: "from-slate-800 via-slate-900 to-black",
          coverBorder: "border-slate-500/40",
          icon: <File className="size-4 text-white" />,
          smallIcon: <File className="size-3.5 fill-current" />,
        };
    }
  })();

  const sellerDisplayName =
    product.seller_username
      ? `@${product.seller_username}`
      : product.seller_first_name
      ? product.seller_first_name
      : "Verified Seller";

  const resolvedImage = resolveImageUrl(product.screenshot_url);

  return (
    <Link
      href={`/digital-products/${product.id}`}
      className="group relative flex overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500/60 hover:shadow-xl hover:shadow-black/50 block text-left"
    >
      {/* Left Vertical File Format Ribbon (matching ChannelCard) */}
      <div
        className={`flex w-12 sm:w-16 shrink-0 flex-col items-center justify-center gap-3 py-4 select-none ${formatConfig.ribbonClass}`}
      >
        <div className="shrink-0">{formatConfig.icon}</div>
        <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold tracking-wider uppercase opacity-95">
          {formatConfig.name}
        </span>
      </div>

      {/* Main Card Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between space-y-4 p-4 sm:space-y-4">
        {/* Top Header Row: Cover Image Thumbnail / Placeholder + Product Details + Actions */}
        <div className="flex items-start justify-between gap-2.5">
          {/* Cover Image & Product Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Cover Image / Cover Placeholder */}
            <div
              className={`w-14 h-20 sm:w-16 sm:h-22 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 bg-slate-800/90 shadow-inner flex items-center justify-center relative border-l-2 ${formatConfig.coverBorder}`}
            >
              {resolvedImage ? (
                <img
                  src={resolvedImage}
                  alt={displayTitle}
                  className="size-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.parentElement?.querySelector(".cover-placeholder");
                    if (fallback) fallback.classList.remove("hidden");
                  }}
                />
              ) : null}

              {/* Cover Image Placeholder (shown if no screenshot or upon load error) */}
              <div
                className={`cover-placeholder size-full flex flex-col items-center justify-between p-1.5 select-none relative bg-gradient-to-b ${formatConfig.placeholderGradient} text-white ${
                  resolvedImage ? "hidden" : ""
                }`}
              >
                {/* Top format tag */}
                <span className="text-[8px] font-bold tracking-wider uppercase text-white/70">
                  {formatConfig.name}
                </span>

                {/* Center icon with subtle drop shadow */}
                <div className="my-auto drop-shadow-md opacity-90 transform group-hover:scale-110 transition-transform">
                  {formatConfig.icon}
                </div>

                {/* Bottom label */}
                <span className="text-[8px] font-extrabold tracking-widest uppercase text-white/80 bg-white/10 px-1 py-0.5 rounded w-full text-center">
                  COVER
                </span>
              </div>
            </div>

            {/* Product Title & Subcategory Badges */}
            <div className="min-w-0 flex-1 space-y-1">
              {/* Row 1: NEW Badge + Product Name */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                  NEW
                </span>
                <h3
                  className="truncate text-sm font-bold text-white leading-tight group-hover:text-[#D4AF37] transition-colors"
                  title={displayTitle}
                >
                  {displayTitle}
                </h3>
              </div>

              {/* Row 2: Subcategory descriptor with signal bars */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition ${formatConfig.linkClass}`}
                >
                  <span className="shrink-0">{formatConfig.smallIcon}</span>
                  <span className="truncate">{product.subcategory || "Digital Resource"}</span>
                  {/* Signal bars indicator (📶) */}
                  <div className="flex items-end gap-0.5 h-3 ml-0.5 shrink-0" title="Verified Digital Resource">
                    <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="w-0.5 h-2 bg-emerald-400 rounded-full" />
                    <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full" />
                    <span className="w-0.5 h-3 bg-emerald-400 rounded-full" />
                  </div>
                </span>
              </div>

              {/* Row 3: Category tag */}
              <div className="pt-0.5">
                <span className="inline-block rounded-md bg-[#1a2333]/90 border border-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {product.subcategory || "Ebooks & Digital Products"}
                </span>
              </div>

              {/* Row 4: Quality tag */}
              <div>
                <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Verified Digital Product
                </span>
              </div>
            </div>
          </div>

          {/* Details Button at top right + Star Icon underneath */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition group-hover:bg-white/[0.1] group-hover:text-white">
              Details
            </span>

            <button
              type="button"
              onClick={toggleFavorite}
              title={starred ? "Remove favorite" : "Add to favorites"}
              className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-amber-400 transition"
            >
              <Star
                size={16}
                className={
                  starred
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-500 hover:text-slate-300"
                }
              />
            </button>
          </div>
        </div>

        {/* Stats Row (Middle Box matching ChannelCard) */}
        <div className="flex min-h-[52px] items-center justify-between rounded-xl border border-white/[0.06] bg-[#0c1018]/90 px-3 py-2 text-[11px]">
          {/* Stat 1: Pages / Length */}
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-cyan-400 shrink-0" />
            <div className="flex flex-col text-left leading-tight">
              <span className="font-bold text-white text-xs">
                {product.page_count && Number(product.page_count) > 0
                  ? `${product.page_count} Pages`
                  : `${rawFormat} File`}
              </span>
              <span className="text-slate-400 text-[10px]">
                {product.page_count && Number(product.page_count) > 0 ? "Length" : "Format"}
              </span>
            </div>
          </div>

          {/* Stat 2: Language */}
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-cyan-400 shrink-0" />
            <div className="flex flex-col text-left leading-tight">
              <span className="font-bold text-white text-xs truncate max-w-[85px]">
                {product.language || "English"}
              </span>
              <span className="text-slate-400 text-[10px]">Language</span>
            </div>
          </div>

          {/* Stat 3: Status Badge */}
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACTIVE
            </span>
          </div>
        </div>

        {/* Bottom Seller & Price Footer with CTA */}
        <div className="flex items-center justify-between pt-1">
          {/* Seller Info */}
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="size-6 rounded-full bg-slate-800 border border-white/10 grid place-items-center text-slate-400 text-[10px] font-bold shrink-0">
              <User size={12} />
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-[10px] text-slate-400 leading-none">Seller</span>
              <span
                className="text-xs font-medium text-slate-200 truncate max-w-[100px] sm:max-w-[130px]"
                title={sellerDisplayName}
              >
                {sellerDisplayName}
              </span>
            </div>
          </div>

          {/* Price & View CTA Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block leading-none">
                Price
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#D4AF37] tracking-tight">
                {Number(product.price || 0).toLocaleString()}{" "}
                <span className="text-xs font-semibold text-slate-400">ETB</span>
              </span>
            </div>

            <span
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-md transition ${formatConfig.btnClass}`}
            >
              <Eye size={13} />
              <span>View</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
