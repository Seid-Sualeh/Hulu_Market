"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
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
}: {
  item: NavigationLink;
  pathname: string;
  onNavigate?: () => void;
  isChild?: boolean;
  signedIn?: boolean;
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
      {active && (
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
  controlId,
  signedIn = false,
}: {
  item: NavigationEntry;
  pathname: string;
  onNavigate?: () => void;
  controlId: string;
  signedIn?: boolean;
}) {
  const isAnyChildActive =
    item.type === "group" &&
    (item.items.some((child) => isCurrentPath(pathname, child.href)) ||
      pathname === "/social-media" ||
      pathname.startsWith("/social-media/") ||
      pathname.startsWith("/marketplace"));

  const [expanded, setExpanded] = useState<boolean>(false);

  if (item.type === "link") {
    return (
      <NavigationLinkItem
        item={item}
        pathname={pathname}
        onNavigate={onNavigate}
        signedIn={signedIn}
      />
    );
  }

  const Icon = item.icon;

  return (
    <div>
      <div
        className={`group flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
          isAnyChildActive
            ? "bg-teal-500/15 text-teal-300 ring-1 ring-inset ring-teal-500/30 font-semibold shadow-sm shadow-teal-950/40"
            : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
        }`}
      >
        <Link
          href="/social-media"
          onClick={onNavigate}
          className="flex flex-1 items-center gap-3 min-w-0"
        >
          <Icon
            aria-hidden="true"
            size={18}
            strokeWidth={isAnyChildActive ? 2.2 : 1.8}
            className={
              isAnyChildActive
                ? "shrink-0 text-teal-400"
                : "shrink-0 text-slate-500 transition-colors group-hover:text-slate-300"
            }
          />
          <span className="min-w-0 flex-1 truncate font-semibold">
            {item.label}
          </span>
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={controlId}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-1 text-slate-500 hover:text-teal-300 transition"
        >
          <ChevronDown
            aria-hidden="true"
            size={15}
            className={`shrink-0 transition-transform duration-200 ${
              expanded ? "rotate-180 text-teal-400" : ""
            }`}
          />
        </button>
      </div>
      {expanded && (
        <div
          id={controlId}
          className="ml-4 mt-1.5 space-y-0.5 border-l border-teal-500/20 pl-2.5"
        >
          {item.items.map((child) => (
            <NavigationLinkItem
              key={child.href}
              item={child}
              pathname={pathname}
              onNavigate={onNavigate}
              signedIn={signedIn}
              isChild
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarBrand() {
  return (
    <Link
      href="/"
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
          <p className="text-xs font-semibold text-white truncate">Seid Sualih</p>
          <p className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <Coins size={12} className="text-amber-400" />
            0 ETB
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
  idPrefix = "sidebar",
}: {
  onNavigate?: () => void;
  idPrefix?: string;
}) {
  const pathname = usePathname() ?? "/";
  const { signedIn, mounted } = useAuth();

  // In guest mode (without sign-in), only show Main section (Dashboard, Marketplace, Sell, Inbox)
  const visibleSections = mounted && signedIn
    ? navigationSections
    : navigationSections.filter((section) => section.label === "Main");

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
              {section.items.map((item, index) => (
                <NavigationEntryItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  signedIn={mounted ? signedIn : false}
                  controlId={`${idPrefix}-nav-${index}`}
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
      <SidebarNavigation idPrefix="desktop" />
    </aside>
  );
}
