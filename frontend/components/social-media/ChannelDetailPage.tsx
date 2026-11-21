"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { ChannelItem, PlatformType } from "./types";

interface ChannelDetailPageProps {
  channel: ChannelItem;
  onBack: () => void;
  onBuy: (channel: ChannelItem) => void;
  isBuying?: boolean;
}

export default function ChannelDetailPage({
  channel,
  onBack,
  onBuy,
  isBuying = false,
}: ChannelDetailPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const rawScreenshot = channel.screenshot_url;
  const buildInitialSrc = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:4001${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(buildInitialSrc(rawScreenshot));
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setScreenshotSrc(buildInitialSrc(channel.screenshot_url));
    setHasImageError(false);
  }, [channel.screenshot_url]);

  const handleImageError = () => {
    if (screenshotSrc && screenshotSrc.includes(":4001") && rawScreenshot) {
      // Fallback from port 4001 to relative path /uploads/... (proxied by Next.js)
      const rel = rawScreenshot.startsWith("/") ? rawScreenshot : `/${rawScreenshot}`;
      setScreenshotSrc(rel);
    } else {
      setHasImageError(true);
    }
  };

  // Platform specific configuration
  const platformConfig = {
    instagram: {
      name: "Instagram",
      brandColor: "#E1306C",
      badgeClass: "bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 border-pink-500/30 text-pink-300",
      iconBg: "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]",
      btnClass: "from-[#833ab4] via-[#fd1d1d] to-[#fcb045]",
      linkUrlPrefix: "https://instagram.com/",
      icon: (
        <svg className="size-4 fill-white" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    telegram: {
      name: "Telegram",
      brandColor: "#229ED9",
      badgeClass: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
      iconBg: "bg-[#229ED9]",
      btnClass: "from-[#229ED9] to-[#0088cc]",
      linkUrlPrefix: "https://t.me/",
      icon: (
        <svg className="size-4 fill-white" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 4-1.74 6.67-2.88 8.01-3.44 3.81-1.58 4.6-1.86 5.12-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.03.22z" />
        </svg>
      ),
    },
    youtube: {
      name: "YouTube",
      brandColor: "#FF0000",
      badgeClass: "bg-rose-500/10 border-rose-500/30 text-rose-300",
      iconBg: "bg-[#FF0000]",
      btnClass: "from-red-600 to-rose-700",
      linkUrlPrefix: "https://youtube.com/",
      icon: (
        <svg className="size-4 fill-white" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    tiktok: {
      name: "TikTok",
      brandColor: "#00F2FE",
      badgeClass: "bg-slate-500/10 border-cyan-500/30 text-cyan-300",
      iconBg: "bg-black border border-white/20",
      btnClass: "from-slate-900 to-black",
      linkUrlPrefix: "https://tiktok.com/@",
      icon: (
        <svg className="size-4 fill-white" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.88-4.47V8.78a8.28 8.28 0 0 0 4.89 1.58V6.91a4.83 4.83 0 0 1-1-.22z" />
        </svg>
      ),
    },
    facebook: {
      name: "Facebook",
      brandColor: "#1877F2",
      badgeClass: "bg-blue-500/10 border-blue-500/30 text-blue-300",
      iconBg: "bg-[#1877F2]",
      btnClass: "from-blue-600 to-indigo-700",
      linkUrlPrefix: "https://facebook.com/",
      icon: (
        <svg className="size-4 fill-white" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  }[channel.platform] || {
    name: "Social Media",
    brandColor: "#229ED9",
    badgeClass: "bg-slate-500/10 border-slate-500/30 text-slate-300",
    iconBg: "bg-slate-700",
    btnClass: "from-blue-600 to-indigo-600",
    linkUrlPrefix: "https://",
    icon: <Users size={16} className="text-white" />,
  };

  const handleCopyLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${channel.name} on Hulu Market`,
          text: `Check out this verified ${platformConfig.name} channel "${channel.name}" on Hulu Market!`,
          url: window.location.href,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const directExternalLink = channel.linkUrl && channel.linkUrl !== "#"
    ? channel.linkUrl
    : `${platformConfig.linkUrlPrefix}${channel.linkText.replace(/^@/, "")}`;

  // Average likes estimation or secondary stat
  const avgLikesDisplay = channel.engagement && channel.engagement !== "Active"
    ? channel.engagement
    : channel.secondaryStat && channel.secondaryStat !== "Active"
    ? channel.secondaryStat
    : "Active";

  // Views display (or secondary reach metric)
  const viewsDisplay = channel.secondaryStat && channel.secondaryStat !== "Active"
    ? channel.secondaryStat
    : "10K+";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#121721] text-slate-300 shadow-sm transition hover:border-slate-500 hover:text-white"
          title="Back to marketplace"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            title={copiedLink ? "Copied!" : "Copy channel link"}
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#121721] text-slate-300 shadow-sm transition hover:border-slate-500 hover:text-white"
          >
            {copiedLink ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Share channel"
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#121721] text-slate-300 shadow-sm transition hover:border-slate-500 hover:text-white"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Profile Header (Centered, exactly as in screenshot) */}
      <div className="flex flex-col items-center text-center space-y-3.5 pt-2">
        {/* Circular Avatar with Platform Badge at bottom right */}
        <div className="relative">
          <div className="size-24 sm:size-28 rounded-full overflow-hidden border-2 border-white/20 bg-gradient-to-tr from-slate-800 to-slate-900 p-1 shadow-xl shadow-black/60">
            {screenshotSrc && !hasImageError ? (
              <img
                src={screenshotSrc}
                alt={channel.name}
                className="size-full rounded-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div className="size-full rounded-full bg-gradient-to-tr from-[#162032] to-[#24334a] flex items-center justify-center text-2xl font-bold text-white uppercase tracking-wider">
                {channel.name.replace(/[@#]/g, "").slice(0, 2) || "CH"}
              </div>
            )}
          </div>

          {/* Platform badge floating at bottom right of avatar */}
          <div
            className={`absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-[#0b0f17] shadow-lg ${platformConfig.iconBg}`}
          >
            {platformConfig.icon}
          </div>
        </div>

        {/* Platform tag pill: [Icon] INSTAGRAM • Active */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111722] px-3.5 py-1 text-xs font-bold text-slate-200 shadow-inner">
          <span className="scale-90">{platformConfig.icon}</span>
          <span className="uppercase tracking-wider text-[11px] font-extrabold">{platformConfig.name}</span>
          <span className="size-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-400">Active</span>
        </div>

        {/* NEW Badge + Channel Name */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            NEW
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {channel.name}
          </h1>
        </div>

        {/* View on Platform External Link */}
        <a
          href={directExternalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition hover:underline"
        >
          <span>View on {platformConfig.name}</span>
          <ExternalLink size={13} />
        </a>

        {/* Category Pill */}
        <div>
          <span className="inline-block rounded-xl border border-white/10 bg-[#121721] px-3.5 py-1 text-xs font-semibold text-slate-300">
            {channel.category || "General"}
          </span>
        </div>
      </div>

      {/* 3-Column Stats Card (Followers | Average Likes | Views) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111722] shadow-lg divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] grid grid-cols-1 sm:grid-cols-3 text-center py-4 sm:py-5">
        {/* Followers */}
        <div className="py-2.5 sm:py-0 px-4 space-y-0.5">
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {channel.followers}
          </p>
          <p className="text-xs text-slate-400 font-medium">
            {channel.followersLabel || "Followers"}
          </p>
        </div>

        {/* Average Likes */}
        <div className="py-2.5 sm:py-0 px-4 space-y-0.5">
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {avgLikesDisplay}
          </p>
          <p className="text-xs text-slate-400 font-medium">Average Likes</p>
        </div>

        {/* Views */}
        <div className="py-2.5 sm:py-0 px-4 space-y-0.5">
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {viewsDisplay}
          </p>
          <p className="text-xs text-slate-400 font-medium">Views</p>
        </div>
      </div>

      {/* Pricing & Buy Action Card (with distinctive top magenta border as in screenshot) */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-6 shadow-xl">
        {/* Subtle magenta/purple glowing accent bar at top */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Very Good Price badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full" />
                <span className="w-0.5 h-2 bg-emerald-400 rounded-full" />
                <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full" />
                <span className="w-0.5 h-3 bg-emerald-400 rounded-full" />
              </div>
              Very Good Price
            </span>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                PRICE
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {channel.price}
              </p>
            </div>
          </div>

          {/* Buy Now Button (Violet / Purple gradient CTA as shown in screenshot) */}
          <button
            type="button"
            disabled={isBuying}
            onClick={() => onBuy(channel)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-900/30 transition hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {isBuying ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ShoppingCart size={18} />
            )}
            <span>{isBuying ? "Processing Trade..." : "Buy Now"}</span>
          </button>
        </div>
      </div>

      {/* Dashboard Screenshot Section with Realistic Phone Device Mockup */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-7 shadow-lg space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
            <ImageIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Dashboard Screenshot
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analytics screenshot submitted by the seller for verification.
            </p>
          </div>
        </div>

        {/* Smartphone Device Mockup Container */}
        <div className="flex flex-col items-center justify-center pt-2 pb-1">
          <div
            onClick={() => setIsImageModalOpen(true)}
            className="group relative cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
            title="Click to view full size"
          >
            {/* Phone Outer Chassis */}
            <div className="relative w-[280px] sm:w-[320px] rounded-[2.8rem] p-3 bg-gradient-to-b from-[#2b3545] via-[#1a2333] to-[#121722] border-4 border-slate-700/80 shadow-2xl shadow-black">
              {/* Speaker & Dynamic Island Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end pr-3">
                  <div className="size-2 rounded-full bg-slate-900 border border-slate-800" />
                </div>
              </div>

              {/* Phone Inner Screen */}
              <div className="relative w-full h-[480px] sm:h-[540px] rounded-[2.2rem] overflow-hidden bg-[#090d14] border border-white/5 flex flex-col justify-between">
                {screenshotSrc && !hasImageError ? (
                  <div className="relative size-full bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={screenshotSrc}
                      alt="Analytics verification screenshot"
                      className="w-full h-full object-contain transition duration-300 group-hover:brightness-105"
                      onError={handleImageError}
                    />
                  </div>
                ) : (
                  /* High-tech fallback analytics mock screen */
                  <div className="size-full p-4 pt-10 flex flex-col justify-between bg-gradient-to-b from-[#0e141f] via-[#090d14] to-[#0c1017] text-left">
                    <div className="space-y-4">
                      {/* Top App bar */}
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <span className="text-xs font-bold text-white">{channel.name}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      </div>

                      {/* Main reach metric */}
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Account Insights</p>
                        <p className="text-xl font-bold text-white">{channel.followers}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">+14.8% growth past 30 days</p>
                      </div>

                      {/* Simulated Chart Bars */}
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] text-slate-400 font-medium">Activity Overview</p>
                        <div className="flex items-end justify-between gap-1.5 h-20 pt-4 px-1">
                          {[35, 60, 45, 80, 65, 95, 75, 88, 100].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                style={{ height: `${h}%` }}
                                className={`w-full rounded-t-sm transition-all ${
                                  i === 8 ? "bg-teal-400" : "bg-teal-500/30"
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Engagement stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
                          <span className="text-slate-400 block">Avg Reach</span>
                          <span className="text-white font-bold">{viewsDisplay}</span>
                        </div>
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
                          <span className="text-slate-400 block">Audience</span>
                          <span className="text-white font-bold">100% Real</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] text-slate-500 font-medium">Seller Verification Proof</span>
                    </div>
                  </div>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <span className="rounded-xl bg-black/80 border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg">
                    Click to enlarge
                  </span>
                </div>
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="w-28 h-1 bg-white/30 rounded-full mx-auto mt-2.5" />
            </div>
          </div>

          <p
            onClick={() => setIsImageModalOpen(true)}
            className="text-xs text-slate-400 hover:text-white transition mt-3 cursor-pointer font-medium"
          >
            Tap phone to view full size
          </p>
        </div>
      </div>

      {/* Description Section */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-6 shadow-lg space-y-2.5">
        <h3 className="text-sm font-bold text-white">Description</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {channel.description && channel.description.trim() !== ""
            ? channel.description
            : "for sales"}
        </p>
      </div>

      {/* Secured via platform (Escrow Trust Box) */}
      <div className="rounded-2xl border border-teal-500/20 bg-[#111722] p-4 sm:p-5 shadow-lg flex items-start gap-3.5">
        <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-400 shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            Secured via platform
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            All communication and payments are protected by escrow.
          </p>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsImageModalOpen(false)}
              className="absolute -top-12 right-0 grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              title="Close"
            >
              <X size={20} />
            </button>

            {screenshotSrc && !hasImageError ? (
              <img
                src={screenshotSrc}
                alt="Full size verification screenshot"
                className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain border border-white/10 shadow-2xl bg-black/80"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111722] p-8 text-center space-y-3">
                <ImageIcon size={36} className="mx-auto text-teal-400" />
                <h4 className="text-base font-bold text-white">Full Verification Preview</h4>
                <p className="text-xs text-slate-400">
                  Seller account verified. Channel metrics confirmed by Hulu Market administrators.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
