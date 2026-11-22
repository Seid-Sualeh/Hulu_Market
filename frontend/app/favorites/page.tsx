"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { fetchBackend, resolveImageUrl } from "@/lib/api";
import {
  ExternalLink,
  Eye,
  Heart,
  RefreshCw,
  Send,
  ShoppingBag,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

interface FavoriteItem {
  id: string | number;
  channel_id?: number;
  title: string;
  category: string;
  platform?: string;
  spec?: string;
  subscribers?: string;
  views_or_likes?: string;
  price?: number | string | null;
  link_url?: string;
  created_at?: string;
}

export default function FavoritesPage() {
  const { user, mounted } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  // Load real favorites from MySQL database (with local sync)
  const loadFavorites = async () => {
    setLoading(true);
    try {
      let dbFavorites: FavoriteItem[] = [];
      if (user?.id) {
        try {
          const res = await fetchBackend(`user/favorites?userId=${user.id}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.favorites)) {
            dbFavorites = data.favorites.map((f: any) => ({
              id: f.id,
              channel_id: f.id,
              title: f.name,
              category: f.category || "Social Media Channels",
              platform: f.platform,
              subscribers: f.subscribers,
              views_or_likes: f.views_or_likes,
              spec: `${f.subscribers || "0"} followers • ${f.views_or_likes || "Active"}`,
              price: f.price,
              link_url: f.link_url,
              created_at: f.favorited_at || f.created_at,
            }));
          }
        } catch (dbErr) {
          console.warn("[Favorites DB Fetch Warning]:", dbErr);
        }
      }

      // Read local favorites
      let localFavorites: FavoriteItem[] = [];
      const stored = localStorage.getItem("hulu_favorites");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localFavorites = parsed.filter(
              (item: any) =>
                !String(item.id).startsWith("fav-house") &&
                !String(item.id).startsWith("fav-veh") &&
                item.title !== "Siifan" &&
                item.title !== "USTAZ KHALID (Official)"
            );
          }
        } catch {}
      }

      // Merge DB favorites and local favorites (avoiding duplicates)
      const mergedMap = new Map<string, FavoriteItem>();

      // Put db favorites first
      for (const item of dbFavorites) {
        const key = String(item.channel_id || item.id).replace(/^db-/, "");
        mergedMap.set(key, item);
      }

      // Merge local favorites and auto-sync any unsynced items to MySQL
      for (const item of localFavorites) {
        const rawId = String(item.channel_id || item.id).replace(/^db-/, "");
        if (!mergedMap.has(rawId)) {
          mergedMap.set(rawId, item);

          // If logged in and this item wasn't in DB, sync it to MySQL
          if (user?.id && !isNaN(parseInt(rawId, 10))) {
            fetchBackend("user/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, channelId: parseInt(rawId, 10) }),
            }).catch(() => {});
          }
        }
      }

      const mergedList = Array.from(mergedMap.values());
      setFavorites(mergedList);
      localStorage.setItem("hulu_favorites", JSON.stringify(mergedList));
    } catch (err) {
      console.error("[Favorites Load Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();

    const handleSync = () => {
      loadFavorites();
    };

    window.addEventListener("hulu_favorites_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("hulu_favorites_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [user?.id]);

  const removeFavorite = async (id: string | number) => {
    const cleanId = String(id).replace(/^db-/, "").trim();
    // Optimistic UI update
    const updated = favorites.filter(
      (item) =>
        String(item.id) !== String(id) &&
        String(item.channel_id) !== String(id) &&
        String(item.id).replace(/^db-/, "") !== cleanId &&
        String(item.channel_id).replace(/^db-/, "") !== cleanId
    );
    setFavorites(updated);
    localStorage.setItem("hulu_favorites", JSON.stringify(updated));
    window.dispatchEvent(new Event("hulu_favorites_updated"));

    // Sync deletion with MySQL if logged in
    if (user?.id && cleanId && !isNaN(parseInt(cleanId, 10))) {
      try {
        await fetchBackend(`user/favorites/${cleanId}?userId=${user.id}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete favorite from MySQL", err);
      }
    }
  };

  const clearAllFavorites = async () => {
    if (!confirm("Are you sure you want to remove all saved favorites?")) return;
    setFavorites([]);
    localStorage.setItem("hulu_favorites", JSON.stringify([]));
    window.dispatchEvent(new Event("hulu_favorites_updated"));

    if (user?.id) {
      for (const fav of favorites) {
        try {
          await fetchBackend(`user/favorites/${fav.id}?userId=${user.id}`, {
            method: "DELETE",
          });
        } catch {}
      }
    }
  };

  const filteredList = favorites.filter((item) => {
    if (selectedPlatform === "All") return true;
    return item.platform?.toLowerCase() === selectedPlatform.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Favorites
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {favorites.length} saved channel listing{favorites.length === 1 ? "" : "s"} &bull; Live MySQL synchronization
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadFavorites}
              className="p-2.5 rounded-xl border border-white/10 bg-[#161d2b]/70 hover:bg-[#1a2333] text-slate-300 hover:text-white transition"
              title="Refresh favorites"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {favorites.length > 0 && (
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
              className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Browse Marketplace</span>
            </Link>
          </div>
        </div>

        {/* Platform Filters Bar */}
        {favorites.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {["All", "Telegram", "YouTube", "TikTok", "Instagram", "Facebook"].map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setSelectedPlatform(platform)}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 font-medium ${
                  selectedPlatform === platform
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-slate-800 bg-[#111722]/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[380px]">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-500">
              <RefreshCw size={24} className="animate-spin mx-auto text-amber-400 mb-2" />
              <span>Loading saved favorites from database...</span>
            </div>
          ) : favorites.length === 0 || filteredList.length === 0 ? (
            /* Empty State */
            <div className="bg-[#111722]/60 border border-slate-800/80 rounded-2xl p-12 text-center max-w-sm mx-auto space-y-4 my-8">
              <div className="w-16 h-16 rounded-2xl bg-[#18202d] border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto shadow-inner">
                <StarOff className="w-8 h-8 stroke-[1.5]" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-200">
                  {favorites.length === 0 ? "No Saved Favorites Yet" : "No Matches for this Filter"}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  {favorites.length === 0
                    ? "Browse the marketplace and click the star icon on any channel listing to save it here."
                    : "Try selecting 'All' to see all your saved channels."}
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
            /* Populated Real Favorites Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#111722]/90 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between gap-5 relative group shadow-sm"
                >
                  <div>
                    {/* Top Bar inside card */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {item.platform || "Channel"}
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

                    {item.spec && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {item.spec}
                      </p>
                    )}

                    {item.link_url && (
                      <a
                        href={item.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 mt-2 underline"
                      >
                        <span>Open Channel</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {/* Bottom: Price & Action */}
                  <div className="pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                        Asking Price
                      </span>
                      <span className="text-lg font-bold text-amber-400">
                        {item.price != null ? Number(item.price).toLocaleString() : "—"} ETB
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/social-media"
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View in Market</span>
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
