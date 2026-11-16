"use client";

import Link from "next/link";
import { Bell, Coins, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import PwaInstallButton from "../pwa/PwaInstallButton";

export default function Header() {
  const { signedIn, user, mounted } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/[0.06] bg-[#0b0f14]/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        {/* Left spacing for mobile menu */}
        <div className="w-9 lg:hidden" />
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* PWA Install Button (colored, visible until installed) */}
        <PwaInstallButton variant="header" />

        {/* Telegram quick action - always visible */}
        <a
          href="https://t.me"
          target="_blank"
          rel="noopener noreferrer"
          title="Join Telegram Channel"
          className="grid size-9 place-items-center rounded-full bg-[#2AABEE] text-white shadow-sm shadow-[#2AABEE]/30 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]"
        >
          <Send size={15} className="-ml-0.5 -mt-0.5 rotate-45" />
        </a>

        {/* Notifications and Balance only shown when signed in */}
        {mounted && signedIn && (
          <>
            <Link
              href="/notifications"
              title="Notifications"
              className="relative grid size-9 place-items-center rounded-full border border-slate-700/70 bg-slate-800/60 text-slate-300 transition hover:border-amber-400/60 hover:text-white focus:outline-none"
            >
              <Bell size={16} />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-400" />
            </Link>

            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-sm shadow-amber-950/20">
              <Coins size={14} className="text-amber-400" />
              <span>{user?.balance ?? 0} ETB</span>
            </div>

            {user?.role === "admin" && (
              <Link
                href="/admin"
                title="Admin Control Center"
                className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/25 transition shadow-sm"
              >
                <ShieldCheck size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            <Link
              href="/profile"
              title="View Profile"
              className="grid size-9 place-items-center rounded-full overflow-hidden border border-amber-400/60 p-0.5 hover:ring-2 hover:ring-amber-400/50 transition"
            >
              <img src="/logo.png" alt="Profile" className="w-full h-full object-cover rounded-full" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
