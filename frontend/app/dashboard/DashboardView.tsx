"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { fetchBackend } from "@/lib/api";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Hourglass,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Tv,
  Wallet,
  XCircle,
} from "lucide-react";

interface RecentTransaction {
  id: number;
  type: "deposit" | "withdrawal";
  amount: number;
  payment_method: string;
  reference_code: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface RecentChannel {
  id: number;
  name: string;
  platform: string;
  category: string;
  subscribers: string;
  price: number;
  status: "active" | "pending" | "sold" | "rejected";
  created_at: string;
}

interface RecentEscrow {
  id: number;
  channel_name: string;
  platform: string;
  buyer_id: number;
  seller_id: number;
  amount: number;
  status: "processing" | "success" | "cancelled";
  is_closed: boolean;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  created_at: string;
}

interface StatsData {
  balance: number;
  lockedBalance: number;
  income: number;
  soldChannels: number;
  totalChannels: number;
  pendingChannels: number;
  approvedDeposits: number;
  pendingDeposits: number;
  rejectedDeposits: number;
  approvedWithdrawals: number;
  pendingWithdrawals: number;
  rejectedWithdrawals: number;
}

function MiniBarChart({ color = "blue" }: { color?: "blue" | "emerald" | "amber" | "purple" }) {
  const bgClass =
    color === "emerald"
      ? "bg-emerald-400"
      : color === "amber"
      ? "bg-amber-400"
      : color === "purple"
      ? "bg-purple-400"
      : "bg-blue-400";

  return (
    <div className="flex items-end gap-0.5 h-3.5 shrink-0 opacity-80" aria-hidden="true">
      <div className={`w-1 rounded-sm ${bgClass} h-1.5`} />
      <div className={`w-1 rounded-sm ${bgClass} h-2.5`} />
      <div className={`w-1 rounded-sm ${bgClass} h-3.5`} />
    </div>
  );
}

function AscendingBars({ color = "emerald" }: { color?: "emerald" | "amber" | "rose" }) {
  const bgClass =
    color === "emerald"
      ? "from-emerald-500/40 to-emerald-400"
      : color === "amber"
      ? "from-amber-500/40 to-amber-400"
      : "from-rose-500/40 to-rose-400";

  return (
    <div className="flex items-end gap-1 h-8 shrink-0" aria-hidden="true">
      <div className={`w-1.5 rounded-t bg-gradient-to-t ${bgClass} h-2.5`} />
      <div className={`w-1.5 rounded-t bg-gradient-to-t ${bgClass} h-4`} />
      <div className={`w-1.5 rounded-t bg-gradient-to-t ${bgClass} h-5.5`} />
      <div className={`w-1.5 rounded-t bg-gradient-to-t ${bgClass} h-7`} />
      <div className={`w-1.5 rounded-t bg-gradient-to-t ${bgClass} h-8.5 shadow-sm`} />
    </div>
  );
}

export default function DashboardView() {
  const { user, refreshUser } = useAuth();
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const nameParts = displayName.trim().split(" ");
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ");

  const [statsData, setStatsData] = useState<StatsData>({
    balance: user?.balance || 0,
    lockedBalance: 0,
    income: 0,
    soldChannels: 0,
    totalChannels: 0,
    pendingChannels: 0,
    approvedDeposits: 0,
    pendingDeposits: 0,
    rejectedDeposits: 0,
    approvedWithdrawals: 0,
    pendingWithdrawals: 0,
    rejectedWithdrawals: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [recentChannels, setRecentChannels] = useState<RecentChannel[]>([]);
  const [recentEscrows, setRecentEscrows] = useState<RecentEscrow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await refreshUser?.();
      const res = await fetchBackend(`user/stats?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        if (data.stats) {
          setStatsData(data.stats);
        }
        if (Array.isArray(data.recentTransactions)) {
          setRecentTransactions(data.recentTransactions);
        }
        if (Array.isArray(data.recentChannels)) {
          setRecentChannels(data.recentChannels);
        }
        if (Array.isArray(data.recentEscrows)) {
          setRecentEscrows(data.recentEscrows);
        }
      }
    } catch (err) {
      console.error("[Dashboard Fetch Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  const availableBalance = statsData.balance ?? user?.balance ?? 0;
  const lockedBalance = statsData.lockedBalance ?? 0;
  const totalBalance = availableBalance + lockedBalance;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── 1. WELCOME HERO BANNER (MATCHING REFERENCE DESIGN) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-[#0b111e] via-[#0f172a] to-[#0b111e] p-6 sm:p-8 shadow-2xl">
        {/* World Map Dot Pattern Background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]"
          aria-hidden="true"
        />

        {/* Ambient Golden Glow Ribbon */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-amber-500/15 via-amber-500/5 to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-6 right-10 w-96 h-28 bg-gradient-to-r from-amber-600/20 via-amber-400/30 to-amber-200/20 blur-2xl pointer-events-none rounded-full"
          aria-hidden="true"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Content */}
          <div className="space-y-3 max-w-xl z-10">
            <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
              <span className="text-xl">👋</span>
              <span>Welcome back,</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              <span>{firstName} </span>
              {lastName ? (
                <span className="text-[#F3BA2F]">{lastName}!</span>
              ) : (
                <span className="text-[#F3BA2F]">!</span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
              Manage your account, explore marketplace, and grow your business with Hulu Market.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F3BA2F] to-[#EAB308] px-6 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition"
              >
                <span>Browse Marketplace</span>
                <span>&rarr;</span>
              </Link>
              <button
                type="button"
                onClick={fetchUserData}
                disabled={loading}
                title="Refresh live metrics from database"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Right: 3D Golden Hulu Shopping Bag Graphic */}
          <div className="relative hidden md:flex items-center justify-center lg:justify-end pr-4">
            <div className="relative w-48 h-44 flex items-center justify-center">
              {/* Golden Wave Flowing Underneath */}
              <svg
                className="absolute -bottom-2 -left-12 w-64 h-24 overflow-visible pointer-events-none"
                viewBox="0 0 240 80"
                fill="none"
              >
                <path
                  d="M 10 50 Q 80 15, 140 45 T 230 20"
                  stroke="url(#heroWaveGold)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M 30 65 Q 100 30, 160 60 T 240 35"
                  stroke="url(#heroWaveGold2)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <defs>
                  <linearGradient id="heroWaveGold" x1="0" y1="50" x2="240" y2="20" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#D97706" />
                    <stop offset="50%" stopColor="#FCD34D" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="heroWaveGold2" x1="0" y1="65" x2="240" y2="35" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#92400E" />
                    <stop offset="100%" stopColor="#FDE68A" />
                  </linearGradient>
                </defs>
              </svg>

              {/* 3D Gold Shopping Bag */}
              <div className="relative z-10 filter drop-shadow-[0_15px_25px_rgba(245,158,11,0.4)] transform hover:scale-105 transition-transform duration-300">
                <svg width="130" height="130" viewBox="0 0 120 120" fill="none">
                  {/* Bag Handles */}
                  <path
                    d="M 45 45 C 45 22, 75 22, 75 45"
                    stroke="url(#handleGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Main Bag Body */}
                  <path
                    d="M 30 45 L 90 45 L 98 108 L 22 108 Z"
                    fill="url(#bagBodyGrad)"
                  />
                  {/* Left Side Shadow Fold */}
                  <path
                    d="M 22 108 L 30 45 L 34 45 L 28 108 Z"
                    fill="#B45309"
                    opacity="0.4"
                  />
                  {/* Hulu Text on Bag */}
                  <text
                    x="60"
                    y="76"
                    textAnchor="middle"
                    fill="#1e1b18"
                    fontSize="18"
                    fontWeight="800"
                    fontFamily="serif"
                  >
                    Hulu
                  </text>
                  {/* Smile Curve */}
                  <path
                    d="M 48 83 Q 60 93 72 83"
                    stroke="#1e1b18"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="bagBodyGrad" x1="30" y1="45" x2="98" y2="108" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FDE047" />
                      <stop offset="40%" stopColor="#EAB308" />
                      <stop offset="100%" stopColor="#CA8A04" />
                    </linearGradient>
                    <linearGradient id="handleGrad" x1="45" y1="22" x2="75" y2="45" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="100%" stopColor="#CA8A04" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. THREE PRIMARY FINANCIAL / BALANCE CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Available Balance (Emerald Gradient) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0c261e] via-[#091f18] to-[#061410] p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between">
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Wallet size={22} />
            </div>
            <span className="text-xs font-semibold text-slate-300">Available Balance</span>
            <Link
              href="/deposit"
              title="Deposit funds"
              className="grid size-8 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition active:scale-95"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {availableBalance.toLocaleString()}
            </span>
            <span className="text-lg font-bold text-emerald-400">ETB</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Ready to buy channels or withdraw immediately</p>
        </div>

        {/* Card 2: Locked in Escrow (Cyan / Ocean Blue Gradient) */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0a1e36] via-[#08172b] to-[#050f1d] p-6 shadow-xl relative overflow-hidden group hover:border-cyan-500/50 transition">
          <div className="flex items-center justify-between">
            <div className="grid size-11 place-items-center rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <Lock size={20} />
            </div>
            <span className="text-xs font-semibold text-slate-300">Locked in Escrow</span>
            <Link
              href="/inbox"
              title="View active escrow trades"
              className="grid size-8 place-items-center rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 transition active:scale-95"
            >
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {lockedBalance.toLocaleString()}
            </span>
            <span className="text-lg font-bold text-cyan-400">ETB</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Protected until trades verified</p>
        </div>

        {/* Card 3: Channel Sales Revenue (Purple Gradient) */}
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1a1033] via-[#140c29] to-[#0e081c] p-6 shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between">
            <div className="grid size-11 place-items-center rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-semibold text-slate-300">Channel Sales Revenue</span>
            <Link
              href="/my-marketplace"
              title="View your listings"
              className="grid size-8 place-items-center rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition active:scale-95"
            >
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {statsData.income.toLocaleString()}
            </span>
            <span className="text-lg font-bold text-[#F3BA2F]">ETB</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Total earnings from {statsData.soldChannels} sold channel
            {statsData.soldChannels === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* ── 3. FOUR KEY METRIC MINI-CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: My Channels */}
        <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-4 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-blue-500/15 text-blue-400">
                <Tv size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-300">My Channels</span>
            </div>
            <MiniBarChart color="blue" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{statsData.totalChannels}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total channels listed</p>
        </div>

        {/* Metric 2: Sold Channels */}
        <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-4 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-300">Sold Channels</span>
            </div>
            <MiniBarChart color="emerald" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{statsData.soldChannels}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Successfully transferred</p>
        </div>

        {/* Metric 3: Pending Review */}
        <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-4 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-400">
                <Clock size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-300">Pending Review</span>
            </div>
            <MiniBarChart color="amber" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{statsData.pendingChannels}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Under admin verification</p>
        </div>

        {/* Metric 4: Total Portfolio Value */}
        <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-4 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-purple-500/15 text-purple-400">
                <Wallet size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-300 truncate">Total Portfolio Value</span>
            </div>
            <MiniBarChart color="purple" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-extrabold text-white truncate">
            {totalBalance.toLocaleString()} ETB
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Available + locked funds</p>
        </div>
      </div>

      {/* ── 4. ACTIVE ESCROW TRADES ── */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.05] gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Active Escrow Trades</h3>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {recentEscrows.length} Total
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live peer-to-peer ownership transfers supervised by Hulu Market Escrow
              </p>
            </div>
          </div>
          <Link
            href="/inbox"
            className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>Open Inbox</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {recentEscrows.length > 0 ? (
          <div className="divide-y divide-white/[0.04] mt-2">
            {recentEscrows.map((order) => {
              const isBuyer = order.buyer_id === Number(user?.id);
              const isClosed = order.is_closed;
              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-4 hover:bg-white/[0.02] transition gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-slate-900 border border-white/10 shrink-0 font-mono text-xs font-bold text-amber-400">
                      #{order.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {order.channel_name}
                        </span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300 uppercase">
                          {order.platform}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            isBuyer
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {isBuyer ? "Buyer" : "Seller"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>Created on {new Date(order.created_at).toLocaleDateString()}</span>
                        <span>&bull;</span>
                        <span className="text-slate-300">
                          {order.buyer_confirmed ? "✓ Buyer confirmed" : "Buyer verifying"} &bull;{" "}
                          {order.seller_confirmed ? "✓ Seller confirmed" : "Seller transferring"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-bold text-amber-300">
                        {Number(order.amount).toLocaleString()} ETB
                      </p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          isClosed
                            ? "bg-slate-500/20 text-slate-400"
                            : order.status === "processing"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 animate-pulse"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {isClosed ? "Closed" : order.status}
                      </span>
                    </div>
                    <Link
                      href="/inbox"
                      className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-teal-400 active:scale-95 transition"
                    >
                      Chat
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative py-10 px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left side: Empty Message & Action */}
            <div className="text-center md:text-left space-y-2 max-w-md">
              <FileText size={32} className="text-slate-500 mx-auto md:mx-0 mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-slate-300">
                No active escrow trades right now.
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition shadow-sm"
              >
                <span>Browse Marketplace to buy channels</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {/* Right side: 3D Handshake Illustration Overlay */}
            <div className="relative opacity-60 md:opacity-90 pointer-events-none pr-4">
              <svg width="180" height="100" viewBox="0 0 200 120" fill="none">
                {/* Blue ambient glow */}
                <circle cx="100" cy="60" r="50" fill="#0284C7" opacity="0.15" />
                {/* Hand 1 (Left cuff) */}
                <path
                  d="M 20 50 L 55 42 L 65 72 L 25 80 Z"
                  fill="#1E293B"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                <rect x="52" y="40" width="8" height="34" rx="2" fill="#0284C7" />
                {/* Hand 2 (Right cuff) */}
                <path
                  d="M 180 50 L 145 42 L 135 72 L 175 80 Z"
                  fill="#1E293B"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                <rect x="140" y="40" width="8" height="34" rx="2" fill="#0284C7" />
                {/* Clasping fingers */}
                <path
                  d="M 65 52 Q 85 45, 105 52 Q 120 58, 135 55"
                  stroke="#38BDF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 70 62 Q 95 55, 115 62 Q 125 66, 133 63"
                  stroke="#38BDF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 75 72 Q 100 65, 118 72"
                  stroke="#0EA5E9"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. TWO SPLIT CARDS (MY CHANNEL LISTINGS & RECENT TRANSACTIONS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: My Channel Listings */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">My Channel Listings</h3>
                  <p className="text-[10px] text-slate-400">Channels submitted by your account</p>
                </div>
              </div>
              <Link
                href="/my-marketplace"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                <span>View All</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {recentChannels.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {recentChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className="py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">{ch.name}</span>
                        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-slate-300">
                          {ch.platform}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {ch.subscribers || "0"} subscribers &bull; {ch.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-300">
                        {Number(ch.price).toLocaleString()} ETB
                      </p>
                      <span
                        className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          ch.status === "active"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : ch.status === "pending"
                            ? "bg-amber-500/20 text-amber-300"
                            : ch.status === "sold"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {ch.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-2 flex flex-col sm:flex-row items-center gap-4">
                {/* TV Monitor Illustration */}
                <div className="relative shrink-0">
                  <div className="w-16 h-12 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
                    <Tv size={24} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
                    <FileText size={12} />
                  </div>
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-300 font-medium">
                    You haven&apos;t listed any channels yet.
                  </p>
                  <Link
                    href="/sell"
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                  >
                    <span>Create your first listing</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Transactions */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
                  <p className="text-[10px] text-slate-400">Deposits and payout records from MySQL</p>
                </div>
              </div>
              <Link
                href="/transactions"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                <span>History</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {recentTransactions.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-400">
                          {tx.reference_code || `#${tx.id}`}
                        </span>
                        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase font-bold text-slate-300">
                          {tx.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {tx.payment_method} &bull; {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-bold ${
                          tx.type === "deposit" ? "text-emerald-400" : "text-amber-300"
                        }`}
                      >
                        {tx.type === "deposit" ? "+" : "-"}
                        {Number(tx.amount).toLocaleString()} ETB
                      </p>
                      <span
                        className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          tx.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : tx.status === "pending"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-2 flex flex-col sm:flex-row items-center gap-4">
                {/* Receipt Paper Illustration */}
                <div className="relative shrink-0">
                  <div className="w-16 h-12 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
                    <CreditCard size={24} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
                    <FileText size={12} />
                  </div>
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-300 font-medium">
                    No transaction history found.
                  </p>
                  <Link
                    href="/deposit"
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                  >
                    <span>Make your first deposit</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. DEPOSIT ANALYTICS (MATCHING REFERENCE DESIGN) ── */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ArrowDownLeft size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Deposit Analytics</h3>
              <p className="text-[10px] text-slate-400">
                Total deposits approved and credited to your account from MySQL
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Approved Deposits */}
          <div className="rounded-xl border border-emerald-500/30 bg-[#0a1814] p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 size={15} />
                <span>Approved Deposits</span>
              </div>
              <p className="text-2xl font-extrabold text-white">
                {statsData.approvedDeposits.toLocaleString()} ETB
              </p>
            </div>
            <AscendingBars color="emerald" />
          </div>

          {/* Processing (Pending) */}
          <div className="rounded-xl border border-amber-500/30 bg-[#161208] p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Hourglass size={15} />
                <span>Processing (Pending)</span>
              </div>
              <p className="text-2xl font-extrabold text-white">
                {statsData.pendingDeposits.toLocaleString()} ETB
              </p>
            </div>
            <AscendingBars color="amber" />
          </div>

          {/* Rejected */}
          <div className="rounded-xl border border-rose-500/30 bg-[#170b0e] p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <XCircle size={15} />
                <span>Rejected</span>
              </div>
              <p className="text-2xl font-extrabold text-white">
                {statsData.rejectedDeposits}
              </p>
            </div>
            <AscendingBars color="rose" />
          </div>
        </div>

        {/* Withdrawal Analytics Accordion/Summary (Preserving 100% of Financial Metrics) */}
        <div className="mt-4 pt-4 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Approved Withdrawals:{" "}
              <strong className="text-white font-mono">
                {statsData.approvedWithdrawals.toLocaleString()} ETB
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              Pending Withdrawals:{" "}
              <strong className="text-amber-400 font-mono">
                {statsData.pendingWithdrawals.toLocaleString()} ETB
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              Rejected:{" "}
              <strong className="text-rose-400 font-mono">
                {statsData.rejectedWithdrawals}
              </strong>
            </span>
          </div>
          <Link
            href="/withdraw"
            className="text-amber-400 hover:text-amber-300 font-bold transition flex items-center gap-1"
          >
            <span>Manage Withdrawals</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
