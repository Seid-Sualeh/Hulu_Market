"use client";

import { Download, Sparkles } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";

interface PwaInstallButtonProps {
  variant?: "header" | "sidebar" | "banner" | "auth";
  className?: string;
  compactOnSmallScreens?: boolean;
}

export default function PwaInstallButton({
  variant = "header",
  className = "",
  compactOnSmallScreens = false,
}: PwaInstallButtonProps) {
  const { isInstalled, installApp } = usePwaInstall();

  if (isInstalled) {
    return null;
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={installApp}
        title="Install Hulu Market App on your device"
        className={`group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 p-[1.5px] shadow-lg shadow-teal-500/20 transition-all hover:scale-105 active:scale-95 ${className}`}
      >
        <span className="flex items-center gap-2 rounded-full bg-[#0d131d] px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors group-hover:bg-opacity-80">
          <Download size={14} className="text-teal-400 group-hover:animate-bounce" />
          <span className="hidden sm:inline bg-gradient-to-r from-amber-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent font-extrabold tracking-wide">
            Install App
          </span>
          <span className={`sm:hidden font-extrabold text-amber-300 ${compactOnSmallScreens ? "max-[380px]:hidden" : ""}`}>Install</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </span>
      </button>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={`p-3 pt-2 ${className}`}>
        <button
          type="button"
          onClick={installApp}
          className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-teal-500/15 to-emerald-500/15 p-3.5 text-left shadow-lg shadow-teal-950/40 transition-all hover:border-amber-400 hover:shadow-teal-500/20 active:scale-[0.98]"
        >
          {/* Background subtle glow */}
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/10 blur-xl group-hover:bg-teal-500/20" />

          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-amber-400 to-teal-400 text-slate-950 shadow-md">
              <Download size={18} strokeWidth={2.4} />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                <span>Install App</span>
                <Sparkles size={12} className="text-amber-400" />
              </p>
              <p className="text-[10px] text-slate-400">Mobile, Tablet & Desktop</p>
            </div>
          </div>

          <span className="rounded-lg bg-teal-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 shadow-sm transition-transform group-hover:scale-105">
            GET
          </span>
        </button>
      </div>
    );
  }

  if (variant === "auth") {
    return (
      <button
        type="button"
        onClick={installApp}
        className={`flex w-full items-center justify-center gap-2.5 rounded-xl border border-teal-500/40 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 py-3 text-xs font-bold text-teal-300 shadow-md transition-all hover:border-teal-400 hover:bg-teal-500/30 hover:text-white active:scale-[0.99] ${className}`}
      >
        <Download size={15} className="text-teal-400" />
        <span>Install App on your device</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={installApp}
      className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-teal-500/30 transition-all hover:opacity-95 active:scale-95 ${className}`}
    >
      <Download size={15} />
      <span>Install App</span>
    </button>
  );
}
