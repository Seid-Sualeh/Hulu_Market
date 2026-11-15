"use client";

import Link from "next/link";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";

export default function DashboardView() {
  const stats = [
    {
      title: "Total Balance",
      value: "0 ETB",
      icon: DollarSign,
      iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      badge: "Live",
    },
    {
      title: "Income",
      value: "0 ETB",
      icon: TrendingUp,
      iconBg: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      badge: "Live",
    },
    {
      title: "Sold Channels",
      value: "0",
      icon: ShoppingBag,
      iconBg: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      badge: "Live",
    },
    {
      title: "Total Channel",
      value: "0",
      icon: Activity,
      iconBg: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
      badge: "Live",
    },
    {
      title: "Pending for sale",
      value: "0",
      icon: Layers,
      iconBg: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
      badge: "Live",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="text-amber-400">Seid Sualih</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time account, activity &amp; financial analytics
          </p>
        </div>

        <Link
          href="/social-media"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400"
        >
          <ShoppingBag size={15} />
          <span>Browse Channels</span>
        </Link>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`grid size-10 place-items-center rounded-xl ${s.iconBg}`}>
                  <Icon size={18} />
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {s.badge}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-400">{s.title}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Panels */}
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
                  Approved &amp; processing deposits over the last 30 days
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
              <p className="mt-2 text-xl font-bold text-white">0 ETB</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-amber-400">
                <span>Processing (Pending)</span>
                <Clock size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">0 ETB</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-rose-400">
                <span>Rejected</span>
                <XCircle size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">0</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
            No deposit activity in the last 30 days.
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
                  Withdrawn &amp; processing payout requests over the last 30 days
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
              <p className="mt-2 text-xl font-bold text-white">0 ETB</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-amber-400">
                <span>Processing (In Progress)</span>
                <Clock size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">0 ETB</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-rose-400">
                <span>Rejected</span>
                <XCircle size={14} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">0</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
            No withdrawal activity in the last 30 days.
          </div>
        </div>
      </div>
    </div>
  );
}
