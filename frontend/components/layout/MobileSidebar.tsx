"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarBrand, SidebarNavigation } from "./Sidebar";

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  function trapFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    const first = focusableElements.item(0);
    const last = focusableElements.item(focusableElements.length - 1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-xl border border-white/10 bg-[#151c26] text-slate-200 shadow-lg shadow-black/20 transition hover:border-cyan-400/30 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:hidden"
      >
        <Menu aria-hidden="true" size={20} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/65 backdrop-blur-[2px] lg:hidden"
          />
          <aside
            ref={dialogRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            onKeyDown={trapFocus}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col border-r border-white/[0.08] bg-[#10151d] shadow-2xl shadow-black/50 lg:hidden"
          >
            <div className="flex items-center justify-between px-5 pb-5 pt-6">
              <SidebarBrand />
              <button
                ref={closeRef}
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>
            <div className="mx-5 border-t border-white/[0.07]" />
            <SidebarNavigation
              idPrefix="mobile"
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  );
}
