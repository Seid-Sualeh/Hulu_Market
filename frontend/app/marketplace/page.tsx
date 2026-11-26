import Link from "next/link";
import {
  BookOpen,
  CarFront,
  Clapperboard,
  Home,
  House,
  Monitor,
  PanelsTopLeft,
} from "lucide-react";

const socialPlatforms = [
  {
    name: "Facebook",
    className: "bg-[#1877F2] text-white",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    name: "TikTok",
    className: "bg-black text-white ring-1 ring-white/20",
    path: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z",
  },
  {
    name: "Telegram",
    className: "bg-[#229ED9] text-white",
    path: "m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z",
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
  const categories = [
    {
      title: "Social Media Channels",
      href: "/social-media",
      icon: PanelsTopLeft,
      description: "Buy & sell verified Telegram, YouTube, TikTok, Facebook & Instagram accounts.",
      count: "10+ active listings",
      featured: true,
    },
    {
      title: "Houses & Properties",
      href: "/houses-properties",
      icon: House,
      description: "Apartments, villas, and commercial real estate across Addis Ababa and regional cities.",
      count: "Upcoming listings",
    },
    {
      title: "Vehicles",
      href: "/vehicles",
      icon: CarFront,
      description: "Cars, commercial trucks, EVs and motorbikes with verified inspections.",
      count: "Upcoming listings",
    },
    {
      title: "Electronics",
      href: "/electronics",
      icon: Monitor,
      description: "Laptops, smartphones, audio systems, and computer hardware accessories.",
      count: "Upcoming listings",
    },
    {
      title: "Ebooks & Digital Products",
      href: "/digital-products",
      icon: BookOpen,
      description: "Educational documents, study notes, academic ebooks, templates, and guides.",
      count: "Active digital catalog",
      featured: true,
    },
    {
      title: "Educational Videos",
      href: "/educational-videos",
      icon: Clapperboard,
      description: "Curated online video courses, masterclasses, and tutorial series.",
      count: "Upcoming listings",
    },
    {
      title: "Home & Furniture",
      href: "/home-furniture",
      icon: Home,
      description: "Living room sets, modern kitchen equipment, office desks, and interior decor.",
      count: "Upcoming listings",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-teal-400">
          Discover
        </span>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Marketplace Categories
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Browse verified listings across physical items, digital products, and digital channels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className={`group relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                c.featured
                  ? "border-teal-500/40 bg-gradient-to-br from-[#10232b] to-[#0e1722] ring-1 ring-teal-500/30"
                  : "border-white/[0.08] bg-[#121721] hover:border-slate-500"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`grid size-12 place-items-center rounded-xl ${
                      c.featured
                        ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
                        : "bg-white/[0.05] text-slate-300 group-hover:text-teal-400"
                    }`}
                  >
                    <Icon size={22} />
                  </div>
                  {c.featured && c.href !== "/social-media" && (
                    <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-300">
                      Popular
                    </span>
                  )}
                </div>

                {c.href === "/social-media" && (
                  <div
                    role="img"
                    aria-label="Facebook, TikTok, Telegram, Instagram, and YouTube"
                    className="absolute right-6 top-7 z-10 flex items-center -space-x-1.5"
                  >
                    {socialPlatforms.map((platform, index) => (
                      <span
                        key={platform.name}
                        title={platform.name}
                        className={`grid size-8 place-items-center rounded-full border-2 border-[#10232b] shadow-lg transition-transform group-hover:translate-y-[-3px] ${
                          platform.className
                        } ${index % 2 === 0 ? "animate-float-badge-1" : "animate-float-badge-2"}`}
                      >
                        <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
                          <path d={platform.path} />
                        </svg>
                      </span>
                    ))}
                  </div>
                )}

                <h2 className="mt-4 text-base font-bold text-white group-hover:text-teal-300 transition">
                  {c.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {c.description}
                </p>
              </div>

              <div className="mt-6 border-t border-white/[0.06] pt-3 text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>{c.count}</span>
                <span className="text-teal-400 group-hover:translate-x-1 transition">
                  View →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
