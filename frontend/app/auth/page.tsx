"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Suspense } from "react";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";

function AuthLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  
  // Safe redirect for login (never loop back to /auth or /dashboard for guests)
  const signInRedirect = redirectParam && redirectParam !== "/" && redirectParam !== "/dashboard"
    ? redirectParam
    : "/social-media";

  const handleGuestClick = () => {
    router.push("/social-media");
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Logo badge */}
        <div className="w-24 h-24 rounded-full border-2 border-[#d4af37]/80 bg-[#141b27]/90 flex items-center justify-center p-1 shadow-2xl shadow-amber-500/20 mb-1 overflow-hidden">
          <img src="/logo.png" alt="Hulu Market Logo" className="w-full h-full object-cover rounded-full" />
        </div>

        {/* Brand Name & Slogan */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#d4af37] tracking-wide">
            Hulu Market
          </h1>
          <p className="text-sm md:text-base font-medium text-amber-200/90 max-w-xs mx-auto leading-relaxed">
            Everything You Need. One Marketplace.
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 pt-3">
          {/* SIGN IN Button */}
          <Link
            href={`/signin?redirect=${encodeURIComponent(signInRedirect)}`}
            className="block w-full py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold uppercase tracking-wider text-xs md:text-sm transition-all shadow-lg shadow-amber-500/15"
          >
            SIGN IN
          </Link>

          {/* Create Account Button */}
          <Link
            href={`/signup?redirect=${encodeURIComponent(signInRedirect)}`}
            className="block w-full py-3.5 rounded-xl border border-[#d4af37]/60 bg-[#111722]/80 hover:bg-[#161d2b] text-[#d4af37] font-semibold text-xs md:text-sm transition-all"
          >
            Create Account
          </Link>

          {/* Colored PWA Install Button */}
          <PwaInstallButton variant="auth" />
        </div>

        {/* Continue as Guest Link - Guaranteed direct navigation to Marketplace */}
        <div className="pt-2">
          <Link
            href="/social-media"
            className="text-xs md:text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors inline-block py-1"
          >
            Continue as Guest
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f17]" />}>
      <AuthLanding />
    </Suspense>
  );
}
