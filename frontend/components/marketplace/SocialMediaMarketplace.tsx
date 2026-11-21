"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BadgeCheck,
  CirclePlay,
  Heart,
  PanelsTopLeft,
  Search,
  Send,
  ShoppingBag,
  Music2,
  UsersRound,
  X,
} from "lucide-react";

const platforms = [
  { id: "all", label: "All channels", icon: ShoppingBag },
  { id: "youtube", label: "YouTube", icon: CirclePlay },
  { id: "instagram", label: "Instagram", icon: PanelsTopLeft },
  { id: "tiktok", label: "TikTok", icon: Music2 },
  { id: "telegram", label: "Telegram", icon: Send },
  { id: "facebook", label: "Facebook", icon: UsersRound },
] as const;

type PlatformId = (typeof platforms)[number]["id"];

const platformStyles: Record<
  Exclude<PlatformId, "all">,
  { color: string; gradient: string; label: string }
> = {
  youtube: {
    color: "text-red-300",
    gradient: "from-red-500/25 to-rose-950/30",
    label: "YouTube",
  },
  instagram: {
    color: "text-fuchsia-300",
    gradient: "from-fuchsia-500/25 to-orange-950/30",
    label: "Instagram",
  },
  tiktok: {
    color: "text-cyan-300",
    gradient: "from-cyan-400/20 to-slate-950/50",
    label: "TikTok",
  },
  telegram: {
    color: "text-sky-300",
    gradient: "from-sky-500/25 to-blue-950/30",
    label: "Telegram",
  },
  facebook: {
    color: "text-blue-300",
    gradient: "from-blue-500/25 to-indigo-950/30",
    label: "Facebook",
  },
};

const listings = [
  {
    id: "telegram-community",
    platform: "telegram",
    title: "Telegram community",
    category: "Community",
    description:
      "A ready-to-explore community channel with its audience and activity details available in the listing.",
    audience: "Community",
    mark: "T",
  },
  {
    id: "instagram-creator",
    platform: "instagram",
    title: "Instagram creator page",
    category: "Creator",
    description:
      "A creator-focused Instagram page. Review the listing details to learn more about its content and audience.",
    audience: "Creator",
    mark: "I",
  },
  {
    id: "facebook-business",
    platform: "facebook",
    title: "Facebook business page",
    category: "Business",
    description:
      "A business-oriented Facebook page with channel information provided in its listing.",
    audience: "Business",
    mark: "f",
  },
  {
    id: "tiktok-creator",
    platform: "tiktok",
    title: "TikTok creator account",
    category: "Creator",
    description:
      "A short-form video creator account. Explore the listing for account-specific details.",
    audience: "Creator",
    mark: "♪",
  },
  {
    id: "youtube-education",
    platform: "youtube",
    title: "YouTube video channel",
    category: "Education",
    description:
      "An educational video channel listing. Channel information is available for review.",
    audience: "Education",
    mark: "▶",
  },
  {
    id: "telegram-topic",
    platform: "telegram",
    title: "Telegram topic channel",
    category: "News & topics",
    description:
      "A topic-focused Telegram channel. Check the listing details for more information.",
    audience: "News & topics",
    mark: "T",
  },
  {
    id: "instagram-brand",
    platform: "instagram",
    title: "Instagram brand page",
    category: "Lifestyle",
    description:
      "A lifestyle-oriented brand page. Explore its available channel details before making a decision.",
    audience: "Lifestyle",
    mark: "I",
  },
  {
    id: "facebook-community",
    platform: "facebook",
    title: "Facebook community page",
    category: "Community",
    description:
      "A community page listing with relevant account information available to browse.",
    audience: "Community",
    mark: "f",
  },
] satisfies {
  id: string;
  platform: Exclude<PlatformId, "all">;
  title: string;
  category: string;
  description: string;
  audience: string;
  mark: string;
}[];

function isPlatformId(value: string): value is PlatformId {
  return platforms.some((platform) => platform.id === value);
}

export default function SocialMediaMarketplace({
  initialPlatform,
}: {
  initialPlatform: PlatformId;
}) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformId>(initialPlatform);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedListing, setExpandedListing] = useState<string | null>(null);

  const visibleListings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesPlatform =
        selectedPlatform === "all" || listing.platform === selectedPlatform;
      const matchesQuery =
        !normalizedQuery ||
        `${listing.title} ${listing.category} ${listing.description}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesPlatform && matchesQuery;
    });
  }, [query, selectedPlatform]);

  function choosePlatform(platform: PlatformId) {
    if (isPlatformId(platform)) {
      setSelectedPlatform(platform);
    }
  }

  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favorite) => favorite !== id)
        : [...current, id],
    );
  }

  return (
    <main className="mx-auto max-w-[1440px]">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Marketplace <span className="px-1 text-slate-600">/</span> Social
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-[28px]">
            Social media channels
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Explore channels and browse listing details.
          </p>
        </div>
        <button
          type="button"
          aria-label="Filter social media listings"
          onClick={() =>
            document
              .getElementById("channel-platforms")
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          className="mt-1 grid size-11 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-[#151b24] text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <ArrowDownWideNarrow aria-hidden="true" size={18} />
        </button>
      </header>

      <div className="mb-5 flex min-h-12 overflow-hidden rounded-xl border border-white/[0.08] bg-[#151b24] focus-within:border-cyan-400/40 focus-within:ring-2 focus-within:ring-cyan-400/10">
        <label htmlFor="listing-search" className="sr-only">
          Search social media listings
        </label>
        <Search
          aria-hidden="true"
          size={18}
          className="ml-4 mt-3.5 shrink-0 text-slate-500"
        />
        <input
          id="listing-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search channels..."
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="px-3 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
          >
            <X aria-hidden="true" size={17} />
          </button>
        )}
        <div
          aria-hidden="true"
          className="grid w-14 shrink-0 place-items-center bg-blue-500 text-white"
        >
          <Search size={19} />
        </div>
      </div>

      <section
        id="channel-platforms"
        aria-labelledby="platform-heading"
        className="mb-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#171f2a] to-[#141a23] p-4 sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="platform-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
          >
            Select platform
          </h2>
          <span className="text-[11px] text-slate-600">
            {visibleListings.length} listings
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const selected = selectedPlatform === platform.id;

            return (
              <button
                key={platform.id}
                type="button"
                aria-pressed={selected}
                onClick={() => choosePlatform(platform.id)}
                className={`group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  selected
                    ? "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-200"
                    : "border-transparent text-slate-500 hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-slate-200"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  size={21}
                  strokeWidth={selected ? 2 : 1.8}
                />
                <span className="text-[11px] font-medium">
                  {platform.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Featured social media channels"
        className="relative mb-5 flex min-h-36 items-center overflow-hidden rounded-2xl border border-cyan-300/10 bg-[radial-gradient(ellipse_at_80%_35%,rgba(34,211,238,0.22),transparent_38%),radial-gradient(ellipse_at_15%_120%,rgba(59,130,246,0.3),transparent_50%),linear-gradient(110deg,#172b35,#18232d_55%,#17202a)] px-6 py-6 sm:min-h-40 sm:px-9"
      >
        <div
          aria-hidden="true"
          className="absolute -right-4 -top-20 size-64 rounded-full border border-cyan-200/10 sm:right-12"
        />
        <div
          aria-hidden="true"
          className="absolute -right-1 -top-12 size-48 rounded-full border border-cyan-200/10"
        />
        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/15 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
            <BadgeCheck aria-hidden="true" size={12} />
            Find your next channel
          </span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Discover communities worth following.
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-slate-300/75 sm:text-sm">
            Browse social channels across the platforms you already know.
          </p>
          <a
            href="#channel-listings"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-cyan-200 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Explore listings
            <ArrowRight aria-hidden="true" size={14} />
          </a>
        </div>
        <div
          aria-hidden="true"
          className="relative ml-auto hidden size-24 shrink-0 items-center justify-center rounded-[1.7rem] border border-cyan-100/15 bg-white/[0.05] text-cyan-100 shadow-xl shadow-black/15 sm:flex"
        >
          <UsersRound size={38} strokeWidth={1.4} />
          <span className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-xl border border-cyan-100/15 bg-[#1a3039] text-cyan-200">
            <ShoppingBag size={16} />
          </span>
        </div>
      </section>

      <section id="channel-listings" aria-labelledby="listing-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2
              id="listing-heading"
              className="text-base font-semibold text-slate-100"
            >
              Channel listings
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Browse available channels and their listing information.
            </p>
          </div>
          <span className="shrink-0 text-xs text-slate-500">
            {visibleListings.length} results
          </span>
        </div>

        {visibleListings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleListings.map((listing) => {
              const style = platformStyles[listing.platform];
              const favorite = favorites.includes(listing.id);
              const expanded = expandedListing === listing.id;

              return (
                <article
                  key={listing.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#1b232e] to-[#151b23] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:shadow-xl hover:shadow-black/20"
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${style.gradient} opacity-80`}
                  />
                  <div className="relative p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br ${style.gradient} text-xl font-semibold ${style.color}`}
                        aria-hidden="true"
                      >
                        {listing.mark}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-200 ring-1 ring-inset ring-blue-400/15">
                            Listing
                          </span>
                          <span className="truncate text-[10px] font-medium text-slate-500">
                            {style.label}
                          </span>
                        </div>
                        <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-100">
                          {listing.title}
                        </h3>
                        <p className={`mt-1 text-[11px] font-medium ${style.color}`}>
                          {listing.category}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={
                          favorite
                            ? `Remove ${listing.title} from favorites`
                            : `Add ${listing.title} to favorites`
                        }
                        aria-pressed={favorite}
                        onClick={() => toggleFavorite(listing.id)}
                        className={`grid size-9 shrink-0 place-items-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                          favorite
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                            : "border-white/[0.08] bg-black/10 text-slate-500 hover:border-rose-400/20 hover:text-rose-300"
                        }`}
                      >
                        <Heart
                          aria-hidden="true"
                          size={17}
                          fill={favorite ? "currentColor" : "none"}
                        />
                      </button>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-cyan-300">
                          <UsersRound aria-hidden="true" size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-semibold text-slate-200">
                            Channel audience
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                            Details in listing
                          </span>
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                        Available
                      </span>
                    </div>

                    {expanded && (
                      <p className="mt-3 rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2.5 text-xs leading-5 text-slate-400">
                        {listing.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4">
                      <span className="text-[10px] font-medium text-slate-500">
                        {listing.audience}
                      </span>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedListing(expanded ? null : listing.id)
                        }
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.07] px-3 text-[11px] font-semibold text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                      >
                        {expanded ? "Hide details" : "View details"}
                        <ArrowRight
                          aria-hidden="true"
                          size={13}
                          className={expanded ? "rotate-90" : ""}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-14 text-center">
            <Search
              aria-hidden="true"
              size={24}
              className="mx-auto text-slate-600"
            />
            <h3 className="mt-3 text-sm font-semibold text-slate-300">
              No channels found
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Try a different platform or search term.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedPlatform("all");
              }}
              className="mt-4 text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
