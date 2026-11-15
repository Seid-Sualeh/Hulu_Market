"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  ListOrdered,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";

interface ListingItem {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  platform?: string;
  subscribers?: string;
  price: number;
  status: "Active" | "Sold Out" | "Rejected";
  date: string;
  image?: string;
  views: number;
  inquiries: number;
}

export default function MyMarketPlacePage() {
  const [activeTab, setActiveTab] = useState<"Active" | "Sold Out" | "Rejected">("Active");
  const [showDemoListings, setShowDemoListings] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Sample listings across the 7 marketplace categories when demo is toggled
  const sampleListings: ListingItem[] = [
    {
      id: "LST-8901",
      title: "@EthioCryptoHub (Verified Channel)",
      category: "Social Media Channels",
      categorySlug: "social-media",
      platform: "Telegram",
      subscribers: "48,500 members",
      price: 24500,
      status: "Active",
      date: "Nov 12, 2026",
      views: 342,
      inquiries: 18,
    },
    {
      id: "LST-8902",
      title: "Luxury 3-Bedroom Apartment (Bole Atlas)",
      category: "Houses & Properties",
      categorySlug: "houses-properties",
      subscribers: "185 sqm • 3 Bed 2 Bath",
      price: 18500000,
      status: "Active",
      date: "Nov 09, 2026",
      views: 890,
      inquiries: 45,
    },
    {
      id: "LST-8903",
      title: "Toyota RAV4 2022 (Hybrid, Full Option)",
      category: "Vehicles",
      categorySlug: "vehicles",
      subscribers: "18,000 km • Automatic",
      price: 7800000,
      status: "Sold Out",
      date: "Oct 28, 2026",
      views: 1420,
      inquiries: 76,
    },
    {
      id: "LST-8904",
      title: "MacBook Pro M2 Max 32GB 1TB",
      category: "Electronics",
      categorySlug: "electronics",
      subscribers: "Battery 98% • Mint Condition",
      price: 165000,
      status: "Rejected",
      date: "Oct 15, 2026",
      views: 45,
      inquiries: 2,
    },
  ];

  const listings = showDemoListings ? sampleListings : [];

  const activeCount = listings.filter((i) => i.status === "Active").length;
  const soldCount = listings.filter((i) => i.status === "Sold Out").length;
  const rejectedCount = listings.filter((i) => i.status === "Rejected").length;
  const totalCount = listings.length;

  const currentTabCount =
    activeTab === "Active"
      ? activeCount
      : activeTab === "Sold Out"
      ? soldCount
      : rejectedCount;

  const filteredListings = listings.filter((item) => {
    const matchesTab = item.status === activeTab;
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesTab && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Row: Matching design with "My Marketplace" title & "+ NEW LISTING" button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Layers / Market Icon Badge */}
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Layers className="w-6 h-6 stroke-[1.8]" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                My Marketplace
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {totalCount} total · {activeCount} live · {soldCount} sold · {rejectedCount} rejected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Demo Preview Toggle */}
            <button
              type="button"
              onClick={() => setShowDemoListings(!showDemoListings)}
              className="px-3.5 py-2 rounded-xl border border-slate-700/80 bg-[#161d2b]/70 hover:bg-[#1a2333] text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDemoListings ? "Show Empty State" : "Preview Sample Listings"}</span>
            </button>

            {/* + NEW LISTING Button (matches "+ NEW CHANNEL" from design) */}
            <Link
              href="/sell"
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>NEW LISTING</span>
            </Link>
          </div>
        </div>

        {/* 3 Metrics Cards: ACTIVE, SOLD OUT, REJECTED */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. ACTIVE */}
          <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                ACTIVE
              </p>
              <p className="text-2xl font-bold text-white mt-0.5">{activeCount}</p>
            </div>
          </div>

          {/* 2. SOLD OUT */}
          <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                SOLD OUT
              </p>
              <p className="text-2xl font-bold text-white mt-0.5">{soldCount}</p>
            </div>
          </div>

          {/* 3. REJECTED */}
          <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                REJECTED
              </p>
              <p className="text-2xl font-bold text-white mt-0.5">{rejectedCount}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs Pill Bar (Active, Sold Out, Rejected) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="inline-flex items-center gap-1 bg-[#111722]/90 border border-slate-800/80 p-1 rounded-xl w-fit">
            {/* Active Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("Active")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "Active"
                  ? "bg-[#d4af37] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active {activeCount}</span>
            </button>

            {/* Sold Out Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("Sold Out")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "Sold Out"
                  ? "bg-[#d4af37] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Sold Out {soldCount}</span>
            </button>

            {/* Rejected Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("Rejected")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "Rejected"
                  ? "bg-[#d4af37] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected {rejectedCount}</span>
            </button>
          </div>

          {/* Category Filter Pills (When items exist) */}
          {showDemoListings && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-400">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mr-1">
                Category:
              </span>
              {["All", "Social Media Channels", "Houses & Properties", "Vehicles", "Electronics"].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                      selectedCategory === cat
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-300 font-medium"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="bg-[#111722]/60 border border-slate-800/80 rounded-2xl p-8 md:p-12 min-h-[420px] flex flex-col items-center justify-center">
          {!showDemoListings || filteredListings.length === 0 ? (
            /* Empty State Container: Matching the reference image exactly */
            <div className="text-center max-w-sm mx-auto space-y-4 py-6">
              {/* Stacked Icon Badge */}
              <div className="w-16 h-16 rounded-2xl bg-[#18202d] border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto shadow-inner">
                <Layers className="w-8 h-8 stroke-[1.5]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base md:text-lg font-bold text-slate-100">
                  No {activeTab.toLowerCase()} listings yet
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  List your first item and start selling across Ethiopia on Hulu Marketplace.
                </p>
              </div>

              {/* Bottom Create Button matching reference image */}
              <div className="pt-2">
                <Link
                  href="/sell"
                  className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>CREATE LISTING</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Populated Marketplace Listings Grid */
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-[#0c111a] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {item.category}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          item.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : item.status === "Sold Out"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400">{item.subscribers}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 tracking-wider">
                        Listed Price
                      </p>
                      <p className="text-base font-bold text-white">
                        {item.price.toLocaleString()} ETB
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{item.views} views</span>
                      <span>•</span>
                      <span>{item.inquiries} inquiries</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
