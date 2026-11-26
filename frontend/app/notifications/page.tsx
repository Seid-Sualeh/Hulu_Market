"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { fetchBackend } from "@/lib/api";
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
  dbId?: number;
  type: "escrow" | "wallet" | "marketplace" | "dispute" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "escrow" | "dispute" | "wallet">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);

  const mapNotif = (n: any): NotificationItem => ({
    id: `notif-${n.id}`,
    dbId: n.id,
    type: n.type || "system",
    title: n.title,
    message: n.message,
    timestamp: new Date(n.created_at).toLocaleString(),
    read: !!n.is_read,
    actionUrl: n.action_url || "/inbox",
    actionLabel: n.action_label || "View Details",
  });

  const loadNotifications = async (offset = 0, append = false) => {
    if (!user?.id) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const r = await fetchBackend(`user/notifications?limit=20&offset=${offset}`);
      const data = await r.json();
      if (!r.ok || !data.success) {
        throw new Error(data.error || "Failed to load notifications.");
      }
      const mapped = Array.isArray(data.notifications) ? data.notifications.map(mapNotif) : [];
      setNotifications((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore(!!data.hasMore);
      if (typeof data.unreadCount === "number") {
        setServerUnreadCount(data.unreadCount);
      }
    } catch (err: any) {
      setError(err?.message || "Could not load notifications.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadNotifications(0, false);
  }, [user?.id]);

  const displayedList = notifications;

  const unreadCount = serverUnreadCount !== null ? serverUnreadCount : displayedList.filter((n) => !n.read).length;

  const filteredList = displayedList.filter((item) => {
    if (activeFilter === "unread") return !item.read;
    if (activeFilter === "escrow") return item.type === "escrow";
    if (activeFilter === "dispute") return item.type === "dispute";
    if (activeFilter === "wallet") return item.type === "wallet";
    return true;
  });

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setServerUnreadCount(0);
    try {
      await fetchBackend("user/notifications/read-all", { method: "PATCH" });
    } catch {}
  };

  const markAsRead = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (target && !target.read) {
      setServerUnreadCount((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    const rawId = id.replace(/^notif-/, "");
    fetchBackend(`user/notifications/${rawId}/read`, { method: "PATCH" }).catch(() => {});
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
              onClick={() => setActiveFilter("dispute")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeFilter === "dispute"
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Disputes
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
          {loading ? (
            <div className="bg-[#111722]/60 border border-slate-800/80 rounded-2xl p-12 text-center max-w-md mx-auto my-8">
              <p className="text-xs text-slate-400 animate-pulse">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center max-w-md mx-auto my-8 space-y-3">
              <p className="text-xs text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => loadNotifications(0, false)}
                className="px-4 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 text-xs font-semibold hover:bg-rose-500/30 transition"
              >
                Retry
              </button>
            </div>
          ) : displayedList.length === 0 || filteredList.length === 0 ? (
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
                        : notif.type === "dispute"
                        ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
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
          {hasMore && !loading && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => loadNotifications(notifications.length, true)}
                className="px-5 py-2 rounded-xl border border-slate-700 bg-[#111722] hover:bg-[#161d2b] text-xs font-semibold text-slate-300 disabled:opacity-50 transition"
              >
                {loadingMore ? "Loading..." : "Load More Notifications"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
