"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Filter, Search, X, Zap } from "lucide-react";
import PlatformFilter from "@/components/social-media/PlatformFilter";
import ChannelCard from "@/components/social-media/ChannelCard";
import PromoBanner from "@/components/social-media/PromoBanner";
import { initialChannels } from "@/components/social-media/mockData";
import { ChannelItem, PlatformType } from "@/components/social-media/types";
import { isUserSignedIn } from "@/lib/auth";

export default function SocialMediaPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<PlatformType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(
    null,
  );
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Filter channels based on search query and selected platform
  const filteredChannels = useMemo(() => {
    return initialChannels.filter((ch) => {
      const matchesPlatform =
        platform === "all" || ch.platform === platform;
      const matchesSearch =
        searchQuery.trim() === "" ||
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.linkText.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesPlatform && matchesSearch;
    });
  }, [platform, searchQuery]);

  const firstBatch = filteredChannels.slice(0, 2);
  const secondBatch = filteredChannels.slice(2);

  const handleBuy = (channel: ChannelItem) => {
    // If user is not signed in, redirect to auth page
    if (!isUserSignedIn()) {
      router.push(`/auth?redirect=${encodeURIComponent("/social-media")}`);
      return;
    }

    setPurchaseSuccess(
      `Purchase initiated for "${channel.name}" (${channel.price}). Escrow transaction pending.`,
    );
    setTimeout(() => {
      setPurchaseSuccess(null);
    }, 4500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Toast Alert */}
      {purchaseSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-teal-500/40 bg-[#0e1722] p-4 text-sm text-teal-300 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-3">
          <Coins size={18} className="text-amber-400" />
          <span>{purchaseSuccess}</span>
          <button
            type="button"
            onClick={() => setPurchaseSuccess(null)}
            className="text-slate-400 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Listing Channel
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium">3,726 channels</p>
        </div>

        <button
          type="button"
          title="Filter channels"
          className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#121721] text-slate-300 shadow-sm transition hover:border-slate-500 hover:text-white"
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="group relative flex min-h-12 items-center rounded-xl border border-white/[0.08] bg-[#121721] shadow-inner transition-colors focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/10">
        <Search
          aria-hidden="true"
          size={18}
          strokeWidth={2}
          className="pointer-events-none absolute left-4 text-slate-500 transition-colors group-focus-within:text-cyan-400"
        />
        <label htmlFor="account-search" className="sr-only">
          Search accounts
        </label>
        <input
          id="account-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts..."
          className="h-12 w-full min-w-0 bg-transparent py-3 pl-11 pr-12 text-sm text-white outline-none placeholder:text-slate-500"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear account search"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Platform Selector */}
      <PlatformFilter selected={platform} onSelect={setPlatform} />

      {/* Featured channel cards */}
      {firstBatch.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firstBatch.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onBuy={handleBuy}
              onDetails={(c) => setSelectedChannel(c)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111722]/50 p-12 text-center text-slate-400">
          No channels match your current search criteria.
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
              onDetails={(c) => setSelectedChannel(c)}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button (bottom right coin badge like screenshot) */}
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

      {/* Details Dialog Modal */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111722] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
                  Channel Details
                </span>
                <h3 className="mt-1 text-xl font-bold text-white">
                  {selectedChannel.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex justify-between border-b border-white/[0.06] py-2">
                <span className="text-slate-400">Platform</span>
                <span className="font-semibold text-white capitalize">
                  {selectedChannel.platform}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] py-2">
                <span className="text-slate-400">Category</span>
                <span className="font-semibold text-white">
                  {selectedChannel.category}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] py-2">
                <span className="text-slate-400">Followers / Audience</span>
                <span className="font-semibold text-white">
                  {selectedChannel.followers}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] py-2">
                <span className="text-slate-400">Engagement</span>
                <span className="font-semibold text-white">
                  {selectedChannel.secondaryStat}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] py-2">
                <span className="text-slate-400">Asking Price</span>
                <span className="text-lg font-bold text-amber-400">
                  {selectedChannel.price}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleBuy(selectedChannel);
                  setSelectedChannel(null);
                }}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
