"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowDownLeft,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  HelpCircle,
  History,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
  X,
} from "lucide-react";

interface PaymentMethod {
  id: "CBE" | "TELEBIRR" | "BOA" | "MPESA" | "DASHEN" | "AWASH";
  name: string;
  fullName: string;
  feePercent: number;
  imageSrc?: string;
  badgeBg?: string;
  badgeTextColor?: string;
  accountPlaceholder: string;
  defaultAccount?: string;
}

interface WithdrawalRecord {
  id: string;
  method: string;
  amount: number;
  fee: number;
  netAmount: number;
  receiverName: string;
  accountNumber: string;
  status: "Pending" | "Processing" | "Completed";
  date: string;
}

export default function WithdrawPage() {
  // Balance state (with Demo Balance Top-up toggle for testing)
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [selectedMethodId, setSelectedMethodId] =
    useState<PaymentMethod["id"]>("CBE");
  const [amount, setAmount] = useState<string>("1500");
  const [receiverName, setReceiverName] = useState<string>("seid Sualih");
  const [accountNumber, setAccountNumber] = useState<string>("1000179861457");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successModalOpen, setSuccessModalOpen] = useState<boolean>(false);
  const [submittedRecord, setSubmittedRecord] =
    useState<WithdrawalRecord | null>(null);

  // Withdrawal history list
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);

  // Payment methods: featuring official brand assets + additional Ethiopian banking options
  const paymentMethods: PaymentMethod[] = [
    {
      id: "TELEBIRR",
      name: "Telebirr",
      fullName: "Ethio Telecom Telebirr",
      feePercent: 8,
      imageSrc: "/TELEBIRR.jpg",
      accountPlaceholder: "09XXXXXXXX",
      defaultAccount: "0929075365",
    },
    {
      id: "CBE",
      name: "CBE Bank",
      fullName: "Commercial Bank of Ethiopia",
      feePercent: 7,
      imageSrc: "/CBE.jpg",
      accountPlaceholder: "1000XXXXXXXXX",
      defaultAccount: "1000179861457",
    },
    {
      id: "BOA",
      name: "Bank of Abyssinia",
      fullName: "Bank of Abyssinia (BOA)",
      feePercent: 7,
      imageSrc: "/BOA.png",
      accountPlaceholder: "2480XXXXX",
      defaultAccount: "248097574",
    },
    {
      id: "MPESA",
      name: "M-PESA",
      fullName: "Safaricom M-PESA",
      feePercent: 8,
      imageSrc: "/MPESA.jpg",
      accountPlaceholder: "07XXXXXXXX",
      defaultAccount: "0722075365",
    },
    {
      id: "DASHEN",
      name: "Dashen Bank",
      fullName: "Dashen Bank Ethiopia",
      feePercent: 9,
      badgeBg: "bg-[#0b2d64]",
      badgeTextColor: "text-amber-300",
      accountPlaceholder: "5000XXXXXXXX",
    },
    {
      id: "AWASH",
      name: "Awash Bank",
      fullName: "Awash International Bank",
      feePercent: 9,
      badgeBg: "bg-[#003366]",
      badgeTextColor: "text-orange-400",
      accountPlaceholder: "0132XXXXXXXX",
    },
  ];

  const currentMethod =
    paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[1];

  const numericAmount = parseFloat(amount) || 0;
  const exceedsBalance = numericAmount > availableBalance;
  const feeAmount = (numericAmount * currentMethod.feePercent) / 100;
  const receiveAmount = Math.max(0, numericAmount - feeAmount);

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethodId(method.id);
    if (method.defaultAccount) {
      setAccountNumber(method.defaultAccount);
    }
  };

  const handleAddDemoBalance = (added: number) => {
    setAvailableBalance((prev) => prev + added);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    if (exceedsBalance) {
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newRecord: WithdrawalRecord = {
        id: `WTH-${Date.now().toString().slice(-6)}`,
        method: currentMethod.name,
        amount: numericAmount,
        fee: feeAmount,
        netAmount: receiveAmount,
        receiverName: receiverName || "Seid Sualih",
        accountNumber: accountNumber,
        status: "Processing",
        date: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setHistory((prev) => [newRecord, ...prev]);
      setAvailableBalance((prev) => Math.max(0, prev - numericAmount));
      setSubmittedRecord(newRecord);
      setIsSubmitting(false);
      setSuccessModalOpen(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Title & Subtitle */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Withdraw
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Transfer your balance to a local payment method
          </p>
        </div>

        {/* Main 2-Column Grid matching reference image */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Controls (7 cols or 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* 1. AVAILABLE BALANCE CARD */}
            <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                  AVAILABLE BALANCE
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    {availableBalance.toLocaleString()} ETB
                  </span>
                  {availableBalance === 0 && (
                    <button
                      type="button"
                      onClick={() => handleAddDemoBalance(2000)}
                      className="text-xs text-amber-400 hover:text-amber-300 underline ml-2 transition-colors flex items-center gap-1"
                      title="Add test funds to test withdrawal flow"
                    >
                      <Sparkles className="w-3 h-3" /> Top-up Demo ETB
                    </button>
                  )}
                </div>
              </div>

              {/* Dollar badge icon on right */}
              <div className="w-11 h-11 rounded-lg bg-[#18202d] border border-slate-700/60 flex items-center justify-center text-amber-400 font-bold text-lg shadow-inner">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* 2. PAYMENT METHOD CARD */}
            <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-100">
                  Payment Method
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose where you want to receive your funds
                </p>
              </div>

              {/* Methods Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {paymentMethods.slice(0, 4).map((method) => {
                  const isSelected = selectedMethodId === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleSelectMethod(method)}
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center group ${
                        isSelected
                          ? "border-[#d4af37] bg-[#1d1b18]/80 shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-[#d4af37]/40"
                          : "border-slate-800/80 bg-[#161d2b]/60 hover:bg-[#1a2333]/80 hover:border-slate-700"
                      }`}
                    >
                      {/* Checkmark in top-right for selected item */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#d4af37] text-slate-950 flex items-center justify-center shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Method Logo / Icon */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-white/5 border border-slate-700/50 p-1 mb-2 group-hover:scale-105 transition-transform">
                        {method.imageSrc ? (
                          <Image
                            src={method.imageSrc}
                            alt={method.name}
                            width={44}
                            height={44}
                            className="object-contain max-h-10 max-w-10 rounded"
                          />
                        ) : (
                          <div
                            className={`w-full h-full rounded flex items-center justify-center font-bold text-xs ${method.badgeBg} ${method.badgeTextColor}`}
                          >
                            {method.name.slice(0, 3)}
                          </div>
                        )}
                      </div>

                      {/* Name & Fee */}
                      <span className="text-xs font-semibold text-slate-200">
                        {method.name}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {method.feePercent}% fee
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Extra Banks Toggle / Selector (Dashen & Awash) */}
              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800/50">
                <span className="text-[11px] text-slate-400">Other banks:</span>
                {paymentMethods.slice(4).map((bank) => (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => handleSelectMethod(bank)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                      selectedMethodId === bank.id
                        ? "border-[#d4af37] bg-amber-500/10 text-amber-300 font-semibold"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    {bank.name} ({bank.feePercent}% fee)
                  </button>
                ))}
              </div>

              {/* Selected Method Notice Banner */}
              <div className="mt-4 rounded-xl border border-amber-900/40 bg-[#161719]/80 p-3.5 space-y-1">
                <p className="text-xs text-slate-300">
                  You will receive ETB in your{" "}
                  <strong className="text-amber-400 font-medium">
                    {currentMethod.fullName}
                  </strong>{" "}
                  account.
                </p>
                <p className="text-[11px] text-rose-400">
                  Double-check your details — incorrect info may delay or lose
                  your payout.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 3. WITHDRAW AMOUNT CARD */}
              <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="withdraw-amount-input"
                    className="text-[11px] uppercase tracking-wider font-semibold text-slate-400"
                  >
                    WITHDRAW AMOUNT
                  </label>
                  {availableBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(availableBalance.toString())}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      Use Max ({availableBalance} ETB)
                    </button>
                  )}
                </div>

                {/* Amount Input */}
                <div className="bg-[#0b0f17] border border-slate-700/80 focus-within:border-amber-400 rounded-lg px-4 py-3 flex items-center transition-all">
                  <span className="text-sm font-bold text-slate-300 mr-2 select-none">
                    ETB
                  </span>
                  <input
                    id="withdraw-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-slate-600"
                    required
                  />
                </div>

                {/* Validation Message */}
                {exceedsBalance && (
                  <p className="text-xs text-rose-500 font-medium mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Exceeds balance
                  </p>
                )}

                {/* Financial Breakdown */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Withdraw amount</span>
                    <span className="font-semibold text-slate-200">
                      {numericAmount.toLocaleString()} ETB
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span>Platform fee ({currentMethod.feePercent}%)</span>
                    <span className="font-semibold text-rose-400">
                      -{feeAmount.toLocaleString()} ETB
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">You receive</span>
                    <span className="text-teal-400 font-bold text-sm">
                      {receiveAmount.toLocaleString()} ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. RECEIVER NAME CARD */}
              <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm">
                <label
                  htmlFor="receiver-name-input"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2"
                >
                  RECEIVER NAME
                </label>
                <div className="bg-[#0b0f17] border border-slate-700/80 focus-within:border-amber-400 rounded-lg px-3.5 py-2.5 flex items-center transition-all">
                  <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    id="receiver-name-input"
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Enter full legal name"
                    className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              {/* 5. ACCOUNT NUMBER CARD */}
              <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm">
                <label
                  htmlFor="account-number-input"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2"
                >
                  ACCOUNT NUMBER
                </label>
                <div className="bg-[#0b0f17] border border-slate-700/80 focus-within:border-amber-400 rounded-lg px-3.5 py-2.5 flex items-center transition-all">
                  <CreditCard className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    id="account-number-input"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={currentMethod.accountPlaceholder}
                    className="w-full bg-transparent text-sm font-mono text-slate-200 outline-none placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              {/* 6. SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || numericAmount <= 0}
                className={`w-full py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                  exceedsBalance
                    ? "bg-[#d4af37]/60 text-slate-900 cursor-not-allowed opacity-80"
                    : "bg-[#d4af37] hover:bg-[#c29e28] active:scale-[0.99] text-slate-950 shadow-amber-500/15"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Processing Withdrawal...</span>
                  </>
                ) : (
                  <span>SUBMIT WITHDRAWAL</span>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Withdrawal History */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 text-slate-200">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold">Withdrawal History</h2>
            </div>

            <div className="bg-[#111722]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm min-h-[220px] flex flex-col justify-center">
              {history.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <History className="w-8 h-8 text-slate-600 mx-auto stroke-[1.5]" />
                  <p className="text-sm text-slate-400">No withdrawals yet.</p>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    When you request a payout, your transaction status will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="p-3.5 rounded-lg bg-[#0c111a] border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">
                          {record.method}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {record.status}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">
                          {record.accountNumber}
                        </span>
                        <span className="text-sm font-bold text-teal-400">
                          +{record.netAmount.toLocaleString()} ETB
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                        <span>Fee: {record.fee.toLocaleString()} ETB</span>
                        <span>{record.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Escrow & Security Info Box */}
            <div className="rounded-xl border border-slate-800/60 bg-[#111722]/50 p-4 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Hulu Escrow Protection</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                All payouts are manually verified by Hulu Market admin officers
                within 10-30 minutes during standard business hours.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successModalOpen && submittedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">
                Withdrawal Submitted!
              </h3>
              <p className="text-xs text-slate-400">
                Your request has been placed in the queue for manual payout.
              </p>
            </div>

            <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Reference ID</span>
                <span className="font-mono text-slate-200">
                  {submittedRecord.id}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Method</span>
                <span className="text-slate-200">{submittedRecord.method}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Account</span>
                <span className="font-mono text-slate-200">
                  {submittedRecord.accountNumber}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Receiver</span>
                <span className="text-slate-200">
                  {submittedRecord.receiverName}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-medium">
                <span className="text-slate-300">Net Payout</span>
                <span className="text-teal-400 font-bold text-sm">
                  {submittedRecord.netAmount.toLocaleString()} ETB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessModalOpen(false)}
              className="w-full py-3 rounded-xl bg-[#d4af37] hover:bg-[#c29e28] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
