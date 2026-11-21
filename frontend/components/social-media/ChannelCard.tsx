"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Heart,
  Loader2,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import { ChannelItem } from "./types";

interface ChannelCardProps {
  channel: ChannelItem;
  onBuy?: (channel: ChannelItem) => void;
  onDetails?: (channel: ChannelItem) => void;
  isBuying?: boolean;
}

export default function ChannelCard({
  channel,
  onBuy,
  onDetails,
  isBuying = false,
}: ChannelCardProps) {
  const [starred, setStarred] = useState(false);

  // Sync initial starred state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hulu_favorites");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.some((item: any) => item.id === channel.id)) {
          setStarred(true);
        }
      }
    } catch {
      // ignore JSON error
    }

    const handleSync = () => {
      try {
        const stored = localStorage.getItem("hulu_favorites");
        if (stored) {
          const parsed = JSON.parse(stored);
          setStarred(Array.isArray(parsed) && parsed.some((item: any) => item.id === channel.id));
        } else {
          setStarred(false);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("hulu_favorites_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("hulu_favorites_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [channel.id]);

  const toggleFavorite = () => {
    try {
      const stored = localStorage.getItem("hulu_favorites");
      let currentList = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(currentList)) currentList = [];

      const rawUser = localStorage.getItem("hulu_user");
      const userId = rawUser ? JSON.parse(rawUser)?.id : null;

      const exists = currentList.some((item: any) => item.id === channel.id);

      if (exists) {
        currentList = currentList.filter((item: any) => item.id !== channel.id);
        setStarred(false);
        if (userId) {
          fetch(`/api/user/favorites/${channel.id}?userId=${userId}`, { method: "DELETE" }).catch(() => {});
        }
      } else {
        const newFav = {
          id: channel.id,
          title: channel.name,
          category: "Social Media Channels",
          categorySlug: "social-media",
          platform: channel.platform,
          handle: channel.linkText,
          spec: `${channel.followers} ${channel.followersLabel || "Followers"} • ${channel.secondaryStat}`,
          price: channel.rawPrice,
          savedDate: "Saved just now",
          verified: true,
        };
        currentList = [newFav, ...currentList];
        setStarred(true);
        if (userId) {
          fetch("/api/user/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, channelId: channel.id }),
          }).catch(() => {});
        }
      }

      localStorage.setItem("hulu_favorites", JSON.stringify(currentList));
      window.dispatchEvent(new Event("hulu_favorites_updated"));
    } catch (e) {
      console.error("Failed to update favorites in localStorage", e);
    }
  };

  // Platform Ribbon Config matching market_social-media.png
  const platformConfig = {
    facebook: {
      name: "Facebook",
      ribbonClass: "bg-[#1877F2] text-white",
      btnClass: "bg-[#1877F2] hover:bg-[#166fe5]",
      linkClass: "text-[#4db5ff] hover:text-[#7acaff]",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      smallIcon: (
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    tiktok: {
  name: "TikTok",
  ribbonClass: "bg-black text-white border-r border-[#FE2C55]/30 shadow-[inset_-1px_0_0_rgba(37,244,238,0.2)]",
  btnClass: "bg-[#FE2C55] hover:bg-[#E02449] text-white shadow-[0_0_15px_rgba(254,44,85,0.3)]",
  linkClass: "text-[#25F4EE] hover:text-[#75F8F4]",
  icon: (
    <svg
      className="size-4 text-white drop-shadow-[-1px_-1px_0px_#25F4EE] filter [filter:drop-shadow(1px_1px_0px_#FE2C55)_drop-shadow(-1px_-1px_0px_#25F4EE)]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
    </svg>
  ),
  smallIcon: (
    <svg
      className="size-3.5 fill-current text-white [filter:drop-shadow(0.75px_0.75px_0px_#FE2C55)_drop-shadow(-0.75px_-0.75px_0px_#25F4EE)]"
      viewBox="0 0 24 24"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
    </svg>
  ),
},

    telegram: {
      name: "Telegram",
      ribbonClass: "bg-[#229ED9] text-white",
      btnClass: "bg-[#229ED9] hover:bg-[#1b8ec3]",
      linkClass: "text-[#5bc4f5] hover:text-[#8ee0ff]",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z" />
        </svg>
      ),
      smallIcon: (
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z" />
        </svg>
      ),
    },
    instagram: {
      name: "Instagram",
      ribbonClass: "bg-gradient-to-b from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white",
      btnClass: "bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95",
      linkClass: "text-[#ff749f] hover:text-[#ffa3c0]",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
      smallIcon: (
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        </svg>
      ),
    },
    youtube: {
      name: "YouTube",
      ribbonClass: "bg-[#FF0000] text-white",
      btnClass: "bg-[#FF0000] hover:bg-[#cc0000]",
      linkClass: "text-red-400 hover:text-red-300",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      smallIcon: (
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  }[channel.platform];

  return (
    <div className="group relative flex overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500/60 hover:shadow-xl hover:shadow-black/50">
      {/* Left Vertical Ribbon */}
      <div
        className={`flex w-12 sm:w-16 shrink-0 flex-col items-center justify-between py-5 select-none ${platformConfig.ribbonClass}`}
      >
        <div className="shrink-0">{platformConfig.icon}</div>
        <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold tracking-wider uppercase opacity-95">
          {platformConfig.name}
        </span>
        <div className="size-2 rounded-full bg-white/40" />
      </div>

      {/* Main Card Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between space-y-4 p-4 sm:space-y-4">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          {/* Avatar & Channel info */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div
              className={`grid size-12 shrink-0 place-items-center rounded-2xl text-xs font-bold text-white shadow-inner ring-1 ring-white/10 ${
                channel.avatarBg || "bg-slate-700"
              }`}
            >
              {channel.initials || "CH"}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {/* Row 1: NEW Badge + Channel Name */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {channel.isNew && (
                  <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                    NEW
                  </span>
                )}
                <h3 className="truncate text-sm font-bold text-white leading-tight">
                  {channel.name}
                </h3>
              </div>

              {/* Row 2: Link like Open on TikTok are HORIZONTAL with signal bars */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={channel.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold transition ${platformConfig.linkClass}`}
                >
                  <span className="shrink-0">{platformConfig.smallIcon}</span>
                  <span className="truncate">{channel.linkText}</span>
                  {/* Signal bars indicator (📶) */}
                  <div className="flex items-end gap-0.5 h-3 ml-1 shrink-0" title="High reach">
                    <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="w-0.5 h-2 bg-emerald-400 rounded-full" />
                    <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full" />
                    <span className="w-0.5 h-3 bg-emerald-400 rounded-full" />
                  </div>
                </a>
              </div>

              {/* Row 3: Category tag */}
              <div className="pt-0.5">
                <span className="inline-block rounded-md bg-[#1a2333]/90 border border-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {channel.category}
                </span>
              </div>

              {/* Row 4: Very Good Price badge */}
              <div>
                <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {channel.badgeTag}
                </span>
              </div>
            </div>
          </div>

          {/* Details Button at top right + Star Icon underneath (matches screenshot) */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onDetails?.(channel)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
            >
              Details
            </button>

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

        {/* Stats Row */}
        <div className="flex min-h-[58px] items-center justify-between rounded-xl border border-white/[0.06] bg-[#0c1018]/90 px-3 py-2.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Users size={13} className="text-cyan-400" />
            <span className="font-bold text-white">{channel.followers}</span>
            <span className="text-slate-400 text-[10px]">
              {channel.followersLabel || "Followers"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            {channel.platform === "telegram" ? (
              <Eye size={13} className="text-cyan-400" />
            ) : (
              <Heart size={13} className="text-rose-400" />
            )}
            <span className="text-slate-300 font-medium">
              {channel.secondaryStat}
            </span>
          </div>

          <div>
            {channel.status === "ACTIVE" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-400" />
                ONGOING
              </span>
            )}
          </div>
        </div>

        {/* Bottom Price & Buy CTA - strictly HORIZONTAL */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-lg font-bold tracking-tight text-white sm:text-2xl">
              {channel.price}
            </span>
          </div>

          <button
            type="button"
            disabled={isBuying}
            onClick={() => onBuy?.(channel)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-70 ${platformConfig.btnClass}`}
          >
            {isBuying ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ShoppingCart size={14} />
            )}
            <span>{isBuying ? "Processing..." : "Buy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
