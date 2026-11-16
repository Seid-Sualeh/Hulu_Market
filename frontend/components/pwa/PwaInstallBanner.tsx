"use client";

import { useState } from "react";
import { Download, Share, PlusSquare, X, Smartphone, Monitor } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";

export default function PwaInstallBanner() {
  const {
    isInstalled,
    installApp,
    showIosGuide,
    setShowIosGuide,
    showDesktopGuide,
    setShowDesktopGuide,
  } = usePwaInstall();

  const [dismissed, setDismissed] = useState<boolean>(false);

  // If already installed, don't show anything
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Banner across pages until installed */}
      {!dismissed && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-[#0d1420]/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md">
            {/* Ambient colorful top edge highlight */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-400" />

            <div className="flex items-center justify-between gap-3">
              {/* App icon & texts */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative size-11 sm:size-12 shrink-0 overflow-hidden rounded-xl border border-amber-400/50 bg-slate-900 shadow-md">
                  <img
                    src="/logo.png"
                    alt="Hulu Market"
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                    <span>Hulu Market App</span>
                    <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">
                      PWA
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    Everything You Need. One Marketplace.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={installApp}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-400 px-3.5 sm:px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-teal-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  <Download size={14} className="stroke-[2.5]" />
                  <span>Install</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  title="Dismiss for now"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Step-by-Step Installation Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111722] p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-amber-400 to-teal-400 p-0.5 shadow-lg">
              <div className="grid size-full place-items-center rounded-2xl bg-[#0c1017]">
                <Smartphone size={26} className="text-teal-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-white">
                Install on iPhone or iPad
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Follow these two simple steps in Safari to add Hulu Market to your home screen:
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 text-left text-xs">
              <div className="flex items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-teal-500/20 text-teal-400">
                  <Share size={16} />
                </div>
                <p className="text-slate-300">
                  1. Tap the <strong className="text-white">Share</strong> icon in Safari&apos;s bottom bar.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
                  <PlusSquare size={16} />
                </div>
                <p className="text-slate-300">
                  2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-teal-400 py-3 text-xs font-bold text-slate-950 shadow-md transition hover:opacity-95"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Other Browser Guide Modal */}
      {showDesktopGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111722] p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-amber-400 to-teal-400 p-0.5 shadow-lg">
              <div className="grid size-full place-items-center rounded-2xl bg-[#0c1017]">
                <Monitor size={26} className="text-amber-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-white">
                Install on your Device
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Look for the <strong className="text-amber-300">Install icon (⬇)</strong> in your browser address bar (top right) or browser menu (⋮) and select <strong className="text-white">&quot;Install Hulu Market&quot;</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDesktopGuide(false)}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-teal-400 py-3 text-xs font-bold text-slate-950 shadow-md transition hover:opacity-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
