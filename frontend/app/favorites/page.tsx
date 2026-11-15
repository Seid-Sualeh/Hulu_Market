"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bookmark,
  CarFront,
  CheckCircle2,
  ExternalLink,
  Eye,
  Heart,
  House,
  Monitor,
  PanelsTopLeft,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

interface FavoriteItem {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  platform?: "telegram" | "youtube" | "tiktok" | "instagram" | "other";
  spec: string;
  price: number;
  location?: string;
  savedDate: string;
  verified: boolean;
  handle?: string;
}

export default function FavoritesPage() {
  const [showDemoFavorites, setShowDemoFavorites] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    {
      id: "fav-1",
      title: "Ethio Tech & Startup Hub",
      category: "Social Media Channels",
      categorySlug: "social-media",
      platform: "telegram",
      handle: "@ethio_tech_hub",
      spec: "64,200 members • Daily Tech News",
      price: 32000,
      savedDate: "Saved 2 days ago",
      verified: true,
    },
    {
      id: "fav-2",
      title: "Luxury 3-Bed Apartment (Bole Atlas)",
      category: "Houses & Properties",
      categorySlug: "houses-properties",
      spec: "185 sqm • 3 Bed 2 Bath • 5th Floor",
      price: 18500000,
      location: "Addis Ababa, Bole Atlas",
      savedDate: "Saved 4 days ago",
      verified: true,
    },
    {
      id: "fav-3",
      title: "Toyota RAV4 2022 (Hybrid, Full Option)",
      category: "Vehicles",
      categorySlug: "vehicles",
      spec: "Automatic • 18,000 km • Pearl White",
      price: 7800000,
      location: "Addis Ababa",
      savedDate: "Saved 1 week ago",
      verified: true,
    },
    {
      id: "fav-4",
      title: "Habesha Gourmet Cooking Academy",
      category: "Social Media Channels",
      categorySlug: "social-media",
      platform: "youtube",
      handle: "@habeshacooking",
      spec: "118,000 subscribers • Monetized",
      price: 48000,
      savedDate: "Saved 2 weeks ago",
      verified: true,
    },
  ]);

  const displayedList = showDemoFavorites ? favorites : [];

  const filteredList = displayedList.filter((item) => {
    if (selectedCategory === "All") return true;
    return item.category === selectedCategory;
  });

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAllFavorites = () => {
    setFavorites([]);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Star className="w-6 h-6 stroke-[1.8] fill-amber-400/20 text-amber-400" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Favorites
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {displayedList.length} saved
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Saved channels, properties, vehicles, and products you are watching
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowDemoFavorites(!showDemoFavorites)}
              className="px-3.5 py-2 rounded-xl border border-slate-700/80 bg-[#161d2b]/70 hover:bg-[#1a2333] text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDemoFavorites ? "Show Empty State" : "Restore Demo Favorites"}</span>
            </button>

            {displayedList.length > 0 && (
              <button
                type="button"
                onClick={clearAllFavorites}
                className="px-3.5 py-2 rounded-xl border border-slate-800 bg-[#111722] hover:bg-rose-500/10 text-xs font-medium text-rose-400 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <Link
              href="/social-media"
              className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Browse Marketplace</span>
            </Link>
          </div>
        </div>

        {/* Category Filters Bar */}
        {displayedList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {["All", "Social Media Channels", "Houses & Properties", "Vehicles"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 font-medium ${
                  selectedCategory === cat
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-slate-800 bg-[#111722]/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[420px]">
          {displayedList.length === 0 || filteredList.length === 0 ? (
            /* Empty State matching design system */
            <div className="bg-[#111722]/60 border border-slate-800/80 rounded-2xl p-12 text-center max-w-sm mx-auto space-y-4 my-8">
              <div className="w-16 h-16 rounded-2xl bg-[#18202d] border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto shadow-inner">
                <StarOff className="w-8 h-8 stroke-[1.5]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-100">
                  No favorites saved yet
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Browse the marketplace and tap the star icon on any channel or listing to keep track of it here.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/social-media"
                  className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                  <span>EXPLORE MARKETPLACE</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Populated Favorites Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#111722]/90 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between gap-5 relative group shadow-sm"
                >
                  {/* Top Bar inside card */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {item.category}
                      </span>

                      {/* Remove / Star Button */}
                      <button
                        type="button"
                        onClick={() => removeFavorite(item.id)}
                        className="text-amber-400 hover:text-rose-400 transition-colors p-1"
                        title="Remove from favorites"
                      >
                        <Star className="w-4 h-4 fill-amber-400" />
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    {item.handle && (
                      <p className="text-xs text-teal-400 font-mono mt-0.5">
                        {item.handle}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {item.spec}
                    </p>

                    {item.location && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        📍 {item.location}
                      </p>
                    )}
                  </div>

                  {/* Bottom: Price & Action */}
                  <div className="pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                        Asking Price
                      </span>
                      <span className="text-lg font-bold text-white">
                        {item.price.toLocaleString()} ETB
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${item.categorySlug}`}
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Link>

                      <Link
                        href="/inbox"
                        className="flex-1 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-slate-950 font-bold text-xs text-center transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Inquire</span>
                      </Link>
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
