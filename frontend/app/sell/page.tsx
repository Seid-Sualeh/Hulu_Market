"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, isUserSignedIn } from "@/lib/auth";
import { fetchBackend, resolveImageUrl } from "@/lib/api";
import {
  AlertCircle,
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
  Loader2,
  Monitor,
  PanelsTopLeft,
  Phone,
  Plus,
  ShieldCheck,
  TrendingUp,
  Upload,
  User,
  Users,
  X,
  Zap,
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

function SellPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editChannelId = searchParams.get("editChannelId");
  const { user, mounted } = useAuth();

  // Marketplace & Platform selection
  const [selectedMarketplace, setSelectedMarketplace] =
    useState<MarketplaceCategory>("social-media");
  const [selectedPlatform, setSelectedPlatform] =
    useState<SocialPlatform>("telegram");

  // Form states for Social Media Channel
  const [displayName, setDisplayName] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [category, setCategory] = useState("");
  const [followers, setFollowers] = useState("");
  const [viewsOrLikes, setViewsOrLikes] = useState("");
  const [description, setDescription] = useState("");
  const [sellerUsername, setSellerUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [price, setPrice] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Screenshots
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [existingScreenshotUrl, setExistingScreenshotUrl] = useState<string | null>(null);

  // Status & feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedChannelName, setSubmittedChannelName] = useState("");
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);

  // Generic category form state
  const [itemTitle, setItemTitle] = useState("");
  const [itemCondition, setItemCondition] = useState("Brand New");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. GUEST AUTH GUARD: If not signed in, redirect to /auth?redirect=/sell
  useEffect(() => {
    if (mounted && !isUserSignedIn()) {
      router.push(`/auth?redirect=${encodeURIComponent("/sell")}`);
    }
  }, [mounted, router]);

  // Sync default user contact details
  useEffect(() => {
    if (user?.phone && !phoneNumber) {
      setPhoneNumber(user.phone);
    }
    if (user?.name && !sellerUsername) {
      setSellerUsername(`@${user.name.toLowerCase().replace(/\s+/g, "_")}`);
    }
  }, [user, phoneNumber, sellerUsername]);

  // Load existing channel if in edit/resubmit mode
  useEffect(() => {
    if (!editChannelId) return;
    fetchBackend(`channels/${editChannelId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.channel) {
          const ch = data.channel;
          setDisplayName(ch.name || "");
          setSelectedPlatform((ch.platform || "telegram").toLowerCase() as SocialPlatform);
          setCategory(ch.category || "");
          setFollowers(ch.subscribers || "");
          setViewsOrLikes(ch.views_or_likes || "");
          setDescription(ch.description || "");
          setChannelLink(ch.link_url || "");
          setPrice(String(ch.price || ""));
          setSellerUsername(ch.seller_username || "");
          setPhoneNumber(ch.seller_phone || "");
          if (ch.screenshot_url) {
            setExistingScreenshotUrl(ch.screenshot_url);
            setPreviewImage(resolveImageUrl(ch.screenshot_url));
          }
          if (ch.rejection_reason) {
            setRejectionNotice(ch.rejection_reason);
          }
        }
      })
      .catch(() => {});
  }, [editChannelId]);

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
      id: "telegram",
      label: "Telegram",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z" />
        </svg>
      ),
    },
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
      id: "facebook",
      label: "Facebook",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
  ];

  const platformContactConfig: Record<
    SocialPlatform,
    {
      platformName: string;
      label: string;
      placeholder: string;
      dotColor: string;
      borderFocus: string;
      linkPlaceholder: string;
      hint: string;
    }
  > = {
    telegram: {
      platformName: "Telegram",
      label: "Telegram Handle",
      placeholder: "@seid_seller",
      dotColor: "bg-cyan-400",
      borderFocus: "focus-within:border-cyan-400",
      linkPlaceholder: "https://t.me/your_channel",
      hint: "Your seller contact username (e.g. @seid_sualeh)",
    },
    youtube: {
      platformName: "YouTube",
      label: "YouTube Handle",
      placeholder: "@channel_owner",
      dotColor: "bg-red-500",
      borderFocus: "focus-within:border-red-500",
      linkPlaceholder: "https://youtube.com/@yourchannel",
      hint: "Your channel handle or manager username",
    },
    instagram: {
      platformName: "Instagram",
      label: "Instagram Handle",
      placeholder: "@username",
      dotColor: "bg-pink-500",
      borderFocus: "focus-within:border-pink-500",
      linkPlaceholder: "https://instagram.com/yourhandle",
      hint: "Your Instagram seller account handle",
    },
    facebook: {
      platformName: "Facebook",
      label: "Facebook Profile / Page",
      placeholder: "facebook.com/seller_profile",
      dotColor: "bg-blue-500",
      borderFocus: "focus-within:border-blue-500",
      linkPlaceholder: "https://facebook.com/yourpage",
      hint: "Your Facebook contact profile or page link",
    },
    tiktok: {
      platformName: "TikTok",
      label: "TikTok Handle",
      placeholder: "@tiktok_user",
      dotColor: "bg-cyan-400",
      borderFocus: "focus-within:border-cyan-400",
      linkPlaceholder: "https://tiktok.com/@yourchannel",
      hint: "Your TikTok seller handle",
    },
  };

  const currentContactConfig = platformContactConfig[selectedPlatform];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!agreed) {
      setSubmitError("Please confirm the mandatory seller permission declaration before submitting.");
      return;
    }

    if (!displayName.trim()) {
      setSubmitError("Please enter the Displayed Name of your social media channel (the name visible to buyers).");
      return;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setSubmitError("Please enter a valid selling price in ETB.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload screenshot if a new file was selected
      let uploadedScreenshotUrl = existingScreenshotUrl;
      if (screenshotFile) {
        const formData = new FormData();
        formData.append("file", screenshotFile);
        const uploadRes = await fetchBackend("upload?visibility=public", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          uploadedScreenshotUrl = uploadData.url;
        } else {
          setSubmitError(uploadData?.error || "Failed to upload dashboard screenshot. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      const capitalizedPlatform =
        selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);

      const payload = {
        sellerId: user?.id,
        name: displayName.trim(),
        platform: capitalizedPlatform,
        category: category || "General",
        subscribers: followers || "0",
        views_or_likes: viewsOrLikes || "Active",
        description: description.trim(),
        link_url: channelLink.trim(),
        screenshot_url: uploadedScreenshotUrl,
        seller_username: sellerUsername.trim(),
        seller_phone: phoneNumber.trim(),
        price: priceNum,
        agreed_declaration: true,
      };

      const path = editChannelId ? `channels/${editChannelId}/resubmit` : "channels";
      const method = editChannelId ? "PATCH" : "POST";

      const res = await fetchBackend(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSubmittedChannelName(displayName);
        setSubmitted(true);
      } else {
        setSubmitError(data.error || "Failed to submit listing. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#0b0f17]" />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Sell on Hulu Market
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          List your social media channel or property. Our escrow team verifies all statistics and supervises ownership transfer.
        </p>
      </div>

      {/* Rejection Notice Banner (if editing a rejected listing) */}
      {rejectionNotice && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 flex items-start gap-3 animate-in fade-in">
          <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Admin Revision Request
            </h4>
            <p className="mt-1 text-xs text-slate-200">
              <span className="font-semibold text-amber-200">Reviewer Note: </span>
              {rejectionNotice}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Please correct the requested information or upload clear screenshots, then click Resubmit below.
            </p>
          </div>
        </div>
      )}

      {/* Error Toast / Alert */}
      {submitError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 flex items-center justify-between gap-3 text-xs text-rose-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{submitError}</span>
          </div>
          <button onClick={() => setSubmitError(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. SELECT MARKETPLACE CATEGORY */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-6 shadow-md">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
            STEP 01 &bull; SELECT MARKETPLACE
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

      {/* Success Notification / Pending Review Card */}
      {submitted && (
        <div className="rounded-3xl border border-teal-500/40 bg-gradient-to-b from-[#111d2b] to-[#0c1219] p-8 text-center shadow-2xl animate-in fade-in space-y-4">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-lg">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300 mb-2">
              Status: Pending Review
            </span>
            <h3 className="text-xl font-extrabold text-white">
              Listing Submitted for Administrator Review!
            </h3>
            <p className="mt-2 text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
              Your channel <span className="font-bold text-amber-400">"{submittedChannelName}"</span> has been submitted.
              Our review officers will examine your channel dashboard screenshot, link, and statistics.
              Once approved, your channel will be published in the public marketplace.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/my-marketplace"
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-teal-400 shadow-md transition"
            >
              <span>View in My Marketplace</span>
              <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setDisplayName("");
                setChannelLink("");
                setPrice("");
                setScreenshotFile(null);
                setPreviewImage(null);
                setAgreed(false);
              }}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              Submit Another Channel
            </button>
          </div>
        </div>
      )}

      {/* SOCIAL MEDIA SELL FORM */}
      {!submitted && selectedMarketplace === "social-media" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 02: SELECT SOCIAL MEDIA PLATFORM */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                STEP 02 &bull; SELECT SOCIAL MEDIA PLATFORM
              </p>
              <span className="text-xs font-semibold text-teal-400">
                Selected: {currentContactConfig.platformName}
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

          {/* STEP 03: CHANNEL INFORMATION & DASHBOARD SCREENSHOT */}
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
                    Upload your dashboard screenshot proof and channel statistics
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                STEP 03
              </span>
            </div>

            {/* A. Channel Dashboard Screenshot Upload Card */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c1017] p-5">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                {/* Left Description */}
                <div className="space-y-3 flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">
                    <Camera size={13} />
                    <span>Channel Dashboard Screenshot *</span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">
                    Upload a clear screenshot of your {currentContactConfig.platformName} analytics or creator dashboard. It must show your channel logo, followers, subscribers, views, and statistics.{" "}
                    <span className="text-amber-400 font-semibold">
                      ⚠️ Do not crop or edit the screenshot.
                    </span>
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Info size={13} className="text-cyan-400 shrink-0" />
                    <span>This screenshot is inspected by administrators to verify genuine channel metrics.</span>
                  </div>
                </div>

                {/* Right Smartphone mockup upload target */}
                <div className="flex justify-center shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative cursor-pointer group flex h-52 w-36 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-teal-500/40 bg-[#070b10] p-2 shadow-2xl transition hover:border-teal-400"
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
                        <div className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 group-hover:opacity-100 transition text-[11px] text-white font-bold">
                          Change Image
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center text-teal-400 group-hover:scale-105 transition">
                        <div className="grid size-10 place-items-center rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          <Upload size={20} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300">
                          Upload Screenshot
                        </span>
                        <span className="text-[9px] text-slate-500">PNG or JPG</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* B. Channel Public Link */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <span className={`size-2 rounded-full ${currentContactConfig.dotColor}`} />
                {currentContactConfig.platformName} Channel Public Link *
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
              <p className="text-[10px] text-slate-500">
                Allows administrators and potential buyers to inspect the channel.
              </p>
            </div>

            {/* C & D. Category and Followers (2 columns) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* C. Category */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <span className="size-2 rounded-full bg-amber-400" />
                  Channel Category *
                </label>
                <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] focus-within:border-amber-400 transition">
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-transparent px-3.5 py-2.5 text-xs text-white focus:outline-none [&>option]:bg-[#111722] [&>option]:text-white"
                  >
                    <option value="">Select category</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Sports">Sports</option>
                    <option value="Education">Education</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Finance & Business">Finance &amp; Business</option>
                    <option value="Technology">Technology</option>
                    <option value="Fashion & Beauty">Fashion &amp; Beauty</option>
                    <option value="News & Politics">News &amp; Politics</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Music & Art">Music &amp; Art</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* D. Followers / Subscribers */}
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
                    placeholder="e.g. 25000"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Views / Engagement (optional) */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <span className="size-2 rounded-full bg-cyan-400" />
                Average Monthly Views or Likes (Optional)
              </label>
              <input
                type="text"
                value={viewsOrLikes}
                onChange={(e) => setViewsOrLikes(e.target.value)}
                placeholder="e.g. 150K monthly views / 5K likes per post"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* E. Channel Description */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <span className="size-2 rounded-full bg-purple-400" />
                Channel Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what your channel is about, audience demographics, niche, monetization history..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] p-3 text-xs text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
              />
            </div>
          </div>

          {/* STEP 04: DISPLAYED NAME & SELLER CONTACT */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    CHANNEL DISPLAY NAME &amp; SELLER CONTACT
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    The Displayed Name is the public title of the channel shown in the marketplace
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                STEP 04
              </span>
            </div>

            {/* F. Displayed Name: The actual name of the social media channel */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <span className="size-2.5 rounded-full bg-amber-400" />
                Displayed Channel Name * (Visible to Buyers)
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Tech Ethiopia / Ethio Daily News / Cinema Hub"
                className="w-full rounded-xl border border-amber-500/30 bg-[#0c1017] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition font-semibold"
              />
              <p className="text-[10px] text-slate-400">
                This is the actual name of your social media channel that buyers will see in the marketplace. It is not your personal username.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Seller Username */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <span className={`size-2 rounded-full ${currentContactConfig.dotColor}`} />
                  Seller Contact Username *
                </label>
                <input
                  type="text"
                  required
                  value={sellerUsername}
                  onChange={(e) => setSellerUsername(e.target.value)}
                  placeholder={currentContactConfig.placeholder}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition"
                />
                <p className="text-[10px] text-slate-500">
                  Used by our team to contact you. Example: @seid_seller
                </p>
              </div>

              {/* Seller Phone Number */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <span className="size-2 rounded-full bg-purple-400" />
                  Seller Phone Number *
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
                    placeholder="+251912345678"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Ethiopian phone format (+251...)
                </p>
              </div>
            </div>
          </div>

          {/* STEP 05: SELLING PRICE */}
          <div className="rounded-2xl border border-teal-500/20 bg-[#111722] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    SELLING PRICE
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Set your desired asking price in Ethiopian Birr (ETB)
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-400">
                STEP 05
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Price in Ethiopian Birr (ETB) *
              </label>
              <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] focus-within:border-teal-400 transition">
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full bg-transparent px-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
                />
                <span className="pr-4 text-xs font-extrabold text-amber-400">
                  ETB
                </span>
              </div>
            </div>
          </div>

          {/* STEP 06: SELLER PERMISSION & MANDATORY DECLARATION */}
          <div className="rounded-2xl border border-amber-500/40 bg-[#111722] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    SELLER PERMISSION &amp; DECLARATION
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Mandatory verification and ownership agreement
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                MANDATORY
              </span>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#0c1017] border border-white/[0.06] p-4">
              <input
                type="checkbox"
                id="seller_declaration"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4 rounded border-slate-700 bg-[#070b10] text-teal-500 focus:ring-teal-400"
              />
              <label
                htmlFor="seller_declaration"
                className="cursor-pointer text-xs leading-relaxed text-slate-300 select-none"
              >
                <span className="font-bold text-white">I solemnly declare and confirm:</span> I am the authorized owner or authorized manager of this social media channel and have full legal permission to sell it. I guarantee that all submitted dashboard screenshots, statistics, and links are genuine, accurate, and unedited. I understand that submitting fake information will result in account suspension.
              </label>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-teal-500/10 border border-teal-500/20 p-3 text-xs text-teal-300">
              <ShieldCheck size={16} className="text-teal-400 shrink-0" />
              <span>
                All purchases are protected by Hulu Market Escrow. Funds are locked safely during ownership transfer.
              </span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !agreed}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-4 text-sm font-extrabold text-slate-950 shadow-xl shadow-teal-500/25 transition hover:from-teal-400 hover:to-cyan-400 active:scale-[0.99] disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Submitting Listing for Review...</span>
                </>
              ) : (
                <>
                  <span>{editChannelId ? "Resubmit Channel for Review" : `Submit ${currentContactConfig.platformName} Listing for Review`}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* OTHER CATEGORIES FALLBACK FORM */}
      {!submitted && selectedMarketplace !== "social-media" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                  {marketplaceItems.find((m) => m.id === selectedMarketplace)?.label} Details
                </h2>
                <p className="text-[11px] text-slate-400">
                  Provide item specifications and photos
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Listing Title *</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. 2-Bedroom Luxury Apartment / iPhone 15 Pro"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Price in ETB *</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
              />
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#0c1017] border border-white/[0.06] p-4">
              <input
                type="checkbox"
                id="other_declaration"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4 rounded border-slate-700 bg-[#070b10] text-teal-500 focus:ring-teal-400"
              />
              <label htmlFor="other_declaration" className="cursor-pointer text-xs leading-relaxed text-slate-300 select-none">
                I confirm that I am the authorized owner of this item and have permission to sell it.
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !agreed}
              className="w-full rounded-2xl bg-teal-500 py-3.5 text-xs font-bold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
            >
              {isSubmitting ? "Submitting..." : "Submit Listing for Review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-xs text-slate-400">Loading Sell Form...</div>}>
      <SellPageInner />
    </Suspense>
  );
}
