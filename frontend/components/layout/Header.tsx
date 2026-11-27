"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Coins, PhoneCall, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchBackend } from "@/lib/api";
import PwaInstallButton from "../pwa/PwaInstallButton";

export default function Header() {
  const { signedIn, user, mounted } = useAuth();

  // Task 3: Alternating Contact Us toggle (5s Telegram / 5s Phone Call +251929075365)
  const [contactMode, setContactMode] = useState<"telegram" | "phone">("telegram");

  useEffect(() => {
    const timer = setInterval(() => {
      setContactMode((prev) => (prev === "telegram" ? "phone" : "telegram"));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Task 1: Fetch and display unread notification count on bell icon
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!mounted || !signedIn || !user?.id) {
      setUnreadCount(0);
      return;
    }

    const fetchNotificationsCount = async () => {
      try {
        const res = await fetchBackend("user/notifications/unread-count");
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.count === "number") {
            setUnreadCount(data.count);
            return;
          }
        }
        // Fallback
        const fallbackRes = await fetchBackend("user/notifications");
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (data.success && Array.isArray(data.notifications)) {
            const unread = data.notifications.filter((n: any) => !n.is_read).length;
            setUnreadCount(unread);
          }
        }
      } catch {}
    };

    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 15000);
    return () => clearInterval(interval);
  }, [mounted, signedIn, user?.id]);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/[0.06] bg-[#0b0f14]/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        {/* Left spacing for mobile menu */}
        <div className="w-9 lg:hidden" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Online</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* PWA Install Button (colored, visible until installed) */}
        <PwaInstallButton variant="header" />

        {/* Task 3: Contact Us alternating every 5 seconds between Telegram and Phone Call */}
        <div className="flex items-center transition-all duration-300">
          {contactMode === "telegram" ? (
            <a
              href="https://t.me/seid6363"
              target="_blank"
              rel="noopener noreferrer"
              title="Contact us on Telegram: @seid6363"
              className="flex items-center gap-2 group transition-all duration-300"
            >
              <span className="hidden text-xs font-semibold text-[#2AABEE] group-hover:text-sky-300 sm:inline transition-colors">
                Telegram
              </span>
              <div className="grid size-9 place-items-center rounded-full bg-[#2AABEE] text-white shadow-sm shadow-[#2AABEE]/30 transition group-hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]">
                <Send size={15} className="-ml-0.5 -mt-0.5 rotate-45" />
              </div>
            </a>
          ) : (
            <a
              href="tel:+251929075365"
              title="Call us: +251929075365"
              className="flex items-center gap-2 group transition-all duration-300"
            >
              <span className="hidden text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 sm:inline transition-colors">
                +251929075365
              </span>
              <div className="grid size-9 place-items-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 transition group-hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <PhoneCall size={15} />
              </div>
            </a>
          )}
        </div>

        {/* Notifications and Balance only shown when signed in */}
        {mounted && signedIn && (
          <>
            {/* Task 1: Notification Bell with number badge */}
            <Link
              href="/notifications"
              title={unreadCount > 0 ? `${unreadCount} Unread Notifications` : "Notifications"}
              className="relative grid size-9 place-items-center rounded-full border border-slate-700/70 bg-slate-800/60 text-slate-300 transition hover:border-amber-400/60 hover:text-white focus:outline-none"
            >
              <Bell size={16} />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm shadow-rose-950/40">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-400" />
              )}
            </Link>

            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-sm shadow-amber-950/20">
              <Coins size={14} className="text-amber-400" />
              <span>{user?.balance ?? 0} ETB</span>
            </div>

            {user?.role === "admin" ? (
              <Link
                href="/admin"
                title="Admin Control Center"
                className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#121824] px-3 py-1 text-xs font-semibold text-slate-200 hover:border-amber-400/60 hover:text-white transition shadow-sm"
              >
                <div className="grid size-6 place-items-center rounded-full overflow-hidden border border-amber-400/50 p-0.5">
                  <img src="/logo.png" alt="Admin" className="w-full h-full object-cover rounded-full" />
                </div>
                <span>Admin</span>
                <ChevronDown size={14} className="text-slate-400" />
              </Link>
            ) : (
              <Link
                href="/profile"
                title="View Profile"
                className="grid size-9 place-items-center rounded-full overflow-hidden border border-amber-400/60 p-0.5 hover:ring-2 hover:ring-amber-400/50 transition"
              >
                <img
                  src="/logo.png"
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
