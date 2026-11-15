"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "purchase" | "sale";
  method: string;
  account: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: "Completed" | "Pending" | "Processing" | "Failed";
  date: string;
  description: string;
  referenceNumber: string;
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "deposit" | "withdraw" | "purchase">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDemoData, setShowDemoData] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Initial demo transactions (can be toggled)
  const initialTransactions: Transaction[] = [
    {
      id: "TXN-89201",
      type: "deposit",
      method: "CBE Bank",
      account: "1000179861457",
      amount: 1500,
      fee: 0,
      netAmount: 1500,
      status: "Completed",
      date: "Nov 14, 2026 • 02:45 PM",
      description: "Wallet balance deposit via CBE Transfer",
      referenceNumber: "CBE-FT243198002",
    },
    {
      id: "TXN-88412",
      type: "purchase",
      method: "Hulu Escrow Wallet",
      account: "Hulu Balance",
      amount: 4500,
      fee: 0,
      netAmount: 4500,
      status: "Completed",
      date: "Nov 12, 2026 • 11:20 AM",
      description: "Purchased Telegram Channel: @EthioCryptoNews",
      referenceNumber: "ESC-2026-9018",
    },
    {
      id: "TXN-87654",
      type: "withdraw",
      method: "Telebirr",
      account: "0929075365",
      amount: 2000,
      fee: 160,
      netAmount: 1840,
      status: "Processing",
      date: "Nov 10, 2026 • 09:15 AM",
      description: "Withdrawal to Telebirr mobile wallet",
      referenceNumber: "TB-WD-780194",
    },
    {
      id: "TXN-86923",
      type: "sale",
      method: "Hulu Escrow",
      account: "Hulu Balance",
      amount: 7200,
      fee: 360,
      netAmount: 6840,
      status: "Completed",
      date: "Nov 08, 2026 • 04:30 PM",
      description: "Channel Sold: @AddisTechDeals (Escrow Released)",
      referenceNumber: "ESC-2026-8711",
    },
  ];

  const transactions = showDemoData ? initialTransactions : [];

  const filteredTransactions = transactions.filter((t) => {
    const matchesTab =
      activeTab === "all" ? true : t.type === activeTab;
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Transactions
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              View your escrow payments, wallet deposits, and withdrawals
            </p>
          </div>

          {/* Quick Actions / Demo Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDemoData(!showDemoData)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700/80 bg-[#161d2b]/70 hover:bg-[#1a2333] text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDemoData ? "Show Empty State" : "Preview Sample Activity"}</span>
            </button>

            <Link
              href="/deposit"
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </Link>

            <Link
              href="/withdraw"
              className="px-3.5 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c49e29] text-slate-950 text-xs font-bold transition-colors flex items-center gap-1"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </Link>
          </div>
        </div>

        {/* Filters and Search Bar (Visible when data exists or to search) */}
        {showDemoData && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "all"
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("deposit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "deposit"
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                Deposits
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("withdraw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "withdraw"
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                Withdrawals
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("purchase")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "purchase"
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                Purchases
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111722]/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[400px] flex flex-col justify-center">
          {!showDemoData || filteredTransactions.length === 0 ? (
            /* Reference Design Empty State: Exactly "No transactions yet." */
            <div className="text-center py-28 text-slate-400 text-sm">
              <p>No transactions yet.</p>
            </div>
          ) : (
            /* Populated Transactions Table/List */
            <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-800/80">
                {filteredTransactions.map((t) => {
                  const isPositive = t.type === "deposit" || t.type === "sale";
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTxn(t)}
                      className="p-4 hover:bg-[#161d2b]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                    >
                      {/* Left: Icon & Description */}
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            t.type === "deposit"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : t.type === "withdraw"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              : t.type === "sale"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-teal-500/10 border-teal-500/20 text-teal-400"
                          }`}
                        >
                          {t.type === "deposit" ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : t.type === "withdraw" ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : t.type === "sale" ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ShoppingBag className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-100 group-hover:text-teal-400 transition-colors">
                              {t.description}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              ({t.id})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            <span>{t.method}</span>
                            <span>•</span>
                            <span>{t.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Status Badge */}
                      <div className="flex items-center justify-between md:justify-end gap-5">
                        <div className="text-right">
                          <p
                            className={`text-sm md:text-base font-bold ${
                              isPositive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {t.netAmount.toLocaleString()} ETB
                          </p>
                          {t.fee > 0 && (
                            <p className="text-[11px] text-slate-500">
                              Fee: {t.fee.toLocaleString()} ETB
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                            t.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : t.status === "Processing"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : t.status === "Pending"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-teal-400" />
                Transaction Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Transaction ID</span>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedTxn.id)}
                  className="font-mono text-slate-200 hover:text-teal-400 flex items-center gap-1 font-semibold"
                >
                  {selectedTxn.id}
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Reference</span>
                <span className="font-mono text-slate-200">{selectedTxn.referenceNumber}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Type</span>
                <span className="capitalize text-slate-200 font-semibold">{selectedTxn.type}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Payment Method</span>
                <span className="text-slate-200">{selectedTxn.method}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Account</span>
                <span className="font-mono text-slate-200">{selectedTxn.account}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Date & Time</span>
                <span className="text-slate-200">{selectedTxn.date}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Status</span>
                <span className="text-amber-400 font-semibold">{selectedTxn.status}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between font-medium">
                <span className="text-slate-300">Net Amount</span>
                <span className="text-teal-400 font-bold text-sm">
                  {selectedTxn.netAmount.toLocaleString()} ETB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTxn(null)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wider uppercase transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
