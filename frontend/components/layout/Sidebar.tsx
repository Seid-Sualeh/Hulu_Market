"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Coins,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import {
  brandIcon as BrandIcon,
  navigationSections,
  type NavigationEntry,
  type NavigationLink,
} from "./navigation";
import { useAuth } from "@/lib/auth";
import { fetchBackend } from "@/lib/api";
import PwaInstallButton from "../pwa/PwaInstallButton";

function isCurrentPath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinkItem({
  item,
  pathname,
  onNavigate,
  isChild = false,
  signedIn = false,
  badgeCount,
}: {
  item: NavigationLink;
  pathname: string;
  onNavigate?: () => void;
  isChild?: boolean;
  signedIn?: boolean;
  badgeCount?: number;
}) {
  const Icon = item.icon;
  const isDashboard = item.label === "Dashboard" || item.href === "/dashboard";
  
  // If guest clicks dashboard, redirect to auth page
  const targetHref = !signedIn && isDashboard ? "/auth?redirect=/dashboard" : item.href;
  const active = isCurrentPath(pathname, item.href);

  return (
    <Link
      href={targetHref}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-150 ${
        isChild ? "py-1.5" : "py-2"
      } ${
        active
          ? "bg-teal-500/15 text-teal-300 ring-1 ring-inset ring-teal-500/30 font-semibold shadow-sm shadow-teal-950/40"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
      }`}
    >
      <Icon
        aria-hidden="true"
        size={isChild ? 15 : 18}
        strokeWidth={active ? 2.2 : 1.8}
        className={
          active
            ? "shrink-0 text-teal-400"
            : "shrink-0 text-slate-500 transition-colors group-hover:text-slate-300"
        }
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-slate-950 shadow-sm shadow-amber-500/30">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
      {active && (!badgeCount || badgeCount === 0) && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"
        />
      )}
    </Link>
  );
}

function NavigationEntryItem({
  item,
  pathname,
  onNavigate,
  signedIn = false,
  badgeCount,
}: {
  item: NavigationEntry;
  pathname: string;
  onNavigate?: () => void;
  signedIn?: boolean;
  badgeCount?: number;
}) {
  return (
    <NavigationLinkItem
      item={item}
      pathname={pathname}
      onNavigate={onNavigate}
      signedIn={signedIn}
      badgeCount={badgeCount}
    />
  );
}

export function SidebarBrand() {
  const { user, signedIn, mounted } = useAuth();
  const brandHref = mounted && signedIn && user?.role === "admin" ? "/admin" : "/marketplace";

  return (
    <Link
      href={brandHref}
      aria-label="Hulu Market home"
      className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-300 group"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl overflow-hidden bg-slate-900 border border-amber-500/40 shadow-md shadow-amber-950/40 p-0.5">
        <img src="/logo.png" alt="Hulu Market Logo" className="w-full h-full object-cover rounded-lg" />
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-[17px] font-semibold tracking-wide text-amber-200 group-hover:text-amber-100 transition-colors">
          Hulu <span className="text-amber-400">Market</span>
        </span>
        <span className="block text-[9px] text-slate-400 font-sans tracking-tight">
          Everything You Need. One Marketplace.
        </span>
      </span>
    </Link>
  );
}

export function UserProfileFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split("@")[0] || "My Account";
  const displayBalance = user?.balance ?? 0;

  return (
    <div className="border-t border-white/[0.08] p-3 pt-4 space-y-3">
      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-amber-500/30 transition-all block"
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-full overflow-hidden bg-slate-800 border border-amber-500/40 p-0.5">
          <img src="/logo.png" alt="Profile" className="w-full h-full object-cover rounded-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{displayName}</p>
          <p className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <Coins size={12} className="text-amber-400" />
            {displayBalance} ETB
          </p>
        </div>
      </Link>
      <Link
        href="/logout"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
      >
        <LogOut size={16} />
        <span>Logout</span>
      </Link>
    </div>
  );
}

// Guest Sign In pill button matching reference design image
export function GuestSignInFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t border-white/[0.08] p-3 pt-4">
      <Link
        href="/auth"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-amber-500/30 bg-[#161d2b]/80 hover:bg-amber-500/10 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
      >
        <LogIn size={16} className="text-amber-400" />
        <span>Sign in</span>
      </Link>
    </div>
  );
}

export function SidebarNavigation({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const { user, signedIn, mounted } = useAuth();
  const isAdmin = Boolean(mounted && signedIn && user?.role === "admin");

  // Task 2: Live badge counts for Inbox and Notifications
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    if (!mounted || !signedIn || !user?.id) {
      setInboxCount(0);
      setUnreadNotifications(0);
      return;
    }

    const fetchBadgeCounts = async () => {
      try {
        // 1. Fetch inbox message / active escrow trades count
        const inboxRes = await fetchBackend("escrow/unread-count");
        if (inboxRes.ok) {
          const data = await inboxRes.json();
          if (data.success && typeof data.count === "number") {
            setInboxCount(data.count);
          }
        }

        // 2. Fetch unread notifications count
        const notifRes = await fetchBackend("user/notifications/unread-count");
        if (notifRes.ok) {
          const data = await notifRes.json();
          if (data.success && typeof data.count === "number") {
            setUnreadNotifications(data.count);
          }
        }
      } catch {}
    };

    fetchBadgeCounts();
    const timer = setInterval(fetchBadgeCounts, 15000);
    return () => clearInterval(timer);
  }, [mounted, signedIn, user?.id]);

  const getBadgeCount = (item: NavigationEntry): number | undefined => {
    if (item.label === "Inbox" || (item.type === "link" && item.href === "/inbox")) {
      return inboxCount;
    }
    if (item.label === "Notifications" || (item.type === "link" && item.href === "/notifications")) {
      return unreadNotifications;
    }
    return undefined;
  };

  // RBAC: In guest mode, only show Main section.
  // For Admin: remove the user Dashboard link because the dashboard for admin is Admin Control (/admin).
  // For Regular Users / Guests: hide Admin Control.
  const visibleSections = navigationSections
    .filter((section) => {
      if (!mounted || !signedIn) {
        return section.label === "Main";
      }
      return true;
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // If user is admin: remove user Dashboard link
        if (isAdmin && (item.label === "Dashboard" || (item.type === "link" && item.href === "/dashboard"))) {
          return false;
        }
        // If user is not admin: hide Admin Control link
        if (item.label === "Admin Control" || (item.type === "link" && item.href === "/admin")) {
          return isAdmin;
        }
        return true;
      }),
    }));

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]"
      >
        {visibleSections.map((section) => (
          <section key={section.label} aria-label={section.label}>
            {section.label && (
              <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {section.label}
              </h2>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavigationEntryItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  signedIn={mounted ? signedIn : false}
                  badgeCount={getBadgeCount(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>

      {/* PWA Install Action Card in Sidebar */}
      <PwaInstallButton variant="sidebar" />

      {/* Conditionally render Guest Sign In button or User Profile Footer */}
      {mounted && signedIn ? (
        <UserProfileFooter onNavigate={onNavigate} />
      ) : (
        <GuestSignInFooter onNavigate={onNavigate} />
      )}
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[17.5rem] shrink-0 flex-col border-r border-white/[0.08] bg-[#0e131b] lg:flex">
      <div className="px-5 pb-4 pt-6">
        <SidebarBrand />
      </div>
      <div className="mx-5 border-t border-white/[0.06]" />
      <SidebarNavigation />
    </aside>
  );
}
