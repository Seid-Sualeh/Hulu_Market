"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Suspense } from "react";

function AuthLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/social-media";

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Gold circular icon badge matching auth-page.png */}
        <div className="w-20 h-20 rounded-full border border-[#d4af37]/60 bg-[#141b27]/90 flex items-center justify-center text-[#d4af37] shadow-xl shadow-amber-500/10 mb-1">
          <ShoppingBag className="w-9 h-9 stroke-[1.8]" />
        </div>

        {/* Brand Name */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#d4af37] tracking-wide">
            Hulu Market
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Your marketplace for listings, wallet, and secure trades.
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 pt-3">
          {/* SIGN IN Button */}
          <Link
            href={`/signin?redirect=${encodeURIComponent(redirect)}`}
            className="block w-full py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold uppercase tracking-wider text-xs md:text-sm transition-all shadow-lg shadow-amber-500/15"
          >
            SIGN IN
          </Link>

          {/* Create Account Button */}
          <Link
            href={`/signup?redirect=${encodeURIComponent(redirect)}`}
            className="block w-full py-3.5 rounded-xl border border-[#d4af37]/60 bg-[#111722]/80 hover:bg-[#161d2b] text-[#d4af37] font-semibold text-xs md:text-sm transition-all"
          >
            Create Account
          </Link>
        </div>

        {/* Continue as Guest Link */}
        <div className="pt-2">
          <Link
            href={redirect}
            className="text-xs md:text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors"
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
