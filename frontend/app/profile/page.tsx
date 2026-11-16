"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Bell,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Globe,
  Headphones,
  Heart,
  Info,
  LayoutDashboard,
  ListOrdered,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Shield,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";

export default function ProfilePage() {
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // User info state
  const [name, setName] = useState("Seid Sualih");
  const [email, setEmail] = useState("sualehseid@gmail.com");
  const [phone, setPhone] = useState("+251 91 234 5678");

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      {/* 1. TOP HERO PROFILE CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111722] p-6 shadow-xl">
        {/* Subtle decorative top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/40 via-teal-400/60 to-cyan-500/40" />

        <div className="flex flex-col items-center text-center">
          {/* Avatar with Hulu Market logo & ambient glow */}
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-teal-400/20 blur-xl" />
            <div className="relative grid size-24 place-items-center rounded-full overflow-hidden bg-slate-900 shadow-xl shadow-teal-950/50 ring-4 ring-amber-400/50">
              <img src="/logo.png" alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Name & Email */}
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
            {name}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">{email}</p>
          <p className="mt-1 text-xs text-amber-300/90 font-medium tracking-wide">
            Everything You Need. One Marketplace.
          </p>

          {/* Two Balance Mini-Pills */}
          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            {/* Available */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0c1017] p-3 text-left shadow-sm">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Wallet size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AVAILABLE
                </p>
                <p className="text-xs font-bold text-teal-400">0 ETB</p>
              </div>
            </div>

            {/* Locked (Pending) */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0c1017] p-3 text-left shadow-sm">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  LOCKED (PENDING)
                </p>
                <p className="text-xs font-bold text-amber-400">0 ETB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION: PERSONALIZE */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <span className="size-2 rounded-full bg-cyan-400" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            PERSONALIZE
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] divide-y divide-white/[0.05] shadow-md">
          {/* Personal Details */}
          <button
            type="button"
            onClick={() => setPersonalModalOpen(true)}
            className="flex w-full items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                <User size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Personal Details
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </button>

          {/* Language */}
          <button
            type="button"
            onClick={() => setLanguageModalOpen(true)}
            className="flex w-full items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Globe size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Language</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {selectedLanguage}
              </span>
              <ChevronRight size={16} className="text-slate-500" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. SECTION: ACCOUNT */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <span className="size-2 rounded-full bg-cyan-400" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            ACCOUNT
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] divide-y divide-white/[0.05] shadow-md">
          {/* Security & devices */}
          <Link
            href="/security"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
                <Shield size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Security &amp; devices
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Account Dashboard */}
          <Link
            href="/"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                <LayoutDashboard size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Account Dashboard
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Channels */}
          <Link
            href="/channels"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
                <ListOrdered size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Channels</span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Favorites */}
          <Link
            href="/favorites"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
                <Heart size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Favorites</span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                <Bell size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Notifications
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Inbox */}
          <Link
            href="/inbox"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Mail size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Inbox</span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Chat with Admin */}
          <Link
            href="/inbox"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
                <MessageCircle size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Chat with Admin
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>
        </div>
      </div>

      {/* 4. SECTION: WALLET */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <span className="size-2 rounded-full bg-emerald-400" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            WALLET
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] divide-y divide-white/[0.05] shadow-md">
          {/* Available */}
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
                <Wallet size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-bold text-teal-400">
                0 ETB
              </span>
              <ChevronRight size={16} className="text-slate-500" />
            </div>
          </div>

          {/* Locked (pending) */}
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                <Lock size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Locked (pending)
              </span>
            </div>
            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              0 ETB
            </span>
          </div>

          {/* Transactions */}
          <Link
            href="/transactions"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
                <ArrowLeftRight size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Transactions
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Deposit */}
          <Link
            href="/deposit"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
                <ArrowDownCircle size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Deposit</span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>

          {/* Withdraw */}
          <Link
            href="/withdraw"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                <ArrowUpCircle size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Withdraw</span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </Link>
        </div>
      </div>

      {/* 5. SECTION: NEED HELP? */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <span className="size-2 rounded-full bg-cyan-400" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            NEED HELP?
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md">
          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
                <Headphones size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                Contact Us
              </span>
            </div>
            <ExternalLink size={15} className="text-sky-400" />
          </a>
        </div>
      </div>

      {/* 6. SECTION: ABOUT */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <span className="size-2 rounded-full bg-amber-400" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            ABOUT
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md">
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-slate-800 text-slate-400">
                <Info size={16} />
              </div>
              <span className="text-xs font-semibold text-white">
                App Version
              </span>
            </div>
            <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-[11px] font-mono text-amber-300">
              v2.0.0
            </span>
          </div>
        </div>
      </div>

      {/* 7. SECTION: LOGOUT */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setLogoutModalOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-left transition hover:bg-rose-500/10 hover:border-rose-500/30 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
              <LogOut size={16} />
            </div>
            <span className="text-xs font-bold text-rose-400">Logout</span>
          </div>
          <ChevronRight size={16} className="text-rose-400" />
        </button>
      </div>

      {/* Brand Footer */}
      <div className="pt-6 text-center">
        <p className="font-serif text-xs font-medium tracking-wide text-slate-500">
          Hulu Market
        </p>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-center gap-2">
        <button
          type="button"
          title="Earn ETB"
          className="grid size-12 place-items-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/30 transition hover:scale-105 active:scale-95"
        >
          <Zap size={22} className="fill-slate-950" />
        </button>
        <div className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
          ETB
        </div>
      </div>

      {/* MODAL: Personal Details */}
      {personalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111722] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">
                Personal Details
              </h3>
              <button
                type="button"
                onClick={() => setPersonalModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Country</label>
                <input
                  type="text"
                  disabled
                  value="Ethiopia (ET)"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPersonalModalOpen(false)}
                className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Language */}
      {languageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111722] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">Select Language</h3>
              <button
                type="button"
                onClick={() => setLanguageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { id: "English", label: "English (US)" },
                { id: "Amharic", label: "አማርኛ (Amharic)" },
                { id: "Oromo", label: "Afaan Oromoo" },
                { id: "Tigrinya", label: "ትግርኛ (Tigrinya)" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => {
                    setSelectedLanguage(lang.id);
                    setLanguageModalOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-semibold transition ${
                    selectedLanguage === lang.id
                      ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                      : "bg-[#0c1017] text-slate-300 hover:bg-[#151d2a]"
                  }`}
                >
                  <span>{lang.label}</span>
                  {selectedLanguage === lang.id && (
                    <span className="size-2 rounded-full bg-teal-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Logout Confirmation */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111722] p-6 text-center shadow-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-rose-500/10 text-rose-400">
              <LogOut size={22} />
            </div>
            <h3 className="mt-3 text-base font-bold text-white">
              Log out of your account?
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              You will need to sign in again to access your balance and manage listings.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutModalOpen(false);
                  window.location.href = "/";
                }}
                className="rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-white hover:bg-rose-600 shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
