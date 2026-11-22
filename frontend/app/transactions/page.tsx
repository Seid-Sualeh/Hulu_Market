"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { fetchBackend } from "@/lib/api";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

interface DatabaseTransaction {
  id: number;
  user_id: number;
  type: "deposit" | "withdrawal" | "escrow_hold" | "escrow_release" | "purchase";
  amount: number;
  payment_method: string;
  account_number?: string;
  account_name?: string;
  reference_code: string;
  screenshot_url?: string;
  status: "pending" | "approved" | "rejected" | "completed";
  admin_notes?: string;
  created_at: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<DatabaseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "deposit" | "withdrawal" | "escrow">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<DatabaseTransaction | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Load real transactions from MySQL database
  const loadTransactions = async () => {
    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchBackend(`transactions/my?userId=${user.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("[Transactions Load Error]:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user?.id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "escrow"
        ? t.type.includes("escrow") || t.type === "purchase"
        : t.type === activeTab;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      String(t.id).includes(query) ||
      (t.reference_code && t.reference_code.toLowerCase().includes(query)) ||
      (t.payment_method && t.payment_method.toLowerCase().includes(query)) ||
      (t.account_number && t.account_number.toLowerCase().includes(query)) ||
      (t.account_name && t.account_name.toLowerCase().includes(query)) ||
      (t.status && t.status.toLowerCase().includes(query)) ||
      String(t.amount).includes(query);

    return matchesTab && matchesSearch;
  });

  const totalDeposited = transactions
    .filter((t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed"))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalWithdrawn = transactions
    .filter((t) => t.type === "withdrawal" && (t.status === "approved" || t.status === "completed"))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400 shrink-0 shadow-sm">
              <ArrowLeftRight className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Transaction History
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Real records from MySQL &bull; deposits, withdrawals, and escrow operations
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadTransactions}
              className="p-2.5 rounded-xl border border-white/10 bg-[#161d2b]/70 hover:bg-[#1a2333] text-slate-300 hover:text-white transition"
              title="Refresh transactions"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <Link
              href="/deposit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit ETB</span>
            </Link>

            <Link
              href="/withdraw"
              className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw ETB</span>
            </Link>
          </div>
        </div>

        {/* Live Summary Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/[0.06] bg-[#111722] p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Total Recorded</p>
              <p className="text-xl font-bold text-white mt-1">{transactions.length} Transactions</p>
            </div>
            <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-400">
              <Wallet size={18} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111722] p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold text-emerald-400">Total Approved Deposits</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">+{totalDeposited.toLocaleString()} ETB</p>
            </div>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowDownLeft size={18} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111722] p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold text-amber-400">Total Approved Withdrawals</p>
              <p className="text-xl font-bold text-amber-300 mt-1">-{totalWithdrawn.toLocaleString()} ETB</p>
            </div>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
              <ArrowUpRight size={18} />
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deposit")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "deposit"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              Deposits
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("withdrawal")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "withdrawal"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              Withdrawals
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("escrow")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "escrow"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              Escrow
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, method, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111722]/80 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-teal-500 transition"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[380px]">
          {loading ? (
            <div className="py-24 text-center text-xs text-slate-500">
              <RefreshCw size={24} className="animate-spin mx-auto text-teal-400 mb-2" />
              <span>Querying transactions from MySQL...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            /* Empty State */
            <div className="bg-[#111722]/60 border border-slate-800/80 rounded-2xl p-12 text-center max-w-sm mx-auto space-y-4 my-8">
              <div className="w-16 h-16 rounded-2xl bg-[#18202d] border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto shadow-inner">
                <CreditCard className="w-8 h-8 stroke-[1.5]" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-200">
                  {transactions.length === 0 ? "No Transactions Found" : "No Matches for this Filter"}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  {transactions.length === 0
                    ? "Your wallet deposit and withdrawal receipts will be recorded here automatically."
                    : "Try searching with a different keyword or resetting your filter."}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2">
                <Link
                  href="/deposit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Deposit ETB
                </Link>
                <Link
                  href="/social-media"
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-white font-semibold text-xs transition-all"
                >
                  Marketplace
                </Link>
              </div>
            </div>
          ) : (
            /* Populated Transactions Table/List from MySQL */
            <div className="bg-[#111722]/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-800/80">
              {filteredTransactions.map((t) => {
                const isDeposit = t.type === "deposit" || t.type === "escrow_release";
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
                          isDeposit
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-100 group-hover:text-teal-400 transition-colors uppercase">
                            {t.type.replace("_", " ")}
                          </span>
                          <span className="text-[11px] font-mono text-amber-400 font-bold">
                            {t.reference_code || `#${t.id}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                          <span>{t.payment_method}</span>
                          {t.account_number && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-300">{t.account_number}</span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span>{new Date(t.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Status Badge */}
                    <div className="flex items-center justify-between md:justify-end gap-5">
                      <div className="text-right">
                        <p
                          className={`text-sm md:text-base font-bold ${
                            isDeposit ? "text-emerald-400" : "text-amber-300"
                          }`}
                        >
                          {isDeposit ? "+" : "-"}
                          {Number(t.amount).toLocaleString()} ETB
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                          t.status === "approved" || t.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : t.status === "pending"
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse"
                            : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                );
              })}
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
                Transaction Verification
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
                <span>Reference Code</span>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedTxn.reference_code || `#${selectedTxn.id}`)}
                  className="font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
                >
                  {selectedTxn.reference_code || `#${selectedTxn.id}`}
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Type</span>
                <span className="uppercase text-slate-200 font-bold">{selectedTxn.type}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Payment Method</span>
                <span className="text-slate-200 font-semibold">{selectedTxn.payment_method}</span>
              </div>

              {selectedTxn.account_number && (
                <div className="flex justify-between text-slate-400">
                  <span>Account / Phone</span>
                  <span className="font-mono text-slate-200">{selectedTxn.account_number}</span>
                </div>
              )}

              {selectedTxn.account_name && (
                <div className="flex justify-between text-slate-400">
                  <span>Account Name</span>
                  <span className="text-slate-200">{selectedTxn.account_name}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>Timestamp</span>
                <span className="text-slate-300">{new Date(selectedTxn.created_at).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Verification Status</span>
                <span
                  className={`font-bold uppercase ${
                    selectedTxn.status === "approved" || selectedTxn.status === "completed"
                      ? "text-emerald-400"
                      : selectedTxn.status === "pending"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {selectedTxn.status}
                </span>
              </div>

              {/* Deposit Proof Screenshot if present */}
              {selectedTxn.screenshot_url && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-slate-400 block">Payment Screenshot Proof:</span>
                  <a
                    href={
                      selectedTxn.screenshot_url.startsWith("http")
                        ? selectedTxn.screenshot_url
                        : selectedTxn.screenshot_url.startsWith("/")
                        ? selectedTxn.screenshot_url
                        : `/${selectedTxn.screenshot_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:underline"
                  >
                    <ExternalLink size={13} />
                    <span>View Submitted Receipt Screenshot</span>
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between font-medium">
                <span className="text-slate-300">Amount</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {Number(selectedTxn.amount).toLocaleString()} ETB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTxn(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wider uppercase transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
