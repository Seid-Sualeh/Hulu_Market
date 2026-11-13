"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  brandIcon as BrandIcon,
  logoutNavigationItem,
  navigationSections,
  type NavigationEntry,
  type NavigationLink,
} from "./navigation";

function isCurrentPath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function containsCurrentPath(
  item: NavigationEntry,
  pathname: string,
): boolean {
  if (item.type === "link") {
    return isCurrentPath(pathname, item.href);
  }

  return item.items.some((child) => containsCurrentPath(child, pathname));
}

function getControlId(parentId: string, label: string) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${parentId}-${slug}`;
}

function NavigationLinkItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationLink;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isCurrentPath(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors duration-150 ${
        active
          ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/15"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
      }`}
    >
      <Icon
        aria-hidden="true"
        size={17}
        strokeWidth={active ? 2.2 : 1.8}
        className={
          active
            ? "shrink-0 text-cyan-300"
            : "shrink-0 text-slate-500 transition-colors group-hover:text-slate-300"
        }
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {active && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300"
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
}: {
  item: NavigationEntry;
  pathname: string;
  onNavigate?: () => void;
  controlId: string;
}) {
  const [expansion, setExpansion] = useState<{
    pathname: string;
    expanded: boolean;
  } | null>(null);

  if (item.type === "link") {
    return (
      <NavigationLinkItem
        item={item}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    );
  }

  const Icon = item.icon;
  const active = containsCurrentPath(item, pathname);
  const expanded =
    expansion?.pathname === pathname ? expansion.expanded : active;
  const nestedControlId = getControlId(controlId, item.label);

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={nestedControlId}
        onClick={() => setExpansion({ pathname, expanded: !expanded })}
        className={`group flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-colors duration-150 ${
          active
            ? "bg-cyan-400/10 text-cyan-300"
            : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
        }`}
      >
        <Icon
          aria-hidden="true"
          size={17}
          strokeWidth={active ? 2.2 : 1.8}
          className="shrink-0 text-slate-500 transition-colors group-hover:text-slate-300"
        />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronDown
          aria-hidden="true"
          size={15}
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div
          id={nestedControlId}
          className="ml-5 mt-1 space-y-1 border-l border-white/[0.08] pl-3"
        >
          {item.items.map((child) => (
            <NavigationEntryItem
              key={child.label}
              item={child}
              pathname={pathname}
              onNavigate={onNavigate}
              controlId={nestedControlId}
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
      className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-950/30">
        <BrandIcon aria-hidden="true" size={20} strokeWidth={2.2} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-white">
          Hulu <span className="text-cyan-300">Market</span>
        </span>
        <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
          Discover more
        </span>
      </span>
    </Link>
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

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]"
      >
        {navigationSections.map((section) => (
          <section key={section.label} aria-label={section.label}>
            <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-600">
              {section.label}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavigationEntryItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  controlId={getControlId(idPrefix, item.label)}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>
      <div className="border-t border-white/[0.07] p-3">
        <NavigationLinkItem
          item={logoutNavigationItem}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[17rem] shrink-0 flex-col border-r border-white/[0.07] bg-[#10151d] lg:flex">
      <div className="px-5 pb-5 pt-6">
        <SidebarBrand />
      </div>
      <div className="mx-5 border-t border-white/[0.07]" />
      <SidebarNavigation idPrefix="desktop" />
    </aside>
  );
}
