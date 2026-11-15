"use client";

import Link from "next/link";
import { Bell, Coins, Send } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/[0.06] bg-[#0b0f14]/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        {/* Left spacing for mobile menu */}
        <div className="w-9 lg:hidden" />
      </div>

      <div className="flex items-center gap-3">
        {/* Telegram quick action */}
        <a
          href="https://t.me"
          target="_blank"
          rel="noopener noreferrer"
          title="Join Telegram Channel"
          className="grid size-9 place-items-center rounded-full bg-[#2AABEE] text-white shadow-sm shadow-[#2AABEE]/30 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]"
        >
          <Send size={15} className="-ml-0.5 -mt-0.5 rotate-45" />
        </a>

        {/* Notifications */}
        <Link
          href="/notifications"
          title="Notifications"
          className="relative grid size-9 place-items-center rounded-full border border-slate-700/70 bg-slate-800/60 text-slate-300 transition hover:border-amber-400/60 hover:text-white focus:outline-none"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-400" />
        </Link>

        {/* Balance Badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-sm shadow-amber-950/20">
          <Coins size={14} className="text-amber-400" />
          <span>0 ETB</span>
        </div>
      </div>
    </header>
  );
}
