"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownAZ, ArrowUpDown, Coins, Filter, Loader2, Search, SlidersHorizontal, Users, X, Zap } from "lucide-react";
import PlatformFilter from "@/components/social-media/PlatformFilter";
import ChannelCard from "@/components/social-media/ChannelCard";
import PromoBanner from "@/components/social-media/PromoBanner";
import ChannelDetailPage from "@/components/social-media/ChannelDetailPage";
import { ChannelItem, PlatformType } from "@/components/social-media/types";
import { isUserSignedIn, useAuth } from "@/lib/auth";

type SortOption = "default" | "price_asc" | "price_desc" | "followers_desc" | "followers_asc";

function parseFollowerCount(val: string | number | undefined | null): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const s = String(val).trim().toUpperCase();
  if (s.endsWith("M")) return (parseFloat(s.replace("M", "")) || 0) * 1_000_000;
  if (s.endsWith("K")) return (parseFloat(s.replace("K", "")) || 0) * 1_000;
  return parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
}

export default function SocialMediaPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [platform, setPlatform] = useState<PlatformType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [buyingChannelId, setBuyingChannelId] = useState<string | null>(null);
  const [dbChannels, setDbChannels] = useState<ChannelItem[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const [pendingBuy, setPendingBuy] = useState<{
    channelId: string;
    channelName: string;
    price: number;
  } | null>(null);

  useEffect(() => {
    refreshUser?.();
    try {
      const stored = localStorage.getItem("hulu_pending_buy");
      if (stored) {
        setPendingBuy(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/channels");
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.warn("[Channels API non-JSON response]:", text);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.channels)) {
        const mapped: ChannelItem[] = data.channels.map((c: any) => ({
          id: `db-${c.id}`,
          dbId: c.id,
          sellerId: c.seller_id,
          sellerName: c.seller_name || "Verified Seller",
          name: c.name,
          platform: (c.platform || "telegram").toLowerCase() as PlatformType,
          category: c.category || "General",
          followers: c.subscribers || "0",
          followersLabel: (c.platform || "").toLowerCase() === "youtube" ? "Subscribers" : "Followers",
          engagement: c.views_or_likes || "Active",
          secondaryStat: c.views_or_likes || "Active",
          views_or_likes: c.views_or_likes || "Active",
          price: `${Number(c.price).toLocaleString()} ETB`,
          rawPrice: Number(c.price),
          linkText: c.name,
          linkUrl: c.link_url || "#",
          description: c.description || "",
          screenshot_url: c.screenshot_url || null,
          isNew: true,
          badgeTag: "Very Good Price",
          status: "ACTIVE",
          featured: false,
        }));
        setDbChannels(mapped);
      }
    } catch (err) {
      console.error("Failed to load live channels:", err);
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  // Sync selectedChannel with URL query param if present
  useEffect(() => {
    if (dbChannels.length > 0) {
      try {
        const params = new URLSearchParams(window.location.search);
        const channelParam = params.get("channel") || params.get("detail");
        if (channelParam) {
          const found = dbChannels.find((c) => c.id === channelParam || String(c.dbId) === channelParam);
          if (found) {
            setSelectedChannel(found);
          }
        }
      } catch {}
    }
  }, [dbChannels]);

  const handleDetails = (channel: ChannelItem) => {
    setSelectedChannel(channel);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("channel", channel.id);
      window.history.pushState({}, "", url.toString());
    } catch {}
  };

  const handleBackFromDetails = () => {
    setSelectedChannel(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("channel");
      url.searchParams.delete("detail");
      window.history.pushState({}, "", url.pathname + (url.search ? url.search : ""));
    } catch {}
  };

  const filteredChannels = useMemo(() => {
    // Only real database channels (no demo data)
    let list = [...dbChannels];

    // Filter by platform
    if (platform !== "all") {
      list = list.filter((ch) => ch.platform === platform);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          ch.category.toLowerCase().includes(q) ||
          ch.linkText.toLowerCase().includes(q)
      );
    }

    // Sort by criteria
    switch (sortBy) {
      case "price_asc":
        list.sort((a, b) => ((a as any).rawPrice || 0) - ((b as any).rawPrice || 0));
        break;
      case "price_desc":
        list.sort((a, b) => ((b as any).rawPrice || 0) - ((a as any).rawPrice || 0));
        break;
      case "followers_desc":
        list.sort((a, b) => parseFollowerCount(b.followers) - parseFollowerCount(a.followers));
        break;
      case "followers_asc":
        list.sort((a, b) => parseFollowerCount(a.followers) - parseFollowerCount(b.followers));
        break;
      default:
        break;
    }

    return list;
  }, [platform, searchQuery, dbChannels, sortBy]);

  const firstBatch = filteredChannels.slice(0, 3);
  const secondBatch = filteredChannels.slice(3);

  const handleBuy = async (channel: ChannelItem) => {
    // 1. Must be signed in
    if (!isUserSignedIn()) {
      router.push(`/auth?redirect=${encodeURIComponent("/social-media")}`);
      return;
    }

    const priceNum = (channel as any).rawPrice != null
      ? Number((channel as any).rawPrice)
      : parseFloat(channel.price.replace(/[^0-9.]/g, "")) || 0;

    // 2. Check balance
    const userBalance = Number(user?.balance) || 0;
    if (userBalance < priceNum) {
      try {
        localStorage.setItem(
          "hulu_pending_buy",
          JSON.stringify({ channelId: channel.id, channelName: channel.name, price: priceNum })
        );
      } catch {}
      router.push(
        `/deposit?redirect=/social-media&reason=insufficient_balance&needed=${priceNum}`
      );
      return;
    }

    // 3. Sufficient balance — initiate escrow
    setBuyingChannelId(channel.id);
    setPurchaseError(null);

    try {
      const res = await fetch("/api/escrow/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: (channel as any).dbId || null,
          channelName: channel.name,
          platform: channel.platform,
          price: priceNum,
          buyerId: user?.id,
          buyerName: user?.name || user?.email,
          sellerId: (channel as any).sellerId || null,
          sellerName: (channel as any).sellerName || "Verified Seller",
        }),
      });

      const data = await res.json();
      if (data.success) {
        try { localStorage.removeItem("hulu_pending_buy"); } catch {}
        setPendingBuy(null);
        refreshUser?.();
        setPurchaseSuccess(
          `Escrow trade #${data.orderId} created for "${channel.name}"! Redirecting to your Inbox...`
        );
        setTimeout(() => router.push("/inbox"), 1800);
      } else {
        setPurchaseError(data.error || "Failed to initiate escrow trade.");
      }
    } catch {
      setPurchaseError("Network error. Please try again.");
    } finally {
      setBuyingChannelId(null);
    }
  };

  // If a channel is selected for details, render the full dedicated Detail Page design
  if (selectedChannel) {
    return (
      <ChannelDetailPage
        channel={selectedChannel}
        onBack={handleBackFromDetails}
        onBuy={handleBuy}
        isBuying={buyingChannelId === selectedChannel.id}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Success Toast */}
      {purchaseSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-teal-500/40 bg-[#0e1722] p-4 text-sm text-teal-300 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-3">
          <Coins size={18} className="text-amber-400" />
          <span>{purchaseSuccess}</span>
          <button type="button" onClick={() => setPurchaseSuccess(null)} className="text-slate-400 hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Error Toast */}
      {purchaseError && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-[#1a0a0a] p-4 text-sm text-rose-300 shadow-2xl shadow-black/80">
          <span>{purchaseError}</span>
          <button type="button" onClick={() => setPurchaseError(null)} className="text-slate-400 hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Listing Channel
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium flex items-center gap-2">
            <span>
              {loadingChannels ? "Loading channels..." : `${filteredChannels.length} ${filteredChannels.length === 1 ? "channel" : "channels"} live`}
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-amber-400 font-medium">Everything You Need. One Marketplace.</span>
          </p>
        </div>

        {/* Filter / Sort Button with Dropdown */}
        <div className="relative">
          <button
            type="button"
            title="Filter channels"
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className={`grid size-10 place-items-center rounded-xl border transition shadow-sm ${
              sortBy !== "default"
                ? "border-amber-400 bg-amber-400/10 text-amber-300 ring-2 ring-amber-400/20"
                : "border-white/10 bg-[#121721] text-slate-300 hover:border-slate-500 hover:text-white"
            }`}
          >
            <Filter size={18} />
          </button>

          {/* Filter / Sort Menu */}
          {filterMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setFilterMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-white/10 bg-[#111722] p-2 shadow-2xl shadow-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <SlidersHorizontal size={11} className="text-amber-400" />
                    Sort &amp; Filter
                  </p>
                  {sortBy !== "default" && (
                    <button
                      type="button"
                      onClick={() => { setSortBy("default"); setFilterMenuOpen(false); }}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="space-y-1 pt-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => { setSortBy("default"); setFilterMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                      sortBy === "default" ? "bg-white/10 font-bold text-white" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>Default (Newest First)</span>
                    {sortBy === "default" && <span className="size-1.5 rounded-full bg-amber-400" />}
                  </button>

                  <div className="my-1 border-t border-white/[0.05]" />
                  <p className="px-3 py-1 text-[9px] font-bold uppercase text-slate-500">By Followers</p>

                  <button
                    type="button"
                    onClick={() => { setSortBy("followers_desc"); setFilterMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                      sortBy === "followers_desc" ? "bg-amber-400/15 font-bold text-amber-300" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>Followers: High to Low</span>
                    {sortBy === "followers_desc" && <span className="size-1.5 rounded-full bg-amber-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSortBy("followers_asc"); setFilterMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                      sortBy === "followers_asc" ? "bg-amber-400/15 font-bold text-amber-300" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>Followers: Low to High</span>
                    {sortBy === "followers_asc" && <span className="size-1.5 rounded-full bg-amber-400" />}
                  </button>

                  <div className="my-1 border-t border-white/[0.05]" />
                  <p className="px-3 py-1 text-[9px] font-bold uppercase text-slate-500">By Price</p>

                  <button
                    type="button"
                    onClick={() => { setSortBy("price_desc"); setFilterMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                      sortBy === "price_desc" ? "bg-amber-400/15 font-bold text-amber-300" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>Price: High to Low</span>
                    {sortBy === "price_desc" && <span className="size-1.5 rounded-full bg-amber-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSortBy("price_asc"); setFilterMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                      sortBy === "price_asc" ? "bg-amber-400/15 font-bold text-amber-300" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>Price: Low to High</span>
                    {sortBy === "price_asc" && <span className="size-1.5 rounded-full bg-amber-400" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Sort Pill Indicator */}
      {sortBy !== "default" && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">
            Sorted: {
              sortBy === "price_asc" ? "Price: Low to High" :
              sortBy === "price_desc" ? "Price: High to Low" :
              sortBy === "followers_desc" ? "Followers: High to Low" : "Followers: Low to High"
            }
            <button
              type="button"
              onClick={() => setSortBy("default")}
              className="ml-1 text-amber-400 hover:text-white"
              title="Clear sort"
            >
              <X size={13} />
            </button>
          </span>
        </div>
      )}

      {/* Pending Buy Resume Banner */}
      {pendingBuy && Number(user?.balance || 0) >= pendingBuy.price && (
        <div className="rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-[#111722] to-teal-500/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/40">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300">
                Deposit Confirmed &bull; Balance is Sufficient!
              </p>
              <p className="text-xs text-white">
                Ready to complete your purchase of <span className="font-bold text-amber-200">"{pendingBuy.channelName}"</span> for <span className="font-bold text-teal-300">{pendingBuy.price.toLocaleString()} ETB</span>?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const target = filteredChannels.find((c) => c.id === pendingBuy.channelId) || {
                  id: pendingBuy.channelId,
                  name: pendingBuy.channelName,
                  platform: "telegram" as const,
                  category: "General",
                  followers: "Verified",
                  price: `${pendingBuy.price.toLocaleString()} ETB`,
                  rawPrice: pendingBuy.price,
                  linkText: pendingBuy.channelName,
                  linkUrl: "#",
                };
                handleBuy(target);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300 active:scale-95 transition"
            >
              <Zap size={14} className="fill-slate-950" />
              <span>Complete Purchase Now</span>
            </button>
            <button
              type="button"
              onClick={() => {
                try { localStorage.removeItem("hulu_pending_buy"); } catch {}
                setPendingBuy(null);
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="group relative flex min-h-12 items-center rounded-xl border border-white/[0.08] bg-[#121721] shadow-inner transition-colors focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/10">
        <Search
          aria-hidden="true"
          size={18}
          strokeWidth={2}
          className="pointer-events-none absolute left-4 text-slate-500 transition-colors group-focus-within:text-cyan-400"
        />
        <label htmlFor="account-search" className="sr-only">Search accounts</label>
        <input
          id="account-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search live verified accounts..."
          className="h-12 w-full min-w-0 bg-transparent py-3 pl-11 pr-12 text-sm text-white outline-none placeholder:text-slate-500"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Platform Selector */}
      <PlatformFilter selected={platform} onSelect={setPlatform} />

      {/* Loading State */}
      {loadingChannels ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-amber-400" />
          <p className="text-xs">Fetching verified channels from live database...</p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111722]/50 p-12 text-center text-slate-400 space-y-3">
          <p className="text-sm font-semibold text-slate-300">No channels found matching your criteria.</p>
          <p className="text-xs text-slate-500">Try selecting a different platform, resetting your search, or clearing active filters.</p>
          {(platform !== "all" || searchQuery || sortBy !== "default") && (
            <button
              type="button"
              onClick={() => {
                setPlatform("all");
                setSearchQuery("");
                setSortBy("default");
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* First batch */}
          {firstBatch.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {firstBatch.map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  onBuy={handleBuy}
                  onDetails={handleDetails}
                  isBuying={buyingChannelId === ch.id}
                />
              ))}
            </div>
          )}

          {/* Center Promotional Banner */}
          <PromoBanner />

          {/* Remaining Channel Cards */}
          {secondBatch.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {secondBatch.map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  onBuy={handleBuy}
                  onDetails={handleDetails}
                  isBuying={buyingChannelId === ch.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-center gap-2">
        <button
          type="button"
          title="Earn ETB"
          className="grid size-12 place-items-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/30 transition hover:scale-105 active:scale-95"
        >
          <Zap size={22} className="fill-slate-950" />
        </button>
        <div className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
          ETB
        </div>
      </div>
    </div>
  );
}
