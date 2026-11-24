"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { fetchBackend, resolveImageUrl } from "@/lib/api";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  ListOrdered,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Trash2,
  XCircle,
  UploadCloud,
  FileCheck,
  FileText,
  X,
  Loader2,
  Paperclip,
  ShieldCheck,
} from "lucide-react";

interface MyChannelListing {
  id: number;
  seller_id: number;
  name: string;
  platform: string;
  category: string;
  listing_type?: string;
  subcategory?: string;
  file_format?: string;
  page_count?: number | null;
  language?: string | null;
  digital_metadata?: string | Record<string, any> | null;
  subscribers: string;
  views_or_likes: string;
  price: number;
  link_url?: string;
  screenshot_url?: string;
  description?: string;
  rejection_reason?: string;
  status: "active" | "pending" | "sold" | "rejected";
  created_at: string;
}

type TabType = "all" | "active" | "pending" | "rejected" | "sold";

export default function MyMarketPlacePage() {
  const router = useRouter();
  const { user, mounted } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [channels, setChannels] = useState<MyChannelListing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyChannels = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetchBackend(`channels/my?sellerId=${user.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.channels)) {
        setChannels(data.channels);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyChannels();
  }, [user?.id]);

  const activeCount = channels.filter((c) => c.status === "active").length;
  const pendingCount = channels.filter((c) => c.status === "pending").length;
  const rejectedCount = channels.filter((c) => c.status === "rejected").length;
  const soldCount = channels.filter((c) => c.status === "sold").length;
  const totalCount = channels.length;

  // Digital Product File Attachment Modal State
  const [uploadModalListing, setUploadModalListing] = useState<MyChannelListing | null>(null);
  const [activeFileMeta, setActiveFileMeta] = useState<any | null>(null);
  const [loadingFileMeta, setLoadingFileMeta] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileUploadSuccess, setFileUploadSuccess] = useState<string | null>(null);

  const openFileUploadModal = async (listing: MyChannelListing) => {
    setUploadModalListing(listing);
    setSelectedFile(null);
    setFileUploadError(null);
    setFileUploadSuccess(null);
    setLoadingFileMeta(true);
    try {
      const res = await fetchBackend(`channels/${listing.id}/file`);
      const data = await res.json();
      if (data.success) {
        setActiveFileMeta(data.file);
      } else {
        setActiveFileMeta(null);
      }
    } catch {
      setActiveFileMeta(null);
    } finally {
      setLoadingFileMeta(false);
    }
  };

  const handleUploadDigitalFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalListing || !selectedFile) {
      setFileUploadError("Please select a file to upload.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setFileUploadError("File size exceeds 50 MB limit.");
      return;
    }

    setIsUploadingFile(true);
    setFileUploadError(null);
    setFileUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetchBackend(`channels/${uploadModalListing.id}/file`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.file) {
        setActiveFileMeta(data.file);
        setSelectedFile(null);
        setFileUploadSuccess("Original digital product file uploaded and secured.");
        loadMyChannels();
      } else {
        setFileUploadError(data.error || "Failed to upload digital file.");
      }
    } catch (err: unknown) {
      setFileUploadError((err as Error).message || "Network error uploading file.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteDigitalFile = async (listingId: number) => {
    if (!confirm("Are you sure you want to delete this attached file?")) return;
    setIsUploadingFile(true);
    setFileUploadError(null);
    setFileUploadSuccess(null);
    try {
      const res = await fetchBackend(`channels/${listingId}/file`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setActiveFileMeta(null);
        setFileUploadSuccess("File removed from listing.");
        loadMyChannels();
      } else {
        setFileUploadError(data.error || "Failed to delete file.");
      }
    } catch {
      setFileUploadError("Network error deleting file.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const filteredChannels = channels.filter((ch) => {
    if (activeTab === "all") return true;
    return ch.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Layers className="w-6 h-6 stroke-[1.8]" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                My Marketplace
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {totalCount} total listings &bull; {activeCount} published &bull; {pendingCount} pending review &bull; {rejectedCount} rejected &bull; {soldCount} sold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMyChannels}
              className="p-2.5 rounded-xl border border-white/10 bg-[#161d2b]/70 hover:bg-[#1a2333] text-slate-300 hover:text-white transition"
              title="Refresh listings"
            >
              <RefreshCw size={15} />
            </button>

            <Link
              href="/sell"
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>NEW LISTING</span>
            </Link>
          </div>
        </div>

        {/* 4 Status Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. ACTIVE / PUBLISHED */}
          <div
            onClick={() => setActiveTab("active")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all ${
              activeTab === "active"
                ? "bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/40"
                : "bg-[#111722] border-white/[0.06] hover:border-emerald-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                PUBLISHED
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{activeCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Live in public market</p>
          </div>

          {/* 2. PENDING REVIEW */}
          <div
            onClick={() => setActiveTab("pending")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all ${
              activeTab === "pending"
                ? "bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/40"
                : "bg-[#111722] border-white/[0.06] hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                PENDING REVIEW
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{pendingCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Under admin review</p>
          </div>

          {/* 3. REJECTED / NEEDS REVISION */}
          <div
            onClick={() => setActiveTab("rejected")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all ${
              activeTab === "rejected"
                ? "bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/40"
                : "bg-[#111722] border-white/[0.06] hover:border-rose-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                REJECTED
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
                <XCircle size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{rejectedCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Can edit &amp; resubmit</p>
          </div>

          {/* 4. SOLD OUT */}
          <div
            onClick={() => setActiveTab("sold")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all ${
              activeTab === "sold"
                ? "bg-sky-950/20 border-sky-500/50 shadow-md shadow-sky-950/40"
                : "bg-[#111722] border-white/[0.06] hover:border-sky-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                SOLD OUT
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
                <Package size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{soldCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Completed transfers</p>
          </div>
        </div>

        {/* Tab Filter Pills Bar */}
        <div className="inline-flex items-center gap-1 bg-[#111722] border border-white/[0.08] p-1.5 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-[#d4af37] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Listings ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "active"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Published ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "pending"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rejected")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "rejected"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sold")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "sold"
                ? "bg-sky-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sold Out ({soldCount})
          </button>
        </div>

        {/* Channel Listings Grid */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722]/80 p-6 sm:p-8 min-h-[380px]">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading your marketplace listings...</div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center max-w-sm mx-auto space-y-4 py-12">
              <div className="w-16 h-16 rounded-2xl bg-[#18202d] border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto shadow-inner">
                <Layers className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  No {activeTab === "all" ? "" : activeTab} listings found
                </h3>
                <p className="text-xs text-slate-400">
                  {activeTab === "pending"
                    ? "You don't have any channel listings currently under review."
                    : activeTab === "rejected"
                    ? "Great news! None of your channel submissions have been rejected."
                    : "Create a channel listing to start selling to verified buyers on Hulu Market."}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/sell"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/10"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>CREATE LISTING</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredChannels.map((item) => {
                const isDigital = item.listing_type === "ebooks-digital";
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-[#0c111a] border border-white/[0.06] hover:border-white/10 transition flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-3">
                      {/* Header Row: Platform/Category & Status Badge */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {isDigital ? (
                            <>
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                                <BookOpen size={11} />
                                {item.subcategory || "Digital Product"}
                              </span>
                              {item.file_format && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  {item.file_format}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {item.platform}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {item.category}
                              </span>
                            </>
                          )}
                        </div>

                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider border ${
                            item.status === "active"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : item.status === "pending"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : item.status === "sold"
                              ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {item.status === "active" ? "✓ Published" : item.status === "pending" ? "• Pending Review" : item.status === "sold" ? "Sold Out" : "✕ Rejected"}
                        </span>
                      </div>

                      {/* Displayed Channel / Product Name */}
                      <div>
                        <h4 className="text-base font-extrabold text-white">
                          {item.name}
                        </h4>
                        {isDigital ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                            {item.page_count && Number(item.page_count) > 0 ? (
                              <span>📄 {item.page_count} pages</span>
                            ) : null}
                            {item.language && (
                              <span>🌐 {item.language}</span>
                            )}
                            <span>&bull; Ebooks &amp; Digital Products</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.subscribers} followers / subscribers &bull; {item.views_or_likes || "Active"}
                          </p>
                        )}
                      </div>

                      {/* Description preview */}
                      {item.description && (
                        <p className="text-xs text-slate-300 bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Rejection Notice Banner with Edit & Resubmit Button */}
                      {item.status === "rejected" && (
                        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 space-y-2">
                          <div className="flex items-start gap-2 text-rose-300 text-xs">
                            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-rose-200">Rejection Reason: </span>
                              <span>{item.rejection_reason || "Verification could not be confirmed with the provided details."}</span>
                            </div>
                          </div>

                          <Link
                            href={`/sell?editChannelId=${item.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400 transition shadow-sm"
                          >
                            <Edit3 size={13} />
                            <span>Edit &amp; Resubmit for Review</span>
                          </Link>
                        </div>
                      )}

                      {/* Pending Review Notice */}
                      {item.status === "pending" && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300">
                          <Clock size={14} className="shrink-0 text-amber-400" />
                          <span>
                            {isDigital
                              ? "Our review officers are inspecting your digital product details. Review turnaround is within 2-4 hours."
                              : "Our review officers are inspecting your dashboard statistics. Review turnaround is within 2-4 hours."}
                          </span>
                        </div>
                      )}

                      {/* Digital File Attachment Manager Row */}
                      {isDigital && (
                        <div className="rounded-xl border border-white/[0.08] bg-[#101622] p-3 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="grid size-7 place-items-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                              <Paperclip size={14} />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                Original Digital Asset
                              </span>
                              <span className="text-xs font-semibold text-slate-200">
                                {Boolean((item.digital_metadata as any)?.file_attached)
                                  ? "✓ File Attached & Secured"
                                  : "No File Attached Yet"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openFileUploadModal(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/20 transition"
                          >
                            <UploadCloud size={14} />
                            <span>
                              {Boolean((item.digital_metadata as any)?.file_attached)
                                ? "Manage / Replace File"
                                : "Attach Original File"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottom Footer: Price & Link */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 tracking-wider">
                          Asking Price
                        </p>
                        <p className="text-base font-extrabold text-amber-400">
                          {Number(item.price).toLocaleString()} ETB
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.link_url && (
                          <a
                            href={item.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 underline"
                          >
                            <span>Channel Link</span>
                            <ExternalLink size={12} />
                          </a>
                        )}

                        {item.status === "active" && (
                          <Link
                            href={isDigital ? "/ebooks-digital-products" : "/social-media"}
                            className="rounded-lg bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-xs font-semibold text-teal-300 hover:bg-teal-500/25 transition"
                          >
                            View in Market
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Digital Product Secure File Upload Modal */}
      {uploadModalListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0e131d] p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  <span>Secure Private Asset Storage</span>
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {uploadModalListing.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setUploadModalListing(null)}
                className="grid size-8 place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Currently Attached File Card */}
            {loadingFileMeta ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                <span>Checking secure storage...</span>
              </div>
            ) : activeFileMeta ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <FileCheck size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                        Attached Original File
                      </span>
                      <p className="text-xs font-bold text-white truncate max-w-[220px]" title={activeFileMeta.original_filename}>
                        {activeFileMeta.original_filename}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                    {activeFileMeta.file_format}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-2 border-t border-emerald-500/15">
                  <div>
                    <span className="text-slate-500 block">File Size:</span>
                    <span>{(activeFileMeta.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <span className="text-emerald-400 font-semibold">✓ Verified &amp; Encrypted</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={isUploadingFile}
                    onClick={() => handleDeleteDigitalFile(uploadModalListing.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition"
                  >
                    <Trash2 size={12} />
                    <span>Delete Attached File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  No original digital file is attached to this product yet. Buyers cannot download resources until you attach the original file.
                </span>
              </div>
            )}

            {/* Upload or Replace Form */}
            <form onSubmit={handleUploadDigitalFile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  {activeFileMeta ? "Upload Replacement File" : "Select Original File"}
                </label>

                <div className="relative border-2 border-dashed border-white/10 hover:border-[#D4AF37]/50 rounded-2xl p-6 text-center transition bg-[#0a0e16]">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.epub,.txt,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setFileUploadError(null);
                        setFileUploadSuccess(null);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
                      <UploadCloud size={24} />
                    </div>
                    {selectedFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white truncate max-w-xs">{selectedFile.name}</p>
                        <p className="text-[11px] text-[#D4AF37]">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to upload
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-200">
                          Click or drag and drop your digital product
                        </p>
                        <p className="text-[11px] text-slate-500">
                          PDF, DOC, DOCX, PPT, PPTX, ZIP, EPUB, TXT, XLS, XLSX (Max 50 MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback messages */}
              {fileUploadError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {fileUploadError}
                </div>
              )}

              {fileUploadSuccess && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  {fileUploadSuccess}
                </div>
              )}

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalListing(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploadingFile}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2 text-xs font-bold text-slate-950 transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-50 shadow-md shadow-[#D4AF37]/20"
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Encrypting &amp; Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      <span>{activeFileMeta ? "Replace File" : "Upload File"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
