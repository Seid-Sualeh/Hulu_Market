import Link from "next/link";
import {
  Armchair,
  BookOpen,
  CarFront,
  Clapperboard,
  GraduationCap,
  House,
  Monitor,
  Play,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";

const socialPlatforms = [
  {
    name: "Telegram",
    className: "bg-[#229ED9] text-white",
    path: "m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z",
  },
  {
    name: "TikTok",
    className: "bg-black text-white ring-1 ring-white/20",
    path: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z",
  },
  {
    name: "Instagram",
    className: "bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  {
    name: "YouTube",
    className: "bg-[#FF0000] text-white",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
];

export default function MarketplacePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-in fade-in duration-200">
      {/* ── 1. MARKETPLACE HERO BANNER (MATCHING REFERENCE DESIGN) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-r from-[#0d1320] via-[#10192a] to-[#0d1320] p-6 sm:p-8 shadow-2xl">
        {/* Subtle Ambient Golden Glow / Bottom Edge */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.5)]"
          aria-hidden="true"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Titles & Subtitle */}
          <div className="space-y-3 max-w-xl z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
              <ShoppingCart size={14} className="text-amber-400" />
              <span>Hulu Market Marketplace</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-sans">
              <span>Marketplace </span>
              <span className="text-[#F3BA2F]">Categories</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-lg">
              Browse verified listings across physical items, digital products, and more.
            </p>
          </div>

          {/* Right: Golden Shopping Cart with Hulu Bag & Floating Badges */}
          <div className="relative hidden md:flex items-center justify-end pr-6">
            <div className="relative w-64 h-36 flex items-center justify-center">
              {/* Golden Wave Line Beneath Cart */}
              <svg
                className="absolute -bottom-2 -left-8 w-72 h-16 pointer-events-none"
                viewBox="0 0 240 60"
                fill="none"
              >
                <path
                  d="M 5 45 Q 60 10, 120 35 T 235 15"
                  stroke="url(#cartWaveGold)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="cartWaveGold" x1="0" y1="45" x2="240" y2="15" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#D97706" />
                    <stop offset="50%" stopColor="#FCD34D" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Floating Badge 1: Blue Play (Top Left) */}
              <div className="absolute -top-1 left-2 z-20 animate-float-slow-1">
                <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] text-white shadow-lg shadow-sky-500/30 border border-white/20">
                  <Play size={15} className="fill-current ml-0.5" />
                </div>
              </div>

              {/* Floating Badge 2: Orange House (Center Left) */}
              <div className="absolute top-10 -left-4 z-20 animate-float-slow-2">
                <div className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-[#EA580C] to-[#FB923C] text-white shadow-lg shadow-orange-500/30 border border-white/20">
                  <House size={14} className="fill-current" />
                </div>
              </div>

              {/* Floating Badge 3: Orange House/Tag (Top Right) */}
              <div className="absolute -top-2 right-1 z-20 animate-float-slow-3">
                <div className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-[#EA580C] to-[#FDBA74] text-white shadow-lg shadow-orange-500/30 border border-white/20">
                  <House size={14} className="fill-current" />
                </div>
              </div>

              {/* Floating Badge 4: Orange Price Tag (Right) */}
              <div className="absolute top-14 -right-3 z-20 animate-float-badge-1">
                <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-tr from-[#F59E0B] to-[#FDE047] text-slate-950 shadow-md shadow-amber-500/30 border border-white/20">
                  <Tag size={13} className="fill-current" />
                </div>
              </div>

              {/* Shopping Cart with Gold Hulu Bag */}
              <div className="relative z-10 flex items-center justify-center filter drop-shadow-[0_10px_20px_rgba(245,158,11,0.35)]">
                <svg width="150" height="110" viewBox="0 0 160 120" fill="none">
                  {/* Cart Basket Metal Grid */}
                  <path
                    d="M 25 35 L 42 35 L 60 85 L 138 85 L 148 40 L 45 40"
                    stroke="#94A3B8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Grid Lines */}
                  <line x1="55" y1="52" x2="145" y2="52" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.8" />
                  <line x1="57" y1="68" x2="141" y2="68" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.8" />
                  <line x1="75" y1="40" x2="72" y2="85" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.8" />
                  <line x1="95" y1="40" x2="93" y2="85" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.8" />
                  <line x1="115" y1="40" x2="114" y2="85" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.8" />
                  <line x1="135" y1="40" x2="135" y2="85" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.8" />

                  {/* Cart Wheels */}
                  <circle cx="68" cy="98" r="7" stroke="#94A3B8" strokeWidth="3" fill="#1E293B" />
                  <circle cx="130" cy="98" r="7" stroke="#94A3B8" strokeWidth="3" fill="#1E293B" />
                  <line x1="60" y1="85" x2="68" y2="98" stroke="#94A3B8" strokeWidth="2.5" />
                  <line x1="138" y1="85" x2="130" y2="98" stroke="#94A3B8" strokeWidth="2.5" />

                  {/* 3D Gold Hulu Bag Inside Basket */}
                  <g transform="translate(68, 12)">
                    {/* Handles */}
                    <path
                      d="M 22 24 C 22 10, 42 10, 42 24"
                      stroke="#FDE047"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Bag Body */}
                    <path
                      d="M 12 24 L 52 24 L 58 70 L 6 70 Z"
                      fill="url(#cartBagGrad)"
                    />
                    {/* Fold shadow */}
                    <path
                      d="M 6 70 L 12 24 L 15 24 L 11 70 Z"
                      fill="#B45309"
                      opacity="0.4"
                    />
                    {/* Hulu text */}
                    <text
                      x="32"
                      y="48"
                      textAnchor="middle"
                      fill="#1E1B18"
                      fontSize="12"
                      fontWeight="800"
                      fontFamily="serif"
                    >
                      Hulu
                    </text>
                    {/* Smile curve */}
                    <path
                      d="M 25 54 Q 32 61 39 54"
                      stroke="#1E1B18"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>

                  <defs>
                    <linearGradient id="cartBagGrad" x1="12" y1="24" x2="58" y2="70" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FDE047" />
                      <stop offset="40%" stopColor="#EAB308" />
                      <stop offset="100%" stopColor="#CA8A04" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SEVEN MARKETPLACE CATEGORY CARDS (MATCHING REFERENCE DESIGN) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* ── CARD 1: Social Media Channels (Blue Gradient) ── */}
        <Link
          href="/social-media"
          className="group relative flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[#0c1a30] via-[#091426] to-[#071120] p-6 shadow-xl hover:border-blue-500/60 transition-all duration-200 hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              {/* Vibrant Blue Squircle Icon */}
              <div className="grid size-12 place-items-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                <Users size={22} />
              </div>

              {/* Floating Social Media Platform Badges (Floating Animation Preserved) */}
              <div
                role="img"
                aria-label="Telegram, TikTok, Instagram, and YouTube"
                className="flex items-center -space-x-1.5"
              >
                {socialPlatforms.map((platform, index) => (
                  <span
                    key={platform.name}
                    title={platform.name}
                    className={`grid size-8 place-items-center rounded-full border-2 border-[#091426] shadow-md transition-transform group-hover:translate-y-[-2px] ${
                      platform.className
                    } ${index % 2 === 0 ? "animate-float-badge-1" : "animate-float-badge-2"}`}
                  >
                    <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
                      <path d={platform.path} />
                    </svg>
                  </span>
                ))}
              </div>
            </div>

            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-cyan-300 transition">
              Social Media Channels
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Buy &amp; sell verified Telegram, YouTube, TikTok, Facebook &amp; Instagram accounts.
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Users size={14} className="text-blue-400" />
              <span>10+ active listings</span>
            </span>
            <span className="rounded-full border border-amber-500/50 bg-[#161d28] px-3.5 py-1 text-xs font-bold text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition shadow-sm flex items-center gap-1">
              <span>View</span>
              <span>&rarr;</span>
            </span>
          </div>
        </Link>

        {/* ── CARD 2: Ebooks & Digital Products (Emerald/Teal Gradient) ── */}
        <Link
          href="/digital-products"
          className="group relative flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#09221d] via-[#071b17] to-[#061411] p-6 shadow-xl hover:border-emerald-500/60 transition-all duration-200 hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              {/* Vibrant Cyan/Teal Squircle Icon */}
              <div className="grid size-12 place-items-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/30">
                <BookOpen size={22} />
              </div>

              {/* 3D Stack of Hardcover Books Illustration */}
              <div className="relative w-20 h-14">
                <svg viewBox="0 0 100 70" fill="none" className="w-full h-full drop-shadow-md">
                  {/* Bottom Book */}
                  <polygon points="15,48 50,60 90,44 55,34" fill="#0284C7" />
                  <polygon points="15,48 50,60 50,65 15,53" fill="#0369A1" />
                  <polygon points="50,60 90,44 90,49 50,65" fill="#E2E8F0" />
                  <polygon points="15,48 15,53 50,65 50,60" fill="#075985" />

                  {/* Middle Book */}
                  <polygon points="12,38 48,50 88,34 52,24" fill="#0EA5E9" />
                  <polygon points="12,38 48,50 48,55 12,43" fill="#0284C7" />
                  <polygon points="48,50 88,34 88,39 48,55" fill="#F8FAFC" />

                  {/* Top Book with Gold Bookmark Ribbon */}
                  <polygon points="10,28 46,40 86,24 50,14" fill="#38BDF8" />
                  <polygon points="10,28 46,40 46,45 10,33" fill="#0284C7" />
                  <polygon points="46,40 86,24 86,29 46,45" fill="#F8FAFC" />
                  {/* Bookmark ribbon */}
                  <path d="M 40 28 L 44 44 L 48 40 L 52 44 L 50 28 Z" fill="#F59E0B" />
                </svg>
              </div>
            </div>

            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-emerald-300 transition">
              Ebooks &amp; Digital Products
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Educational documents, study notes, academic ebooks, templates, and guides.
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <BookOpen size={14} className="text-teal-400" />
              <span>Active digital catalog</span>
            </span>
            <span className="rounded-full border border-amber-500/50 bg-[#161d28] px-3.5 py-1 text-xs font-bold text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition shadow-sm flex items-center gap-1">
              <span>View</span>
              <span>&rarr;</span>
            </span>
          </div>
        </Link>

        {/* ── CARD 3: Houses & Properties (Purple Gradient) ── */}
        <Link
          href="/houses-properties"
          className="group relative flex flex-col justify-between rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1c1236] via-[#150d28] to-[#100a20] p-6 shadow-xl hover:border-purple-500/60 transition-all duration-200 hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              {/* Vibrant Purple Squircle Icon */}
              <div className="grid size-12 place-items-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/30">
                <House size={22} />
              </div>

              {/* Modern Villa Illustration with Amber Illuminated Windows */}
              <div className="relative w-24 h-16">
                <svg viewBox="0 0 120 75" fill="none" className="w-full h-full drop-shadow-md">
                  {/* House Main Body */}
                  <rect x="25" y="24" width="70" height="42" rx="2" fill="#1E1B4B" stroke="#4338CA" strokeWidth="1" />
                  {/* Roof overhang */}
                  <rect x="20" y="20" width="80" height="5" rx="1.5" fill="#312E81" />
                  <rect x="23" y="16" width="35" height="5" rx="1" fill="#4338CA" />

                  {/* Second Story Windows (Glowing Amber Warm Light) */}
                  <rect x="30" y="28" width="16" height="12" rx="1" fill="#FEF08A" opacity="0.9" />
                  <rect x="52" y="28" width="16" height="12" rx="1" fill="#FEF08A" opacity="0.9" />
                  <rect x="74" y="28" width="16" height="12" rx="1" fill="#FDE047" opacity="0.8" />
                  {/* Window Mullions */}
                  <line x1="38" y1="28" x2="38" y2="40" stroke="#78350F" strokeWidth="1" />
                  <line x1="60" y1="28" x2="60" y2="40" stroke="#78350F" strokeWidth="1" />
                  <line x1="82" y1="28" x2="82" y2="40" stroke="#78350F" strokeWidth="1" />

                  {/* Ground Floor Glass Living Room & Front Door */}
                  <rect x="30" y="46" width="30" height="20" rx="1" fill="#FDE68A" opacity="0.85" />
                  <rect x="68" y="46" width="14" height="20" rx="1" fill="#D97706" />
                  {/* Balcony Railing */}
                  <line x1="25" y1="44" x2="95" y2="44" stroke="#818CF8" strokeWidth="1.5" />

                  {/* Outdoor Warm Lights & Shrub */}
                  <circle cx="102" cy="58" r="8" fill="#047857" opacity="0.8" />
                  <circle cx="18" cy="60" r="6" fill="#047857" opacity="0.8" />
                </svg>
              </div>
            </div>

            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-purple-300 transition">
              Houses &amp; Properties
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Apartments, villas, and commercial real estate across Addis Ababa and regions.
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <House size={14} className="text-purple-400" />
              <span>Upcoming listings</span>
            </span>
            <span className="rounded-full border border-amber-500/50 bg-[#161d28] px-3.5 py-1 text-xs font-bold text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition shadow-sm flex items-center gap-1">
              <span>View</span>
              <span>&rarr;</span>
            </span>
          </div>
        </Link>

        {/* ── CARD 4: Vehicles (Amber/Orange Gradient) ── */}
        <Link
          href="/vehicles"
          className="group relative flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#26180a] via-[#1c1207] to-[#160e05] p-6 shadow-xl hover:border-amber-500/60 transition-all duration-200 hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              {/* Vibrant Amber/Orange Squircle Icon */}
              <div className="grid size-12 place-items-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                <CarFront size={22} />
              </div>

              {/* White SUV / Vehicle Illustration */}
              <div className="relative w-28 h-14">
                <svg viewBox="0 0 130 65" fill="none" className="w-full h-full drop-shadow-md">
                  {/* Car Shadow */}
                  <ellipse cx="65" cy="58" rx="55" ry="5" fill="#000" opacity="0.5" />

                  {/* Car Body Base */}
                  <path
                    d="M 12 44 L 20 34 L 38 32 L 52 16 L 94 16 L 108 30 L 122 36 L 124 45 L 118 48 C 114 44, 102 44, 98 48 L 44 48 C 40 44, 28 44, 24 48 L 12 46 Z"
                    fill="#F1F5F9"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />
                  {/* Front/Rear Bumpers & Grill */}
                  <rect x="120" y="38" width="5" height="10" rx="2" fill="#334155" />
                  <rect x="10" y="38" width="5" height="8" rx="2" fill="#334155" />

                  {/* Dark Windows */}
                  <path d="M 54 19 L 75 19 L 75 32 L 42 32 Z" fill="#0F172A" />
                  <path d="M 78 19 L 92 19 L 104 31 L 78 31 Z" fill="#0F172A" />
                  {/* Headlights Amber Accent */}
                  <polygon points="120,38 124,37 124,41" fill="#F59E0B" />

                  {/* Alloy Wheels */}
                  <circle cx="34" cy="48" r="10" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
                  <circle cx="34" cy="48" r="4.5" fill="#CBD5E1" />
                  <circle cx="108" cy="48" r="10" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
                  <circle cx="108" cy="48" r="4.5" fill="#CBD5E1" />
                </svg>
              </div>
            </div>

            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-amber-300 transition">
              Vehicles
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Cars, commercial trucks, EVs and motorbikes with verified inspections.
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CarFront size={14} className="text-amber-400" />
              <span>Upcoming listings</span>
            </span>
            <span className="rounded-full border border-amber-500/50 bg-[#161d28] px-3.5 py-1 text-xs font-bold text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition shadow-sm flex items-center gap-1">
              <span>View</span>
              <span>&rarr;</span>
            </span>
          </div>
        </Link>

        {/* ── CARD 5: Electronics (Teal/Emerald Gradient) ── */}
        <Link
          href="/electronics"
          className="group relative flex flex-col justify-between rounded-2xl border border-teal-500/30 bg-gradient-to-br from-[#082220] via-[#061917] to-[#051413] p-6 shadow-xl hover:border-teal-500/60 transition-all duration-200 hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              {/* Vibrant Emerald/Teal Squircle Icon */}
              <div className="grid size-12 place-items-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/30">
                <Monitor size={22} />
              </div>

              {/* Modern Open Laptop Display with Blue Wallpaper */}
              <div className="relative w-24 h-16">
                <svg viewBox="0 0 110 70" fill="none" className="w-full h-full drop-shadow-md">
                  {/* Laptop Screen Bezel */}
                  <rect x="20" y="8" width="70" height="46" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                  {/* Vibrant Blue Abstract Screen Wallpaper */}
                  <rect x="23" y="11" width="64" height="40" rx="1.5" fill="#0284C7" />
                  <path d="M 23 25 Q 50 15, 87 35 L 87 51 L 23 51 Z" fill="#38BDF8" opacity="0.8" />
                  <path d="M 35 11 Q 65 30, 87 20 L 87 11 Z" fill="#60A5FA" opacity="0.6" />
                  {/* Webcam */}
                  <circle cx="55" cy="9.5" r="0.8" fill="#64748B" />

                  {/* Laptop Base Deck */}
                  <polygon points="10,54 100,54 106,62 4,62" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                  {/* Trackpad */}
                  <rect x="46" y="56" width="18" height="4" rx="1" fill="#334155" />
                </svg>
              </div>
            </div>

            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-teal-300 transition">
              Electronics
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Laptops, smartphones, audio systems, and computer hardware accessories.
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Monitor size={14} className="text-teal-400" />
              <span>Upcoming listings</span>
            </span>
            <span className="rounded-full border border-amber-500/50 bg-[#161d28] px-3.5 py-1 text-xs font-bold text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition shadow-sm flex items-center gap-1">
              <span>View</span>
              <span>&rarr;</span>
            </span>
          </div>
        </Link>

        {/* ── CARD 6: Educational Videos (Violet/Purple Gradient) ── */}
        <Link
          href="/educational-videos"
          className="group relative flex flex-col justify-between rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#1a1133] via-[#140c26] to-[#0f0920] p-6 shadow-xl hover:border-violet-500/60 transition-all duration-200 hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              {/* Vibrant Violet Squircle Icon */}
              <div className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/30">
                <GraduationCap size={22} />
              </div>

              {/* Graduation Cap (Mortarboard) & Diploma Scroll Illustration */}
              <div className="relative w-24 h-16">
                <svg viewBox="0 0 110 70" fill="none" className="w-full h-full drop-shadow-md">
                  {/* Mortarboard Rhombus Top */}
                  <polygon points="55,10 95,22 55,34 15,22" fill="#1E1B4B" stroke="#4338CA" strokeWidth="1.5" />
                  {/* Cap Underneath Skullcap */}
                  <path d="M 35 28 L 35 38 C 35 46, 75 46, 75 38 L 75 28 Z" fill="#312E81" />
                  {/* Golden Button & Tassel */}
                  <circle cx="55" cy="22" r="2.5" fill="#F59E0B" />
                  <path d="M 55 22 Q 78 24, 82 40" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <rect x="80" y="40" width="4" height="8" rx="1" fill="#F59E0B" />

                  {/* Rolled Diploma Scroll with Red Ribbon */}
                  <rect x="60" y="48" width="36" height="12" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
                  <rect x="74" y="47" width="8" height="14" rx="1.5" fill="#DC2626" />
                </svg>
              </div>
            </div>

            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-violet-300 transition">
              Educational Videos
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Curated online video courses, masterclasses, and tutorial series.
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clapperboard size={14} className="text-violet-400" />
              <span>Upcoming listings</span>
            </span>
            <span className="rounded-full border border-amber-500/50 bg-[#161d28] px-3.5 py-1 text-xs font-bold text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition shadow-sm flex items-center gap-1">
              <span>View</span>
              <span>&rarr;</span>
            </span>
          </div>
        </Link>

        {/* ── CARD 7: Home & Furniture (Cyan/Teal Gradient) ── */}
        <Link
          href="/home-furniture"
          className="group relative flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0a2029] via-[#07181f] to-[#061318] p-6 shadow-xl hover:border-cyan-500/60 transition-all duration-200 hover:-translate-y-1 md:col-span-2 lg:col-span-1"
        >
          <div>
            <div className="flex items-center justify-between">
              {/* Vibrant Cyan Squircle Icon */}
              <div className="grid size-12 place-items-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-500/30">
                <Armchair size={22} />
              </div>

              {/* Modern Living Room Sofa & Coffee Table Illustration */}
              <div className="relative w-28 h-16">
                <svg viewBox="0 0 120 70" fill="none" className="w-full h-full drop-shadow-md">
                  {/* Living Room Plant */}
                  <circle cx="20" cy="30" r="10" fill="#047857" opacity="0.8" />
                  <rect x="18" y="38" width="4" height="18" fill="#78350F" />
                  <polygon points="16,48 24,48 22,58 18,58" fill="#475569" />

                  {/* Sofa Backrest & Seat */}
                  <rect x="35" y="24" width="60" height="20" rx="4" fill="#334155" stroke="#475569" strokeWidth="1" />
                  {/* Sofa Cushions */}
                  <rect x="38" y="32" width="26" height="18" rx="3" fill="#475569" />
                  <rect x="66" y="32" width="26" height="18" rx="3" fill="#475569" />
                  {/* Sofa Armrests */}
                  <rect x="32" y="30" width="8" height="20" rx="3" fill="#1E293B" />
                  <rect x="90" y="30" width="8" height="20" rx="3" fill="#1E293B" />
                  {/* Sofa Wooden Legs */}
                  <line x1="36" y1="50" x2="33" y2="60" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="94" y1="50" x2="97" y2="60" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Modern Coffee Table */}
                  <rect x="52" y="54" width="30" height="4" rx="1.5" fill="#D97706" />
                  <line x1="56" y1="58" x2="54" y2="66" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
                  <line x1="78" y1="58" x2="80" y2="66" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-cyan-300 transition">
              Home &amp; Furniture
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Living room sets, modern kitchen equipment, office desks, and interior decor.
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <House size={14} className="text-cyan-400" />
              <span>Upcoming listings</span>
            </span>
            <span className="rounded-full border border-amber-500/50 bg-[#161d28] px-3.5 py-1 text-xs font-bold text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition shadow-sm flex items-center gap-1">
              <span>View</span>
              <span>&rarr;</span>
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
