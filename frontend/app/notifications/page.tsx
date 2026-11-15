"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Coins,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: "escrow" | "wallet" | "marketplace" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "escrow" | "wallet">("all");
  const [showDemoNotifications, setShowDemoNotifications] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      type: "escrow",
      title: "Escrow Payment Released",
      message: "Payment of 4,500 ETB for Telegram channel @EthioCryptoNews has been credited to your available balance.",
      timestamp: "10 minutes ago",
      read: false,
      actionUrl: "/transactions",
      actionLabel: "View Receipt",
    },
    {
      id: "notif-2",
      type: "wallet",
      title: "CBE Deposit Confirmed",
      message: "Your deposit of 1,500 ETB via Commercial Bank of Ethiopia (Txn #CBE-FT243198002) has been approved.",
      timestamp: "2 hours ago",
      read: false,
      actionUrl: "/deposit",
      actionLabel: "Wallet Balance",
    },
    {
      id: "notif-3",
      type: "marketplace",
      title: "New Buyer Inquiry",
      message: "A verified buyer inquired about your listing 'Luxury 3-Bedroom Apartment (Bole Atlas)'.",
      timestamp: "Yesterday at 4:30 PM",
      read: true,
      actionUrl: "/inbox",
      actionLabel: "Open Chat",
    },
    {
      id: "notif-4",
      type: "wallet",
      title: "Withdrawal Processing",
      message: "Your withdrawal request of 1,840 ETB to Telebirr (0929075365) is being reviewed by escrow officers.",
      timestamp: "Nov 12, 2026",
      read: true,
      actionUrl: "/withdraw",
      actionLabel: "Withdraw Status",
    },
    {
      id: "notif-5",
      type: "system",
      title: "Welcome to Hulu Market",
      message: "Your account has been secured with Hulu Escrow Protection. You can now list and purchase items safely.",
      timestamp: "Nov 10, 2026",
      read: true,
      actionUrl: "/profile",
      actionLabel: "View Profile",
    },
  ]);

  const displayedList = showDemoNotifications ? notifications : [];

  const unreadCount = displayedList.filter((n) => !n.read).length;

  const filteredList = displayedList.filter((item) => {
    if (activeFilter === "unread") return !item.read;
    if (activeFilter === "escrow") return item.type === "escrow";
    if (activeFilter === "wallet") return item.type === "wallet";
    return true;
  });

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 md:p-8 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm relative">
              <Bell className="w-6 h-6 stroke-[1.8]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-[#0b0f17]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Updates on escrow payments, deposits, buyer inquiries, and order releases
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowDemoNotifications(!showDemoNotifications)}
              className="px-3 py-1.5 rounded-lg border border-slate-700/80 bg-[#161d2b]/70 hover:bg-[#1a2333] text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDemoNotifications ? "Show Empty State" : "Restore Notifications"}</span>
            </button>

            {displayedList.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-[#111722] hover:bg-[#161d2b] text-xs font-medium text-slate-300 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Mark all read</span>
                </button>

                <button
                  type="button"
                  onClick={clearAll}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-[#111722] hover:bg-rose-500/10 text-xs font-medium text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Pills Bar */}
        {displayedList.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-3 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeFilter === "all"
                  ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({displayedList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("unread")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeFilter === "unread"
                  ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("escrow")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeFilter === "escrow"
                  ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Escrow & Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("wallet")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeFilter === "wallet"
                  ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Wallet & Deposits
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[380px]">
          {displayedList.length === 0 || filteredList.length === 0 ? (
            /* Empty State matching design patterns */
            <div className="bg-[#111722]/60 border border-slate-800/80 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 my-8">
              <div className="w-16 h-16 rounded-2xl bg-[#18202d] border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto shadow-inner">
                <BellOff className="w-8 h-8 stroke-[1.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100">
                  No notifications yet
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We will notify you when there are updates on your listings, escrow orders, wallet payouts, or admin messages.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/social-media"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <span>EXPLORE MARKETPLACE</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Notifications List */
            <div className="bg-[#111722]/90 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/80 overflow-hidden shadow-sm">
              {filteredList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-4 md:p-5 flex items-start gap-4 transition-colors cursor-pointer group ${
                    notif.read ? "hover:bg-[#161d2b]/60" : "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
                  }`}
                >
                  {/* Type Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      notif.type === "escrow"
                        ? "bg-teal-500/10 border-teal-500/25 text-teal-400"
                        : notif.type === "wallet"
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        : notif.type === "marketplace"
                        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                        : "bg-sky-500/10 border-sky-500/25 text-sky-400"
                    }`}
                  >
                    {notif.type === "escrow" ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : notif.type === "wallet" ? (
                      <Coins className="w-5 h-5" />
                    ) : notif.type === "marketplace" ? (
                      <ShoppingBag className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notif.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Bottom Action Link */}
                    {notif.actionUrl && (
                      <div className="pt-2 flex items-center gap-3">
                        <Link
                          href={notif.actionUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <span>{notif.actionLabel || "View"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="text-slate-600 hover:text-rose-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
