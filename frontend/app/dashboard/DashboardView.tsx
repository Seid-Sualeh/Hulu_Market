"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  ExternalLink,
  Inbox,
  Layers,
  ListOrdered,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
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

export default function DashboardView() {
  const { user, refreshUser } = useAuth();
  const displayName = user?.name || user?.email?.split("@")[0] || "User";

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
      const res = await fetch(`/api/user/stats?userId=${user.id}`);
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
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ── Top Header with Welcome & Quick Actions ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
              Live Database Connected
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400 font-mono">User ID: #{user?.id}</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="text-amber-400">{displayName}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time balance, active escrow trades, channels &amp; financial analytics from MySQL
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchUserData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#151d2a] px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
            title="Refresh live metrics from database"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link
            href="/deposit"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-emerald-400 active:scale-95 transition"
          >
            <Plus size={14} />
            <span>Deposit</span>
          </Link>
          <Link
            href="/withdraw"
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition"
          >
            <ArrowUpRight size={14} />
            <span>Withdraw</span>
          </Link>
          <Link
            href="/sell"
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300 active:scale-95 transition"
          >
            <Plus size={14} />
            <span>Sell Channel</span>
          </Link>
        </div>
      </div>

      {/* ── Main Balance Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Available Balance Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#111c22] to-[#0c1219] p-6 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Available Balance
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Coins size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold tracking-tight text-white">
              {availableBalance.toLocaleString()}{" "}
              <span className="text-base font-semibold text-emerald-400">ETB</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Ready to buy channels or withdraw immediately
            </p>
          </div>
          <div className="mt-4 flex gap-2 pt-3 border-t border-white/[0.06]">
            <Link
              href="/deposit"
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Deposit Funds &rarr;
            </Link>
          </div>
        </div>

        {/* Locked Escrow Balance Card */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#111925] to-[#0c1219] p-6 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Locked in Escrow
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Lock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold tracking-tight text-white">
              {lockedBalance.toLocaleString()}{" "}
              <span className="text-base font-semibold text-cyan-400">ETB</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Protected in active trades until ownership is verified
            </p>
          </div>
          <div className="mt-4 flex gap-2 pt-3 border-t border-white/[0.06]">
            <Link
              href="/inbox"
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View Escrow Trades &rarr;
            </Link>
          </div>
        </div>

        {/* Lifetime Revenue / Income Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1c1811] to-[#0c1219] p-6 shadow-md sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Channel Sales Revenue
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold tracking-tight text-white">
              {statsData.income.toLocaleString()}{" "}
              <span className="text-base font-semibold text-amber-400">ETB</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Total earnings realized from {statsData.soldChannels} sold channel{statsData.soldChannels === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-4 flex gap-2 pt-3 border-t border-white/[0.06]">
            <Link
              href="/my-marketplace"
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              My Listings &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Overview ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">My Channels</span>
            <Activity size={16} className="text-teal-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{statsData.totalChannels}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total channels listed</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Sold Channels</span>
            <ShoppingBag size={16} className="text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{statsData.soldChannels}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Successfully transferred</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Pending Review</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{statsData.pendingChannels}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Under admin verification</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Portfolio Value</span>
            <DollarSign size={16} className="text-amber-300" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{totalBalance.toLocaleString()} ETB</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Available + locked funds</p>
        </div>
      </div>

      {/* ── Active Escrow Trades (Live Database) ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Active Escrow Trades
                <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                  {recentEscrows.length} Total
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Live peer-to-peer ownership transfers supervised by Hulu Market Escrow
              </p>
            </div>
          </div>
          <Link
            href="/inbox"
            className="flex items-center gap-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition"
          >
            <span>Open Inbox</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentEscrows.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {recentEscrows.map((order) => {
              const isBuyer = order.buyer_id === Number(user?.id);
              const isClosed = order.is_closed;
              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/[0.02] transition gap-3"
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
                        <span>
                          Created on {new Date(order.created_at).toLocaleDateString()}
                        </span>
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
          <div className="p-8 text-center text-xs text-slate-500">
            <ShieldCheck size={28} className="mx-auto text-slate-700 mb-2" />
            <p>No active escrow trades right now.</p>
            <Link
              href="/social-media"
              className="mt-2 inline-block text-teal-400 font-semibold hover:underline"
            >
              Browse Marketplace to buy channels &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* ── Two Columns: Channel Listings & Recent Transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Channel Listings */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">My Channel Listings</h3>
                <p className="text-[10px] text-slate-400">Channels submitted by your account</p>
              </div>
            </div>
            <Link
              href="/my-marketplace"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {recentChannels.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {recentChannels.map((ch) => (
                <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition">
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
            <div className="p-8 text-center text-xs text-slate-500">
              <ShoppingBag size={24} className="mx-auto text-slate-700 mb-2" />
              <p>You haven&apos;t listed any channels yet.</p>
              <Link href="/sell" className="mt-2 inline-block text-cyan-400 font-semibold hover:underline">
                Create your first listing &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Recent Transactions Activity */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <CreditCard size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
                <p className="text-[10px] text-slate-400">Deposits and payout records from MySQL</p>
              </div>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>History</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition">
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
            <div className="p-8 text-center text-xs text-slate-500">
              <CreditCard size={24} className="mx-auto text-slate-700 mb-2" />
              <p>No transaction history found.</p>
              <Link href="/deposit" className="mt-2 inline-block text-emerald-400 font-semibold hover:underline">
                Make your first deposit &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Deposit & Withdrawal Live Financial Analytics ── */}
      <div className="space-y-6">
        {/* Deposit Analytics */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-400">
                <ArrowDownLeft size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Deposit Analytics</h3>
                <p className="text-[11px] text-slate-400">
                  Total deposits approved and credited to your account from MySQL
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Live
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
                <span>Approved Deposits</span>
                <CheckCircle2 size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">
                {statsData.approvedDeposits.toLocaleString()} ETB
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-amber-400">
                <span>Processing (Pending)</span>
                <Clock size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">
                {statsData.pendingDeposits.toLocaleString()} ETB
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-rose-400">
                <span>Rejected</span>
                <XCircle size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">
                {statsData.rejectedDeposits}
              </p>
            </div>
          </div>
        </div>

        {/* Withdrawal Analytics */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Withdrawal Analytics</h3>
                <p className="text-[11px] text-slate-400">
                  Total payout requests and verified disbursements from MySQL
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Live
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
                <span>Approved Withdrawals</span>
                <CheckCircle2 size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">
                {statsData.approvedWithdrawals.toLocaleString()} ETB
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-amber-400">
                <span>Processing (In Progress)</span>
                <Clock size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">
                {statsData.pendingWithdrawals.toLocaleString()} ETB
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-rose-400">
                <span>Rejected</span>
                <XCircle size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">
                {statsData.rejectedWithdrawals}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
