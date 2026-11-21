"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, ShoppingBag, Sparkles } from "lucide-react";
import { Suspense } from "react";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";
import AuthBackground from "@/components/auth/AuthBackground";

function AuthLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  
  // Safe redirect for login (never loop back to /auth or /dashboard for guests)
  const signInRedirect = redirectParam && redirectParam !== "/" && redirectParam !== "/dashboard"
    ? redirectParam
    : "/social-media";

  return (
    <AuthBackground>
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#0d131f]/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-black/90 flex flex-col items-center text-center space-y-6 relative z-10 transition-all hover:border-amber-400/30 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Logo badge with pulsing ambient ring */}
        <div className="relative group">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 opacity-70 blur-lg group-hover:opacity-100 transition duration-300 animate-pulse" />
          <div className="relative size-24 rounded-full border-2 border-[#d4af37] bg-[#141b27] flex items-center justify-center p-1 shadow-2xl overflow-hidden">
            <img src="/logo.png" alt="Hulu Market Logo" className="size-full object-cover rounded-full" />
          </div>
        </div>

        {/* Brand Name & Slogan */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-[#d4af37] tracking-wide">
            Hulu Market
          </h1>
          <p className="text-sm sm:text-base font-medium text-amber-200/90 max-w-xs mx-auto leading-relaxed">
            Everything You Need. One Marketplace.
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 pt-2">
          {/* SIGN IN Button */}
          <Link
            href={`/signin?redirect=${encodeURIComponent(signInRedirect)}`}
            className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-[0.99] text-slate-950 font-extrabold uppercase tracking-wider text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            SIGN IN
          </Link>

          {/* Create Account Button */}
          <Link
            href={`/signup?redirect=${encodeURIComponent(signInRedirect)}`}
            className="block w-full py-3.5 rounded-xl border border-amber-400/40 bg-white/[0.04] hover:bg-white/[0.08] hover:border-amber-400 text-amber-300 font-bold text-xs sm:text-sm transition-all shadow-sm"
          >
            Create Account
          </Link>

          {/* Colored PWA Install Button */}
          <PwaInstallButton variant="auth" />
        </div>

        {/* Continue as Guest Link */}
        <div className="pt-1">
          <Link
            href="/social-media"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors py-1 hover:underline"
          >
            <Compass size={15} />
            <span>Continue as Guest</span>
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070a10]" />}>
      <AuthLanding />
    </Suspense>
  );
}
