"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  AlertCircle,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  DollarSign,
  Phone,
  QrCode,
  Smartphone,
  Upload,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";

interface PaymentMethod {
  id: "CBE" | "TELEBIRR" | "MPESA" | "BOA";
  name: string;
  fullName: string;
  accountNumber: string;
  accountName: string;
  type: "bank" | "mobile_money";
  badgeColor: string;
  imageSrc: string;
}

export default function DepositPage() {
  const { user, refreshUser } = useAuth();
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod["id"]>("CBE");
  const [depositorName, setDepositorName] = useState("");
  const [amount, setAmount] = useState("");
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync depositor name with logged in user
  useEffect(() => {
    if (user?.name && !depositorName) {
      setDepositorName(user.name);
    }
  }, [user, depositorName]);

  // Exact 4 Deposit Methods with user's brand images & account numbers
  const paymentMethods: PaymentMethod[] = [
    {
      id: "CBE",
      name: "CBE",
      fullName: "Commercial Bank of Ethiopia",
      accountNumber: "1000179861457",
      accountName: "Seid Sualih (Hulu Market Escrow)",
      type: "bank",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      imageSrc: "/CBE.jpg",
    },
    {
      id: "TELEBIRR",
      name: "TELEBIRR",
      fullName: "Ethio Telecom Telebirr",
      accountNumber: "0929075365",
      accountName: "Seid Sualih",
      type: "mobile_money",
      badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/30",
      imageSrc: "/TELEBIRR.jpg",
    },
    {
      id: "MPESA",
      name: "M-PESA",
      fullName: "Safaricom M-PESA",
      accountNumber: "0722075365",
      accountName: "Seid Sualih",
      type: "mobile_money",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      imageSrc: "/MPESA.jpg",
    },
    {
      id: "BOA",
      name: "BOA",
      fullName: "Bank of Abyssinia",
      accountNumber: "248097574",
      accountName: "Seid Sualih (Hulu Market)",
      type: "bank",
      badgeColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
      imageSrc: "/BOA.png",
    },
  ];

  // Deposit history state (fetched from backend MySQL)
  const [depositHistory, setDepositHistory] = useState<
    {
      id: string;
      amount: string;
      method: string;
      accountNumber: string;
      imageSrc: string;
      status: "pending" | "approved" | "rejected";
      date: string;
      time: string;
    }[]
  >([]);

  const fetchTransactions = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/transactions/my?userId=${user.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        const deposits = data.transactions
          .filter((t: any) => t.type === "deposit")
          .map((t: any) => {
            const dateObj = new Date(t.created_at);
            const matched = paymentMethods.find((p) => p.name === t.payment_method);
            return {
              id: t.reference_code || `DEP-${t.id}`,
              amount: `${t.amount} ETB`,
              method: t.payment_method,
              accountNumber: t.account_number || "",
              imageSrc: matched ? matched.imageSrc : "/CBE.jpg",
              status: t.status,
              date: dateObj.toLocaleDateString(),
              time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
          });
        setDepositHistory(deposits);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTransactions();
    refreshUser?.();
  }, [user?.id]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMethod =
    paymentMethods.find((m) => m.id === selectedMethod) || paymentMethods[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewScreenshot(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setSubmitError("Please enter a valid deposit amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          amount: numAmount,
          paymentMethod: currentMethod.name,
          accountNumber: currentMethod.accountNumber,
          accountName: depositorName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmittedSuccess(true);
        fetchTransactions();
        refreshUser?.();
      } else {
        setSubmitError(data.error || "Failed to submit deposit.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Deposit
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Send payment, then submit your name, amount, and screenshot
        </p>
      </div>

      {/* Main Grid: Left Form (approx 65%), Right History (approx 35%) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Forms & Instructions) */}
        <div className="space-y-6 lg:col-span-8">
          {/* 1. Wallet Balance Card */}
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                WALLET BALANCE
              </p>
              <p className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-amber-300">
                {user?.balance !== undefined ? user.balance.toLocaleString() : "0"} ETB
              </p>
            </div>
            <div className="grid size-12 place-items-center rounded-2xl border border-teal-500/30 bg-teal-500/10 text-teal-400 shadow-inner">
              <Wallet size={22} />
            </div>
          </div>

          {/* Submission Error Banner */}
          {submitError && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            </div>
          )}

          {/* Submission Success Toast Banner */}
          {submittedSuccess && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 shadow-xl animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">
                    Deposit Receipt Submitted!
                  </h4>
                  <p className="mt-1 text-xs text-slate-300">
                    Your deposit of{" "}
                    <span className="font-bold text-amber-300">{amount} ETB</span> via{" "}
                    <span className="font-bold text-white">
                      {currentMethod.fullName}
                    </span>{" "}
                    has been recorded and is currently being verified by admin.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedSuccess(false);
                      setPreviewScreenshot(null);
                    }}
                    className="mt-3 rounded-xl bg-teal-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-teal-400"
                  >
                    Make Another Deposit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Payment Method Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-6 shadow-md space-y-5">
            <div>
              <h2 className="text-sm font-bold text-white">Payment Method</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose how you will send the deposit
              </p>
            </div>

            {/* 4 Methods Grid with Official Brand Images */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {paymentMethods.map((m) => {
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(m.id);
                      setSubmittedSuccess(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl p-4 transition-all duration-150 ${
                      isSelected
                        ? "bg-amber-400/15 border-2 border-amber-400 text-white shadow-lg shadow-amber-950/40"
                        : "bg-[#0c1017]/80 border border-white/[0.06] text-slate-400 hover:bg-[#151c27] hover:text-slate-200"
                    }`}
                  >
                    <div className="relative size-12 sm:size-14 overflow-hidden rounded-xl bg-white p-1 shadow-md ring-1 ring-white/10 flex items-center justify-center">
                      <img
                        src={m.imageSrc}
                        alt={m.name}
                        className="size-full object-contain"
                      />
                    </div>
                    <span className="text-xs font-bold tracking-tight">
                      {m.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Account Transfer Instruction Box */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#121a24] to-[#0c1219] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-10 overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-white/10 flex items-center justify-center shrink-0">
                    <img
                      src={currentMethod.imageSrc}
                      alt={currentMethod.name}
                      className="size-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {currentMethod.fullName}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Official Deposit Account
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${currentMethod.badgeColor}`}
                >
                  Verified
                </span>
              </div>

              {/* Account Number with Copy Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#070b10] p-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Account / Phone Number
                  </p>
                  <p className="font-mono text-base sm:text-lg font-bold tracking-wider text-amber-300">
                    {currentMethod.accountNumber}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(currentMethod.accountNumber)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:bg-amber-300 active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Number</span>
                    </>
                  )}
                </button>
              </div>

              {/* Account Name */}
              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <span className="text-slate-400">Account Name:</span>
                <span className="font-semibold text-white">
                  {currentMethod.accountName}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Deposit Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Depositor Name */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-md space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                DEPOSITOR NAME
              </label>
              <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] focus-within:border-teal-400 transition">
                <span className="pl-3.5 text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={depositorName}
                  onChange={(e) => setDepositorName(e.target.value)}
                  placeholder="Enter your full name..."
                  className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Deposit Amount */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-md space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                DEPOSIT AMOUNT (ETB)
              </label>

              <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0c1017] focus-within:border-amber-400 transition">
                <span className="pl-4 font-bold text-amber-400 text-sm">
                  ETB
                </span>
                <input
                  type="number"
                  required
                  min="50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150"
                  className="w-full bg-transparent px-3 py-3 text-base sm:text-lg font-bold text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {["100", "150", "250", "500", "1000", "5000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                      amount === preset
                        ? "border-amber-400/60 bg-amber-400/20 text-amber-300 font-bold"
                        : "border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-white"
                    }`}
                  >
                    {preset} ETB
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Screenshot Upload Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-6 shadow-md space-y-3">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  PAYMENT SCREENSHOT
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Upload a clear screenshot of your payment confirmation. Admin uses this to verify your deposit.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-[#0c1017] p-6 text-center transition hover:border-amber-400/50 hover:bg-[#0f1520]"
              >
                {previewScreenshot ? (
                  <div className="relative size-full max-h-44 overflow-hidden rounded-xl">
                    <img
                      src={previewScreenshot}
                      alt="Payment screenshot"
                      className="mx-auto max-h-40 rounded-lg object-contain shadow-md"
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-xl text-xs font-bold text-white">
                      Click to Change Screenshot
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition">
                      <Camera size={22} />
                    </div>
                    <span className="text-xs font-bold text-white">
                      Tap to upload screenshot
                    </span>
                    <span className="text-[11px] text-slate-500">
                      JPG, PNG or WebP · Max 1MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Large Gold Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#d4af37] py-4 text-center text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-950 shadow-xl shadow-amber-950/40 transition hover:bg-[#e2bd46] active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? "PROCESSING DEPOSIT..." : "SUBMIT DEPOSIT"}
            </button>
          </form>
        </div>

        {/* Right Column: History Section (matching deposit-page.png) */}
        <div className="space-y-4 lg:col-span-4">
          <h2 className="text-sm font-bold text-white">History</h2>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 sm:p-6 shadow-md min-h-[18rem]">
            {depositHistory.length > 0 ? (
              <div className="space-y-3">
                {depositHistory.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl border border-white/[0.06] bg-[#0c1017] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-6 overflow-hidden rounded bg-white p-0.5 shrink-0 flex items-center justify-center">
                          <img
                            src={h.imageSrc}
                            alt={h.method}
                            className="size-full object-contain"
                          />
                        </div>
                        <span className="text-xs font-bold text-white">
                          {h.method} Deposit
                        </span>
                      </div>
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400 flex items-center gap-1">
                        <Clock size={10} />
                        PENDING
                      </span>
                    </div>

                    <p className="font-mono text-base font-bold text-amber-300">
                      +{h.amount}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/[0.04]">
                      <span>{h.id}</span>
                      <span>
                        {h.date} {h.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state from deposit-page.png */
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <p className="text-xs font-medium text-slate-400">
                  No deposits yet.
                </p>
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
}
