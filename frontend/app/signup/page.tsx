"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { signInUser } from "@/lib/auth";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/social-media";

  const [firstName, setFirstName] = useState("Seid");
  const [lastName, setLastName] = useState("Sualih");
  const [email, setEmail] = useState("sualehseid@gmail.com");
  const [phone, setPhone] = useState("+251929075365");
  const [password, setPassword] = useState("password123");
  const [confirmPassword, setConfirmPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      signInUser(email, `${firstName} ${lastName}`.trim(), phone);
      setLoading(false);
      router.push(redirect);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col items-center justify-center p-4 relative select-none">
      <div className="max-w-md w-full flex flex-col items-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Heading matching signup-page.png */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wider">
            REGISTER
          </h1>
          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            SELECT A LOG-IN OPTION BELOW OR CREATE A SECURE ACCOUNT.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          {/* Row 1: First Name & Last Name side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#131a26]/90 border border-slate-700/80 focus-within:border-teal-400 rounded-xl px-3.5 py-3 flex items-center transition-all shadow-sm">
              <User className="w-4 h-4 text-purple-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 font-medium"
              />
            </div>

            <div className="bg-[#131a26]/90 border border-slate-700/80 focus-within:border-teal-400 rounded-xl px-3.5 py-3 flex items-center transition-all shadow-sm">
              <User className="w-4 h-4 text-purple-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 font-medium"
              />
            </div>
          </div>

          {/* Row 2: Email input with @ badge */}
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

          {/* Row 3: Phone input with red phone icon */}
          <div className="bg-[#131a26]/90 border border-slate-700/80 focus-within:border-teal-400 rounded-xl px-4 py-3 flex items-center transition-all shadow-sm">
            <Phone className="w-4 h-4 text-rose-400 mr-3 shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone: +251*********"
              required
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 font-medium font-mono"
            />
          </div>

          {/* Row 4: Password with yellow lock & eye toggle */}
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

          {/* Row 5: Confirm Password with yellow lock & eye toggle */}
          <div className="bg-[#131a26]/90 border border-slate-700/80 focus-within:border-teal-400 rounded-xl px-4 py-3 flex items-center justify-between transition-all shadow-sm">
            <div className="flex items-center flex-1 mr-2">
              <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center mr-3 shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* CREATE ACCOUNT Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] active:scale-[0.99] text-slate-950 font-bold uppercase tracking-wider text-xs md:text-sm transition-all shadow-lg shadow-amber-500/15"
            >
              {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </div>
        </form>

        {/* Bottom Login Link */}
        <p className="text-xs text-slate-400 pt-1">
          Already have an account?{" "}
          <Link
            href={`/signin?redirect=${encodeURIComponent(redirect)}`}
            className="text-[#d4af37] hover:text-amber-300 font-bold transition-colors ml-1 uppercase"
          >
            LOG IN
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f17]" />}>
      <SignUpContent />
    </Suspense>
  );
}
