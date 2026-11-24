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
              className={`group flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
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
                  {c.featured && (
                    <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-300">
                      Popular
                    </span>
                  )}
                </div>

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
