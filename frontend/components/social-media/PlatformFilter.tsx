"use client";

import { PlatformType } from "./types";

interface PlatformFilterProps {
  selected: PlatformType;
  onSelect: (platform: PlatformType) => void;
}

export default function PlatformFilter({
  selected,
  onSelect,
}: PlatformFilterProps) {
  const platforms: {
    id: PlatformType;
    label: string;
    icon: React.ReactNode;
    color: string;
    hoverStyle: string;
    selectedStyle: string;
  }[] = [
    {
      id: "youtube",
      label: "YouTube",
      color: "text-red-400",
      hoverStyle: "hover:bg-red-500/10 hover:text-red-300",
      selectedStyle: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-400/25",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      id: "instagram",
      label: "Instagram",
      color: "text-pink-400",
      hoverStyle: "hover:bg-pink-500/10 hover:text-pink-300",
      selectedStyle:
        "bg-pink-500/15 text-pink-300 ring-1 ring-inset ring-pink-400/25",
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
      color: "text-cyan-300",
      hoverStyle: "hover:bg-cyan-400/10 hover:text-cyan-200",
      selectedStyle:
        "bg-cyan-400/15 text-cyan-200 ring-1 ring-inset ring-cyan-300/25",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
        </svg>
      ),
    },
    {
      id: "telegram",
      label: "Telegram",
      color: "text-sky-400",
      hoverStyle: "hover:bg-sky-500/10 hover:text-sky-300",
      selectedStyle: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-400/25",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.458l2.199-2.138 4.573 3.378c.843.465 1.45.225 1.66-.782l3.003-14.152c.307-1.23-.468-1.787-1.214-1.465z" />
        </svg>
      ),
    },
    {
      id: "facebook",
      label: "Facebook",
      color: "text-blue-400",
      hoverStyle: "hover:bg-blue-500/10 hover:text-blue-300",
      selectedStyle:
        "bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/25",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ];

  return (
    <section
      aria-label="Select platform"
      className="rounded-2xl border border-slate-700/70 bg-gradient-to-br from-[#202833] to-[#1b222c] p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Select platform
        </h2>
        {selected !== "all" && (
          <button
            type="button"
            onClick={() => onSelect("all")}
            className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
          >
            Show All
          </button>
        )}
      </div>

      <div className="grid grid-cols-5">
        {platforms.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? "all" : p.id)}
              className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl px-1 py-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isSelected
                  ? p.selectedStyle
                  : `text-slate-500 ${p.hoverStyle}`
              }`}
            >
              <span
                className={`grid size-8 place-items-center ${
                  isSelected ? p.color : ""
                }`}
              >
                {p.icon}
              </span>
              <span className="text-[11px] font-medium sm:text-xs">
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
