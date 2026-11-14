"use client";

import { useState } from "react";
import {
  ExternalLink,
  Eye,
  Heart,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import { ChannelItem } from "./types";

interface ChannelCardProps {
  channel: ChannelItem;
  onBuy?: (channel: ChannelItem) => void;
  onDetails?: (channel: ChannelItem) => void;
}

export default function ChannelCard({
  channel,
  onBuy,
  onDetails,
}: ChannelCardProps) {
  const [starred, setStarred] = useState(false);

  // Platform Ribbon Config
  const platformConfig = {
    facebook: {
      name: "Facebook",
      ribbonClass: "bg-[#1877F2] text-white",
      btnClass: "bg-[#1877F2] hover:bg-[#166fe5]",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    tiktok: {
      name: "TikTok",
      ribbonClass: "bg-black text-white border-r border-white/10",
      btnClass: "bg-[#2563eb] hover:bg-[#1d4ed8]",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
        </svg>
      ),
    },
    telegram: {
      name: "Telegram",
      ribbonClass: "bg-[#229ED9] text-white",
      btnClass: "bg-[#229ED9] hover:bg-[#1b8ec3]",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z" />
        </svg>
      ),
    },
    instagram: {
      name: "Instagram",
      ribbonClass: "bg-gradient-to-b from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white",
      btnClass: "bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    youtube: {
      name: "YouTube",
      ribbonClass: "bg-[#FF0000] text-white",
      btnClass: "bg-[#FF0000] hover:bg-[#cc0000]",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
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
      <div className="flex min-w-0 flex-1 flex-col justify-between space-y-4 p-4 sm:space-y-5">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          {/* Avatar & Channel info */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div
              className={`grid size-11 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-inner ring-2 ring-white/10 ${
                channel.avatarBg || "bg-slate-700"
              }`}
            >
              {channel.initials || "CH"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {channel.isNew && (
                  <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                    NEW
                  </span>
                )}
                <h3 className="truncate text-sm font-bold text-white">
                  {channel.name}
                </h3>
              </div>

              {/* Link */}
              <a
                href={channel.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>{channel.linkText}</span>
                <ExternalLink size={10} />
              </a>

              {/* Category */}
              <p className="mt-0.5 text-[11px] text-slate-400 font-medium truncate">
                {channel.category}
              </p>

              {/* Price badge */}
              <div className="mt-1">
                <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {channel.badgeTag}
                </span>
              </div>
            </div>
          </div>

          {/* Details & Star Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onDetails?.(channel)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setStarred(!starred)}
              title={starred ? "Remove favorite" : "Add to favorites"}
              className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-amber-400 transition"
            >
              <Star
                size={15}
                className={
                  starred
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-400 hover:text-slate-200"
                }
              />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex min-h-[68px] items-center justify-between rounded-xl border border-white/[0.06] bg-[#0c1018]/90 px-3 py-3 text-[11px]">
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

        {/* Bottom Price & CTA */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-lg font-bold tracking-tight text-white sm:text-2xl">
              {channel.price}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onBuy?.(channel)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition ${platformConfig.btnClass}`}
          >
            <ShoppingCart size={14} />
            <span>Buy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
