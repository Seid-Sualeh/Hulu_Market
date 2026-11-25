"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Presentation,
  Archive,
  File,
  Globe,
  User,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  Layers,
  Clock,
  Loader2,
  AlertCircle,
  Eye,
  Lock,
  X,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { fetchBackend, resolveImageUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DigitalProductCard from "@/components/digital-products/DigitalProductCard";
import type { DigitalProductItem } from "@/components/digital-products/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DigitalProductDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const rawId = unwrappedParams.id;
  const productId = parseInt(rawId, 10);

  const [product, setProduct] = useState<DigitalProductItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Related products state
  const [relatedProducts, setRelatedProducts] = useState<DigitalProductItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);

  // Authentication & purchase states
  const { signedIn, user, refreshUser } = useAuth();
  const [purchaseModalOpen, setPurchaseModalOpen] = useState<boolean>(false);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [conflictOrderId, setConflictOrderId] = useState<number | null>(null);

  const isOwner = Boolean(
    user?.id && product && Number(user.id) === Number(product.seller_id)
  );

  const handleInitiateBuy = () => {
    if (!product) return;
    if (!signedIn || !user) {
      router.push(`/auth?redirect=${encodeURIComponent(`/digital-products/${productId}`)}`);
      return;
    }
    setPurchaseError(null);
    setPurchaseSuccess(null);
    setConflictOrderId(null);
    setPurchaseModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!product) return;
    setPurchasing(true);
    setPurchaseError(null);
    setConflictOrderId(null);

    try {
      const res = await fetchBackend("escrow/order/digital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: product.id,
        }),
      });

      const data = await res.json();
      if (res.status === 201 && data.success) {
        try {
          localStorage.removeItem("hulu_pending_buy");
        } catch {}
        refreshUser?.();
        setPurchaseSuccess(
          `Escrow order #${data.orderId} created successfully! Redirecting to your transaction chat...`
        );
        setTimeout(() => {
          router.push(`/inbox?orderId=${data.orderId}`);
        }, 1500);
      } else if (res.status === 409) {
        setPurchaseError(
          data.error || "An active escrow trade is already in progress for this digital product."
        );
        if (data.orderId) {
          setConflictOrderId(data.orderId);
        }
      } else {
        setPurchaseError(data.error || "Failed to initiate escrow purchase.");
      }
    } catch {
      setPurchaseError("Network error. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  // Load product details
  useEffect(() => {
    if (isNaN(productId) || productId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setNotFound(false);

    async function fetchDetails() {
      try {
        const res = await fetchBackend(`channels/${productId}`);
        if (res.status === 404) {
          if (isMounted) setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to load product details (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (data.success && data.channel) {
          if (isMounted) {
            setProduct(data.channel);
          }
        } else {
          if (isMounted) setNotFound(true);
        }
      } catch (err: unknown) {
        console.error("[DigitalProductDetails] Error:", err);
        if (isMounted) {
          setError((err as Error).message || "An unexpected error occurred while loading this product.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Load related products
  useEffect(() => {
    if (!product) return;
    const currentProduct = product;

    let isMounted = true;
    setLoadingRelated(true);

    async function fetchRelated() {
      try {
        // Query same subcategory if available
        let url = `channels?listing_type=ebooks-digital&limit=6`;
        if (currentProduct.subcategory) {
          url += `&subcategory=${encodeURIComponent(currentProduct.subcategory)}`;
        }

        const res = await fetchBackend(url);
        if (!res.ok) return;

        const data = await res.json();
        if (data.success && Array.isArray(data.channels)) {
          // Filter out current product
          let list = data.channels.filter((c: any) => c.id !== currentProduct.id);

          // If same subcategory had fewer than 2 items, fetch general digital products
          if (list.length === 0) {
            const fallbackRes = await fetchBackend("channels?listing_type=ebooks-digital&limit=5");
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (fallbackData.success && Array.isArray(fallbackData.channels)) {
                list = fallbackData.channels.filter((c: any) => c.id !== currentProduct.id);
              }
            }
          }

          if (isMounted) {
            setRelatedProducts(list.slice(0, 4));
          }
        }
      } catch (err) {
        console.warn("[RelatedProducts] Fetch failed:", err);
      } finally {
        if (isMounted) setLoadingRelated(false);
      }
    }

    fetchRelated();

    return () => {
      isMounted = false;
    };
  }, [product]);

  // Format styles helper
  const getFormatBadge = (fmt: string) => {
    const clean = (fmt || "PDF").toUpperCase();
    switch (clean) {
      case "PDF":
        return {
          icon: FileText,
          bg: "bg-rose-500/10",
          border: "border-rose-500/30",
          text: "text-rose-400",
          accent: "text-rose-400",
          glow: "from-rose-500/10 via-rose-500/5 to-transparent",
        };
      case "DOC":
      case "DOCX":
        return {
          icon: FileText,
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          accent: "text-blue-400",
          glow: "from-blue-500/10 via-blue-500/5 to-transparent",
        };
      case "PPT":
      case "PPTX":
        return {
          icon: Presentation,
          bg: "bg-orange-500/10",
          border: "border-orange-500/30",
          text: "text-orange-400",
          accent: "text-orange-400",
          glow: "from-orange-500/10 via-orange-500/5 to-transparent",
        };
      case "ZIP":
        return {
          icon: Archive,
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          accent: "text-amber-400",
          glow: "from-amber-500/10 via-amber-500/5 to-transparent",
        };
      default:
        return {
          icon: File,
          bg: "bg-slate-500/10",
          border: "border-slate-500/30",
          text: "text-slate-300",
          accent: "text-slate-300",
          glow: "from-slate-500/10 via-slate-500/5 to-transparent",
        };
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-48 rounded bg-white/5" />

        {/* Two-column layout skeleton */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 h-[420px] rounded-3xl border border-white/5 bg-[#121722]" />
          <div className="lg:col-span-7 space-y-6">
            <div className="h-6 w-32 rounded bg-white/10" />
            <div className="h-10 w-3/4 rounded bg-white/10" />
            <div className="h-14 w-48 rounded-2xl bg-white/5" />
            <div className="h-28 rounded-2xl bg-white/5" />
            <div className="h-36 rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Found State
  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center space-y-6">
        <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37]">
          <AlertCircle className="size-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Digital Product Not Found
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          The requested digital resource does not exist, is currently under administrator moderation, or is unavailable in the public catalog.
        </p>
        <div className="pt-2">
          <Link
            href="/digital-products"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:brightness-110 shadow-lg shadow-[#D4AF37]/20"
          >
            <ArrowLeft className="size-4" />
            <span>Browse All Digital Products</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Error State
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Error Loading Listing</h2>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/10 bg-[#121722] px-5 py-2 text-xs font-semibold text-white hover:bg-white/5 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const format = (product.file_format || "PDF").toUpperCase();
  const badgeStyle = getFormatBadge(format);
  const FormatIcon = badgeStyle.icon;
  const displayTitle = product.title || product.name || "Untitled Digital Product";

  const sellerDisplayName =
    product.seller_username
      ? `@${product.seller_username}`
      : product.seller_first_name
      ? product.seller_first_name
      : "Verified Seller";

  const formattedDate = product.created_at
    ? new Date(product.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recently listed";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* 1. Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Back Link */}
        <Link
          href="/digital-products"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#121722] px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-[#D4AF37]/40 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Digital Products</span>
        </Link>

        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/marketplace" className="hover:text-slate-200 transition">
            Marketplace
          </Link>
          <ChevronRight className="size-3 text-slate-600" />
          <Link href="/digital-products" className="hover:text-slate-200 transition">
            Digital Products
          </Link>
          {product.subcategory && (
            <>
              <ChevronRight className="size-3 text-slate-600" />
              <span className="text-slate-300">{product.subcategory}</span>
            </>
          )}
          <ChevronRight className="size-3 text-slate-600" />
          <span className="truncate max-w-[200px] text-[#D4AF37] font-medium" title={displayTitle}>
            {displayTitle}
          </span>
        </div>
      </div>

      {/* 2. Main Product Showcase Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Visual Preview / Document Illustration (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#141b27] via-[#0f141f] to-[#0a0d14] p-6 shadow-2xl">
            {/* Ambient Format Glow */}
            <div
              className={`absolute inset-x-0 top-0 h-44 bg-gradient-to-b ${badgeStyle.glow} pointer-events-none opacity-50`}
            />

            {/* If an authorized visual screenshot exists, display it safely */}
            {product.screenshot_url ? (
              <div className="space-y-4">
                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-bold text-teal-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Authorized Preview</span>
                  </span>
                  <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}>
                    {format}
                  </span>
                </div>

                <div className="relative z-10 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(product.screenshot_url)}
                    alt={`${displayTitle} preview`}
                    className="w-full max-h-[380px] object-contain object-center transition duration-300 hover:scale-[1.02]"
                  />
                </div>
              </div>
            ) : (
              /* High-fidelity Document Format Illustration Placeholder */
              <div className="relative z-10 flex flex-col items-center justify-center py-12 text-center space-y-6">
                <div
                  className={`grid size-28 place-items-center rounded-3xl border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text} shadow-xl shadow-${badgeStyle.text}/10`}
                >
                  <FormatIcon className="size-14" />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Verified & Approved Resource</span>
                  </span>
                  <h4 className="text-base font-bold text-white pt-1">
                    {format} Digital Resource
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    {product.subcategory || "Digital Product"} &bull; {product.language || "Universal"}
                  </p>
                </div>

                {/* Disclaimer avoiding claims of full document preview */}
                <div className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left flex items-start gap-3">
                  <Info className="size-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    No document preview currently attached for this listing. Complete original digital files will be securely transferred upon order fulfillment.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Secure Marketplace Assurance Badge */}
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 flex items-center gap-3.5">
            <div className="grid size-10 place-items-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Escrow-Protected Digital Market</h5>
              <p className="text-[11px] text-slate-400">
                All transactions are held safely in Hulu Escrow until the verified digital resource is received.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Full Product Information (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header & Badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* File Format Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold tracking-wide ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}
              >
                <FormatIcon className="size-3.5" />
                <span>{format} Document</span>
              </span>

              {/* Subcategory */}
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
                {product.subcategory || "Digital Product"}
              </span>

              {/* Status */}
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400">
                <CheckCircle2 className="size-3" />
                <span>Active</span>
              </span>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {displayTitle}
            </h1>
          </div>

          {/* Price & Purchase Action Box */}
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#121722] to-[#0d1118] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
                  Selling Price
                </span>
                <div className="text-3xl font-black text-[#D4AF37] tracking-tight">
                  {Number(product.price || 0).toLocaleString()} <span className="text-xl font-bold">ETB</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 max-w-xs sm:text-right">
                Verified fixed pricing in Ethiopian Birr with zero hidden buyer commissions.
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {isOwner ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-300">
                  <User className="size-4" />
                  <span>Your Listing (Seller View — Direct Purchases Disabled)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInitiateBuy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#b5922f] px-7 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-950/20 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
                >
                  <ShieldCheck className="size-4 text-slate-950" />
                  <span>Buy with Escrow</span>
                  <ArrowRight className="size-4 text-slate-950" />
                </button>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Lock className="size-3.5 text-[#D4AF37]" />
                <span>Escrow-Protected Reusable Digital Asset</span>
              </div>
            </div>
          </div>

          {/* Key Specifications Grid */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#101520] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="size-3.5 text-[#D4AF37]" />
              <span>Document Specifications</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {/* Subcategory */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Category</span>
                <span className="text-xs font-semibold text-slate-200 mt-0.5 block truncate">
                  {product.subcategory || "Digital Product"}
                </span>
              </div>

              {/* Format */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">File Format</span>
                <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                  {format}
                </span>
              </div>

              {/* Page Count */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Page Count</span>
                <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                  {product.page_count && Number(product.page_count) > 0
                    ? `${product.page_count} ${Number(product.page_count) === 1 ? "Page" : "Pages"}`
                    : "Not Specified"}
                </span>
              </div>

              {/* Language */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Language</span>
                <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                  {product.language || "English"}
                </span>
              </div>

              {/* Date Listed */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Listed On</span>
                <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                  {formattedDate}
                </span>
              </div>

              {/* Availability */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Availability</span>
                <span className="text-xs font-semibold text-teal-400 mt-0.5 block flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  <span>Available</span>
                </span>
              </div>
            </div>
          </div>

          {/* Full Description Section */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#101520] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="size-3.5 text-[#D4AF37]" />
              <span>Full Description & Summary</span>
            </h3>

            <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
              {product.description || "No detailed description provided by the seller."}
            </div>
          </div>

          {/* Seller Information Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#101520] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-white/5 border border-white/10 text-[#D4AF37]">
                <User className="size-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Listed by Seller
                </span>
                <h4 className="text-sm font-bold text-white">
                  {sellerDisplayName}
                </h4>
                <p className="text-[11px] text-teal-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="size-3" />
                  <span>Authorized Hulu Market Seller</span>
                </p>
              </div>
            </div>

            <span className="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.02]">
              Verified Partner
            </span>
          </div>
        </div>
      </div>

      {/* 3. Related Digital Products Section */}
      <div className="pt-6 border-t border-white/[0.08] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">
              Related Digital Products
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              More approved educational and digital resources from {product.subcategory || "this category"}.
            </p>
          </div>

          <Link
            href="/digital-products"
            className="text-xs font-semibold text-[#D4AF37] hover:underline inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>

        {loadingRelated ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-white/5 bg-[#121722]"
              />
            ))}
          </div>
        ) : relatedProducts.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-xs text-slate-400">
            No additional related products currently available in this subcategory.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <DigitalProductCard key={item.id} product={item} />
            ))}
          </div>
        )}
      </div>

      {/* Purchase Confirmation Modal */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d131f] p-6 shadow-2xl shadow-black/90 space-y-5 text-left">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
                  Hulu Market Escrow
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Confirm Digital Purchase
                </h3>
              </div>
              <button
                type="button"
                disabled={purchasing}
                onClick={() => setPurchaseModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Product Summary */}
            <div className="rounded-2xl border border-white/5 bg-[#121722] p-4 space-y-2">
              <div className="text-xs text-slate-400 uppercase font-semibold">Selected Item</div>
              <div className="font-bold text-white text-base leading-snug">{displayTitle}</div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                <span className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 font-medium">
                  {product.subcategory || "Digital Product"}
                </span>
                <span className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 font-medium">
                  {format}
                </span>
                <span className="text-slate-400">by {sellerDisplayName}</span>
              </div>
            </div>

            {/* Price & Balance Breakdown */}
            <div className="rounded-2xl border border-white/5 bg-[#121722] p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Purchase Price</span>
                <span className="font-bold text-white">
                  {Number(product.price || 0).toLocaleString()} ETB
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Your Wallet Balance</span>
                <span className="font-bold text-white">
                  {Number(user?.balance || 0).toLocaleString()} ETB
                </span>
              </div>
              <div className="border-t border-white/5 pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Balance After Purchase</span>
                <span className={`font-bold ${Number(user?.balance || 0) < Number(product.price || 0) ? "text-rose-400" : "text-teal-400"}`}>
                  {(Number(user?.balance || 0) - Number(product.price || 0)).toLocaleString()} ETB
                </span>
              </div>
            </div>

            {/* Insufficient Funds Warning */}
            {Number(user?.balance || 0) < Number(product.price || 0) ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
                <div className="flex items-start gap-2.5 text-amber-300 text-xs">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <p>
                    Insufficient wallet balance. You need{" "}
                    <span className="font-bold">
                      {(Number(product.price || 0) - Number(user?.balance || 0)).toLocaleString()} ETB
                    </span>{" "}
                    more to complete this purchase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        "hulu_pending_buy",
                        JSON.stringify({
                          channelId: product.id,
                          channelName: product.title,
                          price: Number(product.price),
                        })
                      );
                    } catch {}
                    router.push(
                      `/deposit?redirect=${encodeURIComponent(`/digital-products/${productId}`)}&reason=insufficient_balance&needed=${Number(product.price)}`
                    );
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:brightness-110 cursor-pointer"
                >
                  <span>Deposit Funds & Continue</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 flex items-start gap-2.5 text-xs text-slate-300">
                <ShieldCheck className="size-4 text-teal-400 shrink-0 mt-0.5" />
                <p>
                  Funds will be safely locked in Hulu Market Escrow until you receive and verify the digital product in your transaction chat.
                </p>
              </div>
            )}

            {/* Feedback / Error Alerts */}
            {purchaseError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{purchaseError}</span>
                </div>
                {conflictOrderId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/inbox?orderId=${conflictOrderId}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    <span>Open Active Trade Chat (#{conflictOrderId})</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                )}
              </div>
            )}

            {purchaseSuccess && (
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-300 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-400 shrink-0" />
                <span>{purchaseSuccess}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={purchasing}
                onClick={() => setPurchaseModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              {Number(user?.balance || 0) >= Number(product.price || 0) && (
                <button
                  type="button"
                  disabled={purchasing || Boolean(purchaseSuccess)}
                  onClick={handleConfirmPurchase}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Locking in Escrow...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-3.5" />
                      <span>Confirm & Lock in Escrow</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
