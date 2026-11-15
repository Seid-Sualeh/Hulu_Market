"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Eye, EyeOff, Lock, Mail, ShoppingBag } from "lucide-react";
import { signInUser } from "@/lib/auth";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/social-media";

  const [email, setEmail] = useState("sualehseid@gmail.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      signInUser(email, "Seid Sualih");
      setLoading(false);
      router.push(redirect);
    }, 400);
  };

  const handleGuest = () => {
    router.push(redirect);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col items-center justify-center p-4 relative select-none">
      <div className="max-w-md w-full flex flex-col items-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Gold Shopping Bag Rounded Badge matching signin-page.png */}
        <div className="w-12 h-12 rounded-xl border border-[#d4af37]/60 bg-[#141b27]/90 flex items-center justify-center text-[#d4af37] shadow-lg shadow-amber-500/10 mb-1">
          <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wider">
            SIGN IN
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Welcome back to Hulu Market
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          {/* Email input with blue @ badge */}
          <div className="bg-[#131a26]/90 border border-slate-700/80 focus-within:border-teal-400 rounded-xl px-4 py-3 flex items-center transition-all shadow-sm">
            <div className="w-5 h-5 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold mr-3 shrink-0">
              @
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sualehseid@gmail.com"
              required
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 font-medium"
            />
          </div>

          {/* Password input with gold lock & eye toggle */}
          <div className="bg-[#131a26]/90 border border-slate-700/80 focus-within:border-teal-400 rounded-xl px-4 py-3 flex items-center justify-between transition-all shadow-sm">
            <div className="flex items-center flex-1 mr-2">
              <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center mr-3 shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Forgot Password link */}
          <div className="flex justify-end pt-0.5">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Password reset instructions sent to your email.");
              }}
              className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {/* SIGN IN Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold uppercase tracking-wider text-xs md:text-sm transition-all shadow-lg shadow-amber-500/15"
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>

          {/* Divider */}
          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-800" />
            <span className="px-3 text-xs text-slate-500">Or</span>
            <div className="flex-1 border-t border-slate-800" />
          </div>

          {/* Continue as Guest Button */}
          <button
            type="button"
            onClick={handleGuest}
            className="w-full py-3 rounded-xl border border-slate-800 bg-[#111722]/80 hover:bg-[#161d2b] text-slate-200 text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-teal-400" />
            <span>Continue as Guest</span>
          </button>
        </form>

        {/* Bottom Signup Link */}
        <p className="text-xs text-slate-400 pt-2">
          Don&apos;t have an account?{" "}
          <Link
            href={`/signup?redirect=${encodeURIComponent(redirect)}`}
            className="text-teal-400 hover:text-teal-300 font-semibold transition-colors ml-1"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f17]" />}>
      <SignInContent />
    </Suspense>
  );
}
