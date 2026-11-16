"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CarFront,
  CheckCircle2,
  Clapperboard,
  FileText,
  Home,
  House,
  Info,
  Link as LinkIcon,
  Monitor,
  PanelsTopLeft,
  Phone,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";

export type MarketplaceCategory =
  | "social-media"
  | "houses-properties"
  | "vehicles"
  | "electronics"
  | "ebooks-digital"
  | "educational-videos"
  | "home-furniture";

export type SocialPlatform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "telegram"
  | "facebook";

export default function SellPage() {
  // Marketplace category selection
  const [selectedMarketplace, setSelectedMarketplace] =
    useState<MarketplaceCategory>("social-media");

  // Social media platform selection
  const [selectedPlatform, setSelectedPlatform] =
    useState<SocialPlatform>("telegram");

  // Form states for Social Media
  const [channelLink, setChannelLink] = useState("");
  const [category, setCategory] = useState("");
  const [followers, setFollowers] = useState("");
  const [description, setDescription] = useState("");
  const [platformUsername, setPlatformUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [price, setPrice] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generic category form state
  const [itemTitle, setItemTitle] = useState("");
  const [itemCondition, setItemCondition] = useState("Brand New");

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.phone && !phoneNumber) {
      setPhoneNumber(user.phone);
    }
  }, [user, phoneNumber]);

  const marketplaceItems: {
    id: MarketplaceCategory;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "social-media",
      label: "Social Media Channels",
      icon: <PanelsTopLeft size={18} />,
    },
    {
      id: "houses-properties",
      label: "Houses & Properties",
      icon: <House size={18} />,
    },
    {
      id: "vehicles",
      label: "Vehicles",
      icon: <CarFront size={18} />,
    },
    {
      id: "electronics",
      label: "Electronics",
      icon: <Monitor size={18} />,
    },
    {
      id: "ebooks-digital",
      label: "Ebooks & Digital Products",
      icon: <BookOpen size={18} />,
    },
    {
      id: "educational-videos",
      label: "Educational Videos",
      icon: <Clapperboard size={18} />,
    },
    {
      id: "home-furniture",
      label: "Home & Furniture",
      icon: <Home size={18} />,
    },
  ];

  const socialPlatforms: {
    id: SocialPlatform;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "youtube",
      label: "YouTube",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      id: "instagram",
      label: "Instagram",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    {
      id: "tiktok",
      label: "TikTok",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
        </svg>
      ),
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z" />
        </svg>
      ),
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ];

  // Dynamic Contact & Platform Details
  const platformContactConfig: Record<
    SocialPlatform,
    {
      platformName: string;
      label: string;
      placeholder: string;
      dotColor: string;
      borderFocus: string;
      linkPlaceholder: string;
      icon: React.ReactNode;
      hint: string;
    }
  > = {
    telegram: {
      platformName: "Telegram",
      label: "Telegram Username *",
      placeholder: "@username",
      dotColor: "bg-cyan-400",
      borderFocus: "focus-within:border-cyan-400",
      linkPlaceholder: "https://t.me/yourchannel",
      hint: "Example: @seid_sualeh",
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z" />
        </svg>
      ),
    },
    youtube: {
      platformName: "YouTube",
      label: "YouTube Username *",
      placeholder: "@channelhandle",
      dotColor: "bg-red-500",
      borderFocus: "focus-within:border-red-500",
      linkPlaceholder: "https://youtube.com/@yourchannel",
      hint: "Example: @HuluMedia or @EthioTube",
      icon: (
        <svg className="size-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    instagram: {
      platformName: "Instagram",
      label: "Instagram Username *",
      placeholder: "@username",
      dotColor: "bg-pink-500",
      borderFocus: "focus-within:border-pink-500",
      linkPlaceholder: "https://instagram.com/yourhandle",
      hint: "Example: @seid.lifestyle or @brand_account",
      icon: (
        <svg className="size-4 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    tiktok: {
      platformName: "TikTok",
      label: "TikTok Username *",
      placeholder: "@username",
      dotColor: "bg-cyan-400",
      borderFocus: "focus-within:border-cyan-400",
      linkPlaceholder: "https://tiktok.com/@yourhandle",
      hint: "Example: @seid_tiktok or @creator_hub",
      icon: (
        <svg className="size-4 text-cyan-300" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
        </svg>
      ),
    },
    facebook: {
      platformName: "Facebook",
      label: "Facebook Username *",
      placeholder: "@username or Page Name",
      dotColor: "bg-blue-500",
      borderFocus: "focus-within:border-blue-500",
      linkPlaceholder: "https://facebook.com/yourpage",
      hint: "Example: @seid.official or Page Vanity URL",
      icon: (
        <svg className="size-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  };

  const currentContactConfig = platformContactConfig[selectedPlatform];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert("Please confirm seller permission agreement before proceeding.");
      return;
    }

    const channelName = platformUsername.startsWith("@") ? platformUsername : `@${platformUsername}`;
    const capitalizedPlatform = selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: user?.id,
          name: channelName || `${capitalizedPlatform} Channel`,
          platform: capitalizedPlatform,
          category: category || "General",
          subscribers: followers || "0",
          views_or_likes: "0",
          price: Number(price),
          link_url: channelLink,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.error || "Failed to submit channel listing.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      {/* 1. SELECT MARKETPLACE (Top Section) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-6 shadow-md">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
            SELECT MARKET PLACE
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Choose which category of the marketplace you want to list an item in
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-7">
          {marketplaceItems.map((item) => {
            const isSelected = selectedMarketplace === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedMarketplace(item.id);
                  setSubmitted(false);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-center transition-all duration-150 ${
                  isSelected
                    ? "bg-teal-500/15 text-teal-300 ring-2 ring-teal-400 shadow-md shadow-teal-950/40"
                    : "bg-[#0c1017]/80 text-slate-400 hover:bg-[#151c27] hover:text-slate-200 border border-white/[0.04]"
                }`}
              >
                <div
                  className={`grid size-9 place-items-center rounded-lg transition ${
                    isSelected
                      ? "bg-teal-400 text-slate-950 font-bold"
                      : "bg-white/[0.05] text-slate-300"
                  }`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] font-semibold leading-tight line-clamp-2">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success notification */}
      {submitted && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center shadow-xl animate-in fade-in">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">
            Listing Submitted Successfully!
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            Our review team will inspect your statistics &amp; proof of ownership. Review turnaround time is within 2-4 hours.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 rounded-xl bg-teal-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400"
          >
            Submit Another Listing
          </button>
        </div>
      )}

      {/* DYNAMIC FORM SECTION */}
      {selectedMarketplace === "social-media" ? (
        /* SOCIAL MEDIA CHANNELS SELL FORM (Matching sells_page.png design exactly) */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sub-platform selector */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                SELECT PLATFORM
              </p>
              <span className="text-xs font-semibold text-teal-400">
                Active: {currentContactConfig.platformName}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {socialPlatforms.map((p) => {
                const isSelected = selectedPlatform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 transition-all ${
                      isSelected
                        ? "bg-teal-500/15 text-teal-300 ring-2 ring-teal-400 shadow-md shadow-teal-950/40"
                        : "bg-[#0c1017]/80 text-slate-400 hover:bg-[#151c27] hover:text-slate-200 border border-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`grid size-9 place-items-center rounded-lg ${
                        isSelected
                          ? "bg-teal-400 text-slate-950"
                          : "bg-white/[0.05] text-slate-300"
                      }`}
                    >
                      {p.icon}
                    </div>
                    <span className="text-[11px] font-semibold">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 01: CHANNEL INFORMATION */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    {currentContactConfig.platformName.toUpperCase()} CHANNEL INFORMATION
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Provide accurate statistics and proof of ownership
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                STEP 01
              </span>
            </div>

            {/* Dashboard Screenshot Upload Card */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c1017] p-5">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                {/* Left Description */}
                <div className="space-y-3 flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">
                    <Camera size={13} />
                    <span>Dashboard Screenshot *</span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">
                    Upload a screenshot of your {currentContactConfig.platformName} channel/account Front Page dashboard showing Your logo, followers, views, and other stats. Our team uses this to verify your listing.{" "}
                    <span className="text-amber-400 font-semibold">
                      ⚠️ Don&apos;t crop any things.
                    </span>
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Info size={13} className="text-cyan-400" />
                    <span>Phone screenshot of your analytics dashboard</span>
                  </div>
                </div>

                {/* Right Smartphone mockup upload target */}
                <div className="flex justify-center shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative cursor-pointer group flex h-52 w-32 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-teal-500/40 bg-[#070b10] p-2 shadow-2xl transition hover:border-teal-400"
                  >
                    {/* Notch pill */}
                    <div className="absolute top-2.5 h-3 w-10 rounded-full bg-black/80 ring-1 ring-white/10" />

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />

                    {previewImage ? (
                      <div className="relative size-full overflow-hidden rounded-[1.5rem]">
                        <img
                          src={previewImage}
                          alt="Screenshot preview"
                          className="size-full object-cover"
                        />
                        <div className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 group-hover:opacity-100 transition text-[10px] text-white font-bold">
                          Change
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center text-teal-400 group-hover:scale-105 transition">
                        <div className="grid size-9 place-items-center rounded-full bg-teal-500/10 text-teal-300">
                          <Camera size={18} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300">
                          Tap to upload
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Channel Link */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <span className={`size-2 rounded-full ${currentContactConfig.dotColor}`} />
                {currentContactConfig.platformName} Channel Link *
              </label>
              <div className={`relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] ${currentContactConfig.borderFocus} transition`}>
                <span className="pl-3.5 text-slate-500">
                  <LinkIcon size={15} />
                </span>
                <input
                  type="url"
                  required
                  value={channelLink}
                  onChange={(e) => setChannelLink(e.target.value)}
                  placeholder={currentContactConfig.linkPlaceholder}
                  className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Category and Followers (2 columns) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <span className="size-2 rounded-full bg-amber-400" />
                  Category *
                </label>
                <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] focus-within:border-amber-400 transition">
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-transparent px-3.5 py-2.5 text-xs text-white focus:outline-none [&>option]:bg-[#111722] [&>option]:text-white"
                  >
                    <option value="">Select category</option>
                    <option value="Fashion & Beauty">Fashion &amp; Beauty</option>
                    <option value="Finance & Business">Finance &amp; Business</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="News & Politics">News &amp; Politics</option>
                    <option value="Sports">Sports</option>
                    <option value="Education">Education</option>
                    <option value="Technology">Technology</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Followers */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  Followers / Subscribers *
                </label>
                <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] focus-within:border-emerald-400 transition">
                  <span className="pl-3.5 text-slate-500">
                    <Users size={15} />
                  </span>
                  <input
                    type="number"
                    required
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <span className="size-2 rounded-full bg-purple-400" />
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your channel in detail..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] p-3 text-xs text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
              />
            </div>
          </div>

          {/* STEP 02: YOUR CONTACT (100% Dynamic Label & Placeholder) */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Phone size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    YOUR CONTACT
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Used by our team to contact you during listing review. Not shown to buyers.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                STEP 02
              </span>
            </div>

            {/* Quick Contact Platform Picker */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-400">
                Contact Handle Platform:
              </p>
              <div className="flex flex-wrap gap-2">
                {socialPlatforms.map((p) => {
                  const isCur = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        isCur
                          ? "bg-teal-500 text-slate-950 font-bold shadow-sm"
                          : "bg-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Dynamic Platform Username Field */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <span className={`size-2.5 rounded-full ${currentContactConfig.dotColor}`} />
                  <span className="text-teal-300 font-bold">
                    {currentContactConfig.label}
                  </span>
                </label>
                <div className={`relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] ${currentContactConfig.borderFocus} transition`}>
                  <span className="pl-3.5 text-slate-400">
                    {currentContactConfig.icon}
                  </span>
                  <input
                    type="text"
                    required
                    value={platformUsername}
                    onChange={(e) => setPlatformUsername(e.target.value)}
                    placeholder={currentContactConfig.placeholder}
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {currentContactConfig.hint}
                </p>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <span className="size-2.5 rounded-full bg-purple-400" />
                  Phone Number *
                </label>
                <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] focus-within:border-purple-400 transition">
                  <span className="pl-3.5 text-slate-500">
                    <Phone size={14} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Phone: +251*********"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Must start with +251 (Ethiopia). Example: +251912345678
                </p>
              </div>
            </div>
          </div>

          {/* STEP 03: PRICING DETAILS */}
          <div className="rounded-2xl border border-teal-500/20 bg-[#111722] p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    PRICING DETAILS
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-400">
                STEP 03
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Price (ETB) *
              </label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none transition"
              />
            </div>
          </div>

          {/* SELLER PERMISSION CARD */}
          <div className="rounded-2xl border border-amber-500/30 bg-[#111722] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    SELLER PERMISSION
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                72H PAYOUT
              </span>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="agreement"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4 rounded border-slate-700 bg-[#0c1017] text-teal-500 focus:ring-teal-400"
              />
              <label
                htmlFor="agreement"
                className="cursor-pointer text-xs leading-relaxed text-slate-300 select-none"
              >
                I confirm that I am the rightful owner of this channel/account and I have full permission to sell it, And I have agreed that I will receive payment for the account I sold to the buyers 5 Day after the sale.
              </label>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-xs text-teal-300">
              <ShieldCheck size={16} className="text-teal-400 shrink-0" />
              <span>
                Our platform handles all buyer communication and transactions securely.
              </span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-teal-500/25 transition hover:from-teal-400 hover:to-cyan-400 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting Listing...</span>
              ) : (
                <>
                  <span>List {currentContactConfig.platformName} Channel</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* DYNAMIC CATEGORY FORM (Houses, Vehicles, Electronics, etc.) */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                  {marketplaceItems.find((m) => m.id === selectedMarketplace)?.label} Details
                </h2>
                <p className="text-[11px] text-slate-400">
                  Provide item specifications and high quality photos
                </p>
              </div>
              <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-400">
                STEP 01
              </span>
            </div>

            {/* Photo Upload */}
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0c1017] p-8 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-teal-500/10 text-teal-400">
                <Upload size={22} />
              </div>
              <p className="mt-3 text-xs font-semibold text-white">
                Upload item photos
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                PNG, JPG or WebP up to 10MB each
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g. 2-Bedroom Luxury Apartment / iPhone 15 Pro"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Condition / Sub-type *
                </label>
                <select
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2.5 text-xs text-white focus:border-teal-400 focus:outline-none [&>option]:bg-[#111722]"
                >
                  <option value="Brand New">Brand New</option>
                  <option value="Slightly Used">Slightly Used / Like New</option>
                  <option value="Used">Used</option>
                  <option value="For Rent">For Rent</option>
                  <option value="For Sale">For Sale</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Detailed Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include condition, specs, location, and reason for selling..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] p-3 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Pricing Details */}
          <div className="rounded-2xl border border-teal-500/20 bg-[#111722] p-6 shadow-md space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">
              PRICING (ETB)
            </h2>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {/* Seller Permission */}
          <div className="rounded-2xl border border-amber-500/30 bg-[#111722] p-6 shadow-md space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="generic-agreement"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4 rounded border-slate-700 bg-[#0c1017] text-teal-500 focus:ring-teal-400"
              />
              <label
                htmlFor="generic-agreement"
                className="cursor-pointer text-xs leading-relaxed text-slate-300"
              >
                I confirm that I am the legal owner of this item and have full rights to list and transfer ownership.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-teal-500/25 transition hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50"
          >
            <span>List Item Now</span>
            <ArrowRight size={18} />
          </button>
        </form>
      )}
    </div>
  );
}
