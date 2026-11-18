"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Filter,
  Inbox,
  Layers,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useAuth, signInUser } from "@/lib/auth";
import { fetchBackend } from "@/lib/api";

type AdminTab = "overview" | "approvals" | "inbox" | "users" | "channels" | "transactions";

interface AdminStats {
  totalUsers: number;
  totalUserBalance: number;
  totalChannels: number;
  activeChannels: number;
  soldChannels: number;
  pendingChannels: number;
  totalTransactions: number;
  pendingTransactions: number;
  totalDeposited: number;
  totalWithdrawn: number;
}

interface UserRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  balance: number;
  locked_balance: number;
  role: "user" | "admin";
  created_at: string;
}

interface ChannelRecord {
  id: number;
  seller_id?: number;
  name: string;
  platform: "YouTube" | "Instagram" | "TikTok" | "Telegram" | "Facebook";
  category: string;
  subscribers: string;
  views_or_likes: string;
  price: number;
  link_url?: string;
  screenshot_url?: string;
  supporting_screenshots?: string;
  description?: string;
  seller_username?: string;
  seller_phone?: string;
  rejection_reason?: string;
  status: "active" | "sold" | "pending" | "rejected";
  created_at: string;
}

interface TransactionRecord {
  id: number;
  user_id: number;
  user_email?: string;
  user_name?: string;
  type: "deposit" | "withdrawal" | "escrow_hold" | "escrow_release";
  amount: number;
  payment_method: string;
  account_number?: string;
  account_name?: string;
  reference_code?: string;
  screenshot_url?: string;
  status: "pending" | "approved" | "rejected" | "completed";
  admin_notes?: string;
  created_at: string;
}

interface EscrowOrderRecord {
  id: number;
  channel_id?: number;
  channel_name: string;
  platform: string;
  buyer_id: number;
  buyer_name?: string;
  seller_id?: number;
  seller_name?: string;
  amount: number;
  status: "processing" | "success" | "cancelled";
  buyer_confirmed?: boolean;
  seller_confirmed?: boolean;
  is_closed?: boolean;
  closed_at?: string;
  created_at: string;
}

interface EscrowMessageRecord {
  id: number;
  order_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: "buyer" | "seller" | "admin";
  message: string;
  message_type?: "text" | "voice" | "image";
  attachment_url?: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, signedIn, mounted } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Core platform datasets
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalUserBalance: 0,
    totalChannels: 0,
    activeChannels: 0,
    soldChannels: 0,
    pendingChannels: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
  });
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [channelsList, setChannelsList] = useState<ChannelRecord[]>([]);
  const [txList, setTxList] = useState<TransactionRecord[]>([]);
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrderRecord[]>([]);

  // Escrow chat modal state
  const [activeEscrowTrade, setActiveEscrowTrade] = useState<EscrowOrderRecord | null>(null);
  const [escrowChatMessages, setEscrowChatMessages] = useState<EscrowMessageRecord[]>([]);
  const [escrowAdminInput, setEscrowAdminInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  // Search & Filters
  const [searchUser, setSearchUser] = useState("");
  const [newChannelModal, setNewChannelModal] = useState(false);
  const [newChannelForm, setNewChannelForm] = useState({
    name: "",
    platform: "YouTube",
    category: "Entertainment",
    subscribers: "10K",
    views_or_likes: "50K",
    price: "",
    link_url: "",
  });

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Overview stats
      const statsRes = await fetchBackend("admin/overview");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        }
      }

      // 2. Users list
      const usersRes = await fetchBackend("admin/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success && usersData.users) {
          setUsersList(usersData.users);
        }
      }

      // 3. Channels list
      const channelsRes = await fetchBackend("admin/channels");
      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        if (channelsData.success && channelsData.channels) {
          setChannelsList(channelsData.channels);
        }
      }

      // 4. Transactions list
      const txRes = await fetchBackend("admin/transactions");
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.success && txData.transactions) {
          setTxList(txData.transactions);
        }
      }

      // 5. Escrow orders
      const escrowRes = await fetchBackend("escrow/orders?role=admin");
      if (escrowRes.ok) {
        const escrowData = await escrowRes.json();
        if (escrowData.success && Array.isArray(escrowData.orders)) {
          setEscrowOrders(
            escrowData.orders.map((o: any) => ({
              ...o,
              buyer_confirmed: !!o.buyer_confirmed,
              seller_confirmed: !!o.seller_confirmed,
              is_closed: !!o.is_closed,
            }))
          );
        }
      }
    } catch (err: unknown) {
      console.debug("Admin load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      if (!signedIn) {
        router.push("/auth?redirect=/admin");
        return;
      }
      loadAdminData();
    }
  }, [mounted, signedIn, router]);

  // Open escrow mediation chat
  const openEscrowMediation = async (order: EscrowOrderRecord) => {
    setActiveEscrowTrade(order);
    setLoadingChat(true);
    try {
      const res = await fetchBackend(`escrow/orders/${order.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setEscrowChatMessages(data.messages);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escrowAdminInput.trim() || !activeEscrowTrade) return;

    const text = escrowAdminInput.trim();
    setEscrowAdminInput("");

    try {
      const res = await fetchBackend(`escrow/orders/${activeEscrowTrade.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id || 1,
          senderName: "Hulu Admin",
          senderRole: "admin",
          message: text,
          messageType: "text",
        }),
      });
      const data = await res.json();
      if (data.success && data.createdMessage) {
        setEscrowChatMessages((prev) => [...prev, data.createdMessage]);
      }
    } catch {
      alert("Failed to send administrative message.");
    }
  };

  const handleRequestBuyerConfirmation = async (orderId: number) => {
    try {
      const res = await fetchBackend(`escrow/orders/${orderId}/request-confirmation`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          text: "Confirmation instruction sent to buyer!",
        });
        if (data.instructionMessage) {
          setEscrowChatMessages((prev) => [...prev, data.instructionMessage]);
        }
        loadAdminData();
      } else {
        setFeedback({
          type: "error",
          text: data.error || "Failed to send confirmation instruction.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error sending confirmation instruction." });
    }
  };

  const handleCloseTrade = async (orderId: number) => {
    if (!confirm(`Finalize and close Trade #${orderId}? This will lock the conversation and release funds to the seller.`)) return;
    try {
      const res = await fetchBackend(`escrow/orders/${orderId}/close`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: `Trade #${orderId} finalized and closed successfully!` });
        if (activeEscrowTrade?.id === orderId) {
          setActiveEscrowTrade((prev) => prev ? { ...prev, is_closed: true, status: "success" } : null);
        }
        loadAdminData();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to close trade." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error closing trade." });
    }
  };

  const handleEscrowAction = async (orderId: number, action: "approve" | "cancel") => {
    const confirmPrompt =
      action === "approve"
        ? `Approve Trade #${orderId} and RELEASE payment to the seller?`
        : `CANCEL Trade #${orderId} and REFUND payment back to the buyer?`;

    if (!confirm(confirmPrompt)) return;

    try {
      const res = await fetchBackend(`escrow/orders/${orderId}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          text: action === "approve" ? `Trade #${orderId} released to seller!` : `Trade #${orderId} refunded to buyer.`,
        });
        if (activeEscrowTrade?.id === orderId) {
          setActiveEscrowTrade((prev) => (prev ? { ...prev, status: action === "approve" ? "success" : "cancelled" } : null));
        }
        loadAdminData();
      } else {
        alert(data.error || "Failed to resolve trade.");
      }
    } catch {
      alert("Network error.");
    }
  };

  const handleToggleUserRole = async (targetUser: UserRecord) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      const res = await fetchBackend(`admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: `User role updated to ${newRole}` });
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
      } else {
        setFeedback({ type: "error", text: data.error || "Update failed" });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error updating user" });
    }
  };

  const handleAdjustBalance = async (targetUser: UserRecord) => {
    const input = prompt(`Enter new balance for ${targetUser.first_name} (ETB):`, String(targetUser.balance));
    if (input === null) return;
    const newBalance = parseFloat(input);
    if (isNaN(newBalance) || newBalance < 0) {
      alert("Invalid balance entered.");
      return;
    }

    try {
      const res = await fetchBackend(`admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: newBalance }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: `Balance set to ${newBalance} ETB` });
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, balance: newBalance } : u))
        );
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to adjust balance" });
    }
  };

  const handleUpdateChannelStatus = async (channelId: number, status: string, rejectionReason?: string) => {
    try {
      const res = await fetchBackend(`admin/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          text: status === "active" ? `Channel #${channelId} approved & published to marketplace!` : `Channel #${channelId} marked as rejected.`,
        });
        setChannelsList((prev) =>
          prev.map((c) =>
            c.id === channelId
              ? { ...c, status: status as ChannelRecord["status"], rejection_reason: rejectionReason }
              : c
          )
        );
        loadAdminData();
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to update channel" });
    }
  };

  const handleDeleteChannel = async (channelId: number) => {
    if (!confirm("Are you sure you want to delete this channel listing?")) return;
    try {
      const res = await fetchBackend(`admin/channels/${channelId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: "Channel deleted" });
        setChannelsList((prev) => prev.filter((c) => c.id !== channelId));
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to delete channel" });
    }
  };

  const handleTransactionAction = async (txId: number, status: "approved" | "rejected") => {
    try {
      const res = await fetchBackend(`admin/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: `Transaction #${txId} marked as ${status}` });
        setTxList((prev) =>
          prev.map((t) => (t.id === txId ? { ...t, status } : t))
        );
        loadAdminData();
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to process transaction" });
    }
  };

  const switchToAdminSession = () => {
    signInUser("admin@hulumarket.com", "System Admin", "+251900000000", undefined, 1, 10000, "admin");
    window.location.reload();
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#0b0f17]" />;
  }

  const isAdmin = user?.role === "admin";

  // RBAC GUARD: Non-admin users cannot access the Admin Dashboard
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <div className="rounded-3xl border border-rose-500/30 bg-[#111722] p-8 shadow-2xl space-y-5">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Access Denied (RBAC Protected)</h1>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              You are signed in as <span className="font-semibold text-white">{user?.email}</span> with a regular <span className="text-amber-400 font-bold uppercase">USER</span> role.
              This Admin Control Center is restricted to authorized platform administrators only.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-teal-400 transition"
            >
              Go to User Dashboard
            </Link>
            <button
              onClick={switchToAdminSession}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
            >
              Sign In as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter pending items for the Approvals Hub
  const pendingChannels = channelsList.filter((c) => c.status === "pending");
  const pendingDeposits = txList.filter((t) => t.type === "deposit" && t.status === "pending");
  const pendingWithdrawals = txList.filter((t) => t.type === "withdrawal" && t.status === "pending");
  const pendingEscrows = escrowOrders.filter((o) => o.status === "processing");
  const totalPendingRequests = pendingChannels.length + pendingDeposits.length + pendingWithdrawals.length + pendingEscrows.length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold shadow-2xl backdrop-blur-md ${
          feedback.type === "success"
            ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
            : "border-rose-500/40 bg-rose-950/80 text-rose-300"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-[#101622] p-6 sm:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                <ShieldCheck size={14} className="text-amber-400" />
                Hulu Market Admin Control Center
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                Admin Role Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Platform Master Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Receive, review &amp; approve all user requests from Sells, Inbox, Deposit &amp; Withdraw &bull; <span className="text-amber-300 font-medium">Everything You Need. One Marketplace.</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadAdminData}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151d2a] px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition shadow-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151d2a] px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <span>View User View</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation with Pending Counter Badges */}
      <div className="flex border-b border-white/[0.08] gap-2 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Activity, badge: null },
          { id: "approvals", label: "Approvals Hub", icon: CheckCircle2, badge: totalPendingRequests },
          { id: "inbox", label: "Inbox & Escrow", icon: MessageSquare, badge: pendingEscrows.length || null },
          { id: "users", label: `Users (${usersList.length || stats.totalUsers})`, icon: Users, badge: null },
          { id: "channels", label: `Channels (${channelsList.length || stats.totalChannels})`, icon: Layers, badge: pendingChannels.length || null },
          { id: "transactions", label: `Transactions (${txList.length || stats.totalTransactions})`, icon: Wallet, badge: (pendingDeposits.length + pendingWithdrawals.length) || null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== null && tab.badge > 0 && (
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.2 text-[10px] font-extrabold animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
                <div className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Users size={18} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white">{stats.totalUsers}</p>
              <p className="text-[11px] text-slate-500">Total User Wallets: {stats.totalUserBalance.toLocaleString()} ETB</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Channels</span>
                <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-400">
                  <Layers size={18} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white">{stats.activeChannels}</p>
              <p className="text-[11px] text-slate-500">{stats.soldChannels} sold &bull; {stats.pendingChannels} pending</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Approved Deposits</span>
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ArrowDownLeft size={18} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-emerald-400">+{stats.totalDeposited.toLocaleString()} ETB</p>
              <p className="text-[11px] text-slate-500">Live platform capital inflow</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Approved Payouts</span>
                <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-amber-300">-{stats.totalWithdrawn.toLocaleString()} ETB</p>
              <p className="text-[11px] text-slate-500">{stats.pendingTransactions} requests queued</p>
            </div>
          </div>

          {/* Quick Jump Action Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#181d28] to-[#111620] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-amber-400 text-slate-950 font-bold">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {totalPendingRequests} Pending Action Items Awaiting Your Review
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Approve channel listings from /sell, verify deposit receipts, inspect withdrawal payouts &amp; supervise escrow trades.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("approvals")}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300 transition whitespace-nowrap shadow-md shadow-amber-400/20"
            >
              Open Approvals Hub
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVALS HUB (ALL USER REQUESTS CENTRALIZED) */}
      {activeTab === "approvals" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 1. Pending Channel Listings (/sell) */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pending Channel Listings (From /sell)</h3>
                  <p className="text-[11px] text-slate-400">Sellers submitted channels for platform verification</p>
                </div>
              </div>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-bold text-cyan-400">
                {pendingChannels.length} Pending
              </span>
            </div>

            {pendingChannels.length > 0 ? (
              <div className="space-y-4">
                {pendingChannels.map((ch) => (
                  <div key={ch.id} className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4 shadow-inner">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Channel Information */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-amber-400">Listing #{ch.id}</span>
                          <h4 className="text-base font-extrabold text-white">{ch.name}</h4>
                          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-bold text-cyan-400">
                            {ch.platform}
                          </span>
                          <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                            {ch.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs flex-wrap">
                          <span className="text-slate-300">
                            Subscribers/Followers: <strong className="text-white">{ch.subscribers}</strong>
                          </span>
                          {ch.views_or_likes && ch.views_or_likes !== "0" && (
                            <span className="text-slate-400">
                              Views/Engagement: <strong className="text-slate-300">{ch.views_or_likes}</strong>
                            </span>
                          )}
                          <span className="text-emerald-400 font-bold text-sm">
                            {Number(ch.price).toLocaleString()} ETB
                          </span>
                        </div>

                        {ch.description && (
                          <p className="text-xs text-slate-300 bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl leading-relaxed">
                            {ch.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 flex-wrap">
                          <span>Seller: <strong className="text-slate-200">{ch.seller_username || `ID #${ch.seller_id}`}</strong></span>
                          <span>Phone: <strong className="text-slate-200 font-mono">{ch.seller_phone || "—"}</strong></span>
                          <span>Submitted: {new Date(ch.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Right: Dashboard Screenshot & Channel Link */}
                      <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                        {ch.screenshot_url ? (
                          <a
                            href={`http://localhost:4001${ch.screenshot_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Click to inspect full resolution dashboard screenshot"
                            className="group block"
                          >
                            <img
                              src={`http://localhost:4001${ch.screenshot_url}`}
                              alt="Dashboard screenshot"
                              className="h-24 w-36 rounded-xl object-cover border border-teal-500/30 group-hover:border-teal-400 transition cursor-pointer shadow-lg"
                            />
                            <p className="text-[10px] text-teal-400 text-center mt-1 font-semibold group-hover:underline">
                              Inspect Dashboard Proof ↗
                            </p>
                          </a>
                        ) : (
                          <div className="h-20 w-32 rounded-xl bg-slate-900 border border-dashed border-slate-700 grid place-items-center text-[10px] text-slate-500 text-center p-2">
                            No screenshot uploaded
                          </div>
                        )}

                        {ch.link_url && (
                          <a
                            href={ch.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                          >
                            <span>Open Channel Link</span>
                            <span className="text-[10px]">↗</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2.5 pt-2 border-t border-white/[0.04]">
                      <button
                        onClick={() => handleUpdateChannelStatus(ch.id, "active")}
                        className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20"
                      >
                        ✓ Approve &amp; Publish to Marketplace
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt(
                            `Enter rejection reason for "${ch.name}" to notify the seller:`,
                            "Channel statistics or followers could not be verified from the provided screenshot. Please upload an uncropped analytics dashboard."
                          );
                          if (reason === null) return;
                          handleUpdateChannelStatus(ch.id, "rejected", reason);
                        }}
                        className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition"
                      >
                        Reject Listing (With Reason)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No channel listings pending review. All submissions are processed.
              </div>
            )}
          </div>

          {/* 2. Pending Deposits (/deposit) */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ArrowDownLeft size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pending Deposits (From /deposit)</h3>
                  <p className="text-[11px] text-slate-400">Approve to credit user balance automatically in MySQL</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                {pendingDeposits.length} Pending
              </span>
            </div>

            {pendingDeposits.length > 0 ? (
              <div className="space-y-3">
                {pendingDeposits.map((tx) => (
                  <div key={tx.id} className="rounded-xl border border-white/[0.06] bg-[#0c1017] p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-amber-400">{tx.reference_code || `#${tx.id}`}</span>
                          <span className="font-bold text-emerald-400 text-sm">+{Number(tx.amount).toLocaleString()} ETB</span>
                          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                            {tx.payment_method}
                          </span>
                        </div>
                        <p className="text-xs text-white font-semibold">{tx.user_name || "User"}</p>
                        <p className="text-[10px] text-slate-400">{tx.user_email} &bull; Acct: {tx.account_number || "—"}</p>
                        <p className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      {/* Payment Screenshot Thumbnail */}
                      {tx.screenshot_url && (
                        <a
                          href={`http://localhost:4001${tx.screenshot_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View full payment screenshot"
                          className="shrink-0"
                        >
                          <img
                            src={`http://localhost:4001${tx.screenshot_url}`}
                            alt="Payment screenshot"
                            className="h-16 w-20 rounded-lg object-cover border border-amber-500/30 hover:border-amber-400 transition cursor-pointer shadow-md"
                          />
                          <p className="text-[9px] text-amber-400 text-center mt-0.5">View Proof</p>
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTransactionAction(tx.id, "approved")}
                        className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                      >
                        ✓ Approve &amp; Credit Balance
                      </button>
                      <button
                        onClick={() => handleTransactionAction(tx.id, "rejected")}
                        className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No deposit receipts pending review.
              </div>
            )}
          </div>

          {/* 3. Pending Withdrawals (/withdraw) */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                  <ArrowUpRight size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pending Withdrawals (From /withdraw)</h3>
                  <p className="text-[11px] text-slate-400">Approve payout or Reject to refund user balance</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                {pendingWithdrawals.length} Pending
              </span>
            </div>

            {pendingWithdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b0f17] text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Ref Code</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Payout Method</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Receiver &amp; Account</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {pendingWithdrawals.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{tx.reference_code || `#${tx.id}`}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">{tx.user_name || "User"}</p>
                          <p className="text-[10px] text-slate-400">{tx.user_email}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-200">{tx.payment_method}</td>
                        <td className="py-3.5 px-4 font-bold text-amber-300 text-sm">{Number(tx.amount).toLocaleString()} ETB</td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-200">{tx.account_name || "Recipient"}</p>
                          <p className="font-mono text-[10px] text-slate-400">{tx.account_number}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleTransactionAction(tx.id, "approved")}
                            className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-teal-400 transition"
                          >
                            Approve Payout
                          </button>
                          <button
                            onClick={() => handleTransactionAction(tx.id, "rejected")}
                            className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition"
                          >
                            Reject &amp; Refund
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No payout requests pending review.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INBOX & ESCROW MEDIATION (TALK WITH SELLER & BUYER) */}
      {activeTab === "inbox" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Escrow Trade Mediation</h2>
              <p className="text-xs text-slate-400">
                Supervise conversations between buyers and sellers &bull; Release funds or Cancel trades
              </p>
            </div>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-400">
              {escrowOrders.length} Total Trades
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Trades List (Left Column) */}
            <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-md space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Active &amp; Past Trades
              </h3>

              {escrowOrders.length > 0 ? (
                <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
                  {escrowOrders.map((trade) => {
                    const isSelected = activeEscrowTrade?.id === trade.id;
                    return (
                      <div
                        key={trade.id}
                        onClick={() => openEscrowMediation(trade)}
                        className={`cursor-pointer rounded-xl border p-3 transition space-y-1 ${
                          isSelected
                            ? "border-amber-400 bg-amber-400/10 shadow-md"
                            : "border-white/[0.06] bg-[#0c1017] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-400">Trade #{trade.id}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            trade.status === "processing"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : trade.status === "success"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}>
                            {trade.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{trade.channel_name}</h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>{trade.buyer_name || "Buyer"} ➔ {trade.seller_name || "Seller"}</span>
                          <span className="font-bold text-teal-400">{Number(trade.amount).toLocaleString()} ETB</span>
                        </div>
                        {/* Confirmation status badges */}
                        {!trade.is_closed && (trade.buyer_confirmed || trade.seller_confirmed) && (
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${trade.buyer_confirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>
                              B: {trade.buyer_confirmed ? "✓" : "…"}
                            </span>
                            <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${trade.seller_confirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>
                              S: {trade.seller_confirmed ? "✓" : "…"}
                            </span>
                          </div>
                        )}
                        {trade.is_closed && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[9px] rounded-full px-1.5 py-0.5 bg-slate-500/20 text-slate-400 font-semibold">
                            <Lock size={8} /> Closed
                          </span>
                        )}
                        {/* Finalize button when both confirmed but not closed */}
                        {trade.buyer_confirmed && trade.seller_confirmed && !trade.is_closed && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCloseTrade(trade.id); }}
                            className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-lg bg-amber-500 py-1 text-[10px] font-bold text-slate-950 hover:bg-amber-400 transition"
                          >
                            <CheckCircle2 size={10} /> Finalize &amp; Close Trade
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  No escrow trade orders yet.
                </div>
              )}
            </div>

            {/* Chat & Mediation Actions (Right Column) */}
            <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#111722] shadow-md flex flex-col h-[32rem]">
              {activeEscrowTrade ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-white/[0.08] bg-[#0c1017] p-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">Trade #{activeEscrowTrade.id}</span>
                        <h3 className="text-sm font-bold text-white">{activeEscrowTrade.channel_name}</h3>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Amount: <strong className="text-amber-300">{Number(activeEscrowTrade.amount).toLocaleString()} ETB</strong> &bull; Buyer: {activeEscrowTrade.buyer_name} &bull; Seller: {activeEscrowTrade.seller_name}
                      </p>
                    </div>

                    {activeEscrowTrade.status === "processing" && !activeEscrowTrade.is_closed && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Prompt buyer instruction button */}
                        {!activeEscrowTrade.buyer_confirmed && (
                          <button
                            onClick={() => handleRequestBuyerConfirmation(activeEscrowTrade.id)}
                            className="flex items-center gap-1 rounded-lg bg-teal-500/20 border border-teal-500/40 px-3 py-1.5 text-xs font-bold text-teal-300 hover:bg-teal-500/30 transition"
                            title="Send official instruction asking buyer to verify and Mark as Complete"
                          >
                            <MessageSquare size={13} />
                            Prompt Buyer to Confirm
                          </button>
                        )}

                        {/* Finalize & Close trade button when both confirmed */}
                        {activeEscrowTrade.buyer_confirmed && activeEscrowTrade.seller_confirmed && (
                          <button
                            onClick={() => handleCloseTrade(activeEscrowTrade.id)}
                            className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 shadow-md transition"
                            title="Finalize trade, release funds, and close conversation"
                          >
                            <CheckCircle2 size={13} />
                            Finalize &amp; Close Trade
                          </button>
                        )}

                        <button
                          onClick={() => handleEscrowAction(activeEscrowTrade.id, "approve")}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                        >
                          Release to Seller
                        </button>
                        <button
                          onClick={() => handleEscrowAction(activeEscrowTrade.id, "cancel")}
                          className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition"
                        >
                          Refund Buyer
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
                    {loadingChat ? (
                      <div className="py-12 text-center text-xs text-slate-500">Loading conversation...</div>
                    ) : escrowChatMessages.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">No messages in this trade yet.</div>
                    ) : (
                      escrowChatMessages.map((m) => {
                        const isAdminMsg = m.sender_role === "admin";
                        return (
                          <div key={m.id} className={`flex ${isAdminMsg ? "justify-center" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                              isAdminMsg
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-200 text-center"
                                : "bg-[#18212f] text-slate-200 border border-white/[0.08]"
                            }`}>
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span className={`text-[10px] font-bold ${
                                  isAdminMsg ? "text-amber-400" : m.sender_role === "seller" ? "text-cyan-400" : "text-emerald-400"
                                }`}>
                                  {m.sender_name} ({m.sender_role.toUpperCase()})
                                </span>
                                <span className="text-[9px] opacity-70">
                                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              {m.message_type === "image" && m.attachment_url ? (
                                <a href={`http://localhost:4001${m.attachment_url}`} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={`http://localhost:4001${m.attachment_url}`}
                                    alt="Shared image"
                                    className="max-w-full rounded-lg max-h-32 object-contain mt-1 border border-white/10 hover:border-amber-500/40 transition cursor-pointer"
                                  />
                                </a>
                              ) : m.message_type === "voice" && m.attachment_url ? (
                                <audio controls src={`http://localhost:4001${m.attachment_url}`} className="w-full h-8 rounded mt-1" />
                              ) : (
                                <p>{m.message}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendAdminMessage} className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0c1017] p-3 rounded-b-2xl">
                    <input
                      type="text"
                      value={escrowAdminInput}
                      onChange={(e) => setEscrowAdminInput(e.target.value)}
                      placeholder="Send administrative instructions to buyer and seller..."
                      className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="grid size-9 place-items-center rounded-xl bg-amber-400 text-slate-950 shadow-md transition hover:bg-amber-300"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500">
                  <MessageSquare size={36} className="text-slate-600 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-400">Select an escrow trade from the left</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">You can read messages and instruct buyer &amp; seller before releasing funds.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Registered Users Directory</h2>
              <p className="text-xs text-slate-400">Live MySQL users, balances, and role assignments</p>
            </div>
            <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#0b0f17] px-3 py-1.5">
              <Search size={14} className="text-slate-500 mr-2" />
              <input
                type="text"
                placeholder="Search user..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="bg-transparent text-xs text-white outline-none placeholder:text-slate-600 w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f17] text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {usersList
                  .filter((u) => !searchUser || u.email.toLowerCase().includes(searchUser.toLowerCase()) || u.first_name.toLowerCase().includes(searchUser.toLowerCase()))
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{u.first_name} {u.last_name}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{u.phone || "—"}</td>
                      <td className="py-3.5 px-4 font-bold text-amber-300">{Number(u.balance).toLocaleString()} ETB</td>
                      <td className="py-3.5 px-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleAdjustBalance(u)}
                          className="rounded-lg bg-teal-500/20 border border-teal-500/30 px-2.5 py-1 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/30 transition"
                        >
                          Set Balance
                        </button>
                        <button
                          onClick={() => handleToggleUserRole(u)}
                          className="rounded-lg bg-white/[0.05] border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                        >
                          {u.role === "admin" ? "Demote to User" : "Make Admin"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CHANNELS MANAGEMENT */}
      {activeTab === "channels" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Channel Listings Catalog</h2>
              <p className="text-xs text-slate-400">View and toggle status of all channels</p>
            </div>
            <button
              onClick={() => setNewChannelModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 transition"
            >
              <Plus size={15} />
              <span>Publish Channel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f17] text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Channel Name</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Subscribers</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {channelsList.map((ch) => (
                  <tr key={ch.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-bold text-white">{ch.name}</td>
                    <td className="py-3.5 px-4 text-cyan-400 font-semibold">{ch.platform}</td>
                    <td className="py-3.5 px-4 text-slate-300">{ch.subscribers}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-300">{Number(ch.price).toLocaleString()} ETB</td>
                    <td className="py-3.5 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        ch.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : ch.status === "sold"
                          ? "bg-blue-500/20 text-blue-300"
                          : ch.status === "pending"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}>
                        {ch.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {ch.status !== "active" && (
                        <button
                          onClick={() => handleUpdateChannelStatus(ch.id, "active")}
                          className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                        >
                          Activate
                        </button>
                      )}
                      {ch.status !== "sold" && (
                        <button
                          onClick={() => handleUpdateChannelStatus(ch.id, "sold")}
                          className="rounded-lg bg-blue-500/20 px-2 py-1 text-[11px] font-bold text-blue-300 hover:bg-blue-500/30"
                        >
                          Mark Sold
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteChannel(ch.id)}
                        className="rounded-lg bg-rose-500/10 p-1 text-rose-400 hover:bg-rose-500/20"
                        title="Delete channel"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: TRANSACTIONS AUDIT */}
      {activeTab === "transactions" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111722] p-6 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Financial Transactions &amp; Escrow Audit</h2>
              <p className="text-xs text-slate-400">Complete log of deposits and withdrawals</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">{txList.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f17] text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {txList.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{tx.reference_code || `#${tx.id}`}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{tx.user_name || "User"}</p>
                      <p className="text-[10px] text-slate-400">{tx.user_email}</p>
                    </td>
                    <td className="py-3.5 px-4 uppercase font-bold text-[11px] text-slate-300">{tx.type}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">{tx.payment_method}</td>
                    <td className={`py-3.5 px-4 font-bold text-sm ${
                      tx.type === "deposit" ? "text-emerald-400" : "text-amber-300"
                    }`}>
                      {tx.type === "deposit" ? "+" : "-"}{Number(tx.amount).toLocaleString()} ETB
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        tx.status === "approved" || tx.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : tx.status === "pending"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {tx.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleTransactionAction(tx.id, "approved")}
                            className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleTransactionAction(tx.id, "rejected")}
                            className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/30"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Publish Channel */}
      {newChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111722] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">Publish New Channel Listing</h3>
              <button onClick={() => setNewChannelModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetchBackend("admin/channels", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newChannelForm),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setFeedback({ type: "success", text: "Channel listing published!" });
                    setNewChannelModal(false);
                    loadAdminData();
                  } else {
                    alert(data.error || "Failed to create channel");
                  }
                } catch {
                  alert("Error creating channel");
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-400">Channel / Account Name *</label>
                <input
                  type="text"
                  required
                  value={newChannelForm.name}
                  onChange={(e) => setNewChannelForm({ ...newChannelForm, name: e.target.value })}
                  placeholder="@channelname"
                  className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3 py-2 text-white outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400">Platform</label>
                  <select
                    value={newChannelForm.platform}
                    onChange={(e) => setNewChannelForm({ ...newChannelForm, platform: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3 py-2 text-white outline-none focus:border-teal-400 [&>option]:bg-[#111722]"
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="Telegram">Telegram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400">Price (ETB) *</label>
                  <input
                    type="number"
                    required
                    value={newChannelForm.price}
                    onChange={(e) => setNewChannelForm({ ...newChannelForm, price: e.target.value })}
                    placeholder="5000"
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3 py-2 text-white outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400">Subscribers / Followers</label>
                <input
                  type="text"
                  value={newChannelForm.subscribers}
                  onChange={(e) => setNewChannelForm({ ...newChannelForm, subscribers: e.target.value })}
                  placeholder="25K"
                  className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3 py-2 text-white outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-slate-400">Direct Link URL</label>
                <input
                  type="url"
                  value={newChannelForm.link_url}
                  onChange={(e) => setNewChannelForm({ ...newChannelForm, link_url: e.target.value })}
                  placeholder="https://t.me/..."
                  className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0c1017] px-3 py-2 text-white outline-none focus:border-teal-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewChannelModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-5 py-2 font-bold text-slate-950 hover:bg-teal-400"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
