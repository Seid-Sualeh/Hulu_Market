"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Inbox as InboxIcon,
  MessageCircle,
  MessageSquare,
  Package,
  Pin,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

type OrderTab = "processing" | "success" | "cancelled";

interface P2POrder {
  id: number;
  channelName: string;
  platform: string;
  price: string;
  seller: string;
  buyer: string;
  status: "processing" | "success" | "cancelled";
  createdAt: string;
}

interface EscrowMessage {
  id: number;
  sender_name: string;
  sender_role: "buyer" | "seller" | "admin";
  message: string;
  created_at: string;
}

export default function InboxPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderTab>("processing");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<P2POrder[]>([]);

  // General Admin Support Chat Modal
  const [isAdminChatOpen, setIsAdminChatOpen] = useState(false);
  const [adminMessages, setAdminMessages] = useState<
    { sender: "admin" | "user"; text: string; time: string }[]
  >([]);
  const [adminChatInput, setAdminChatInput] = useState("");

  // Specific Escrow Order Chat Modal
  const [selectedOrder, setSelectedOrder] = useState<P2POrder | null>(null);
  const [orderMessages, setOrderMessages] = useState<EscrowMessage[]>([]);
  const [orderChatInput, setOrderChatInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Initialize general chat with greeting
  useEffect(() => {
    const greeting = user?.name ? `Hello ${user.name}!` : "Hello!";
    setAdminMessages([
      {
        sender: "admin",
        text: `${greeting} Welcome to Hulu Market Escrow Support. How can we assist you today?`,
        time: "Just now",
      },
    ]);
  }, [user]);

  // Load user's P2P Escrow Orders
  const loadOrders = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/escrow/orders?userId=${user.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const mapped: P2POrder[] = data.orders.map((o: any) => ({
          id: o.id,
          channelName: o.channel_name,
          platform: o.platform,
          price: `${Number(o.amount).toLocaleString()} ETB`,
          seller: o.seller_name || "Seller",
          buyer: o.buyer_name || "Buyer",
          status: o.status,
          createdAt: new Date(o.created_at).toLocaleDateString(),
        }));
        setOrders(mapped);
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  // Load messages when an escrow order is opened
  const openOrderChat = async (order: P2POrder) => {
    setSelectedOrder(order);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/escrow/orders/${order.id}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setOrderMessages(data.messages);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendOrderMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderChatInput.trim() || !selectedOrder) return;

    const text = orderChatInput.trim();
    setOrderChatInput("");

    try {
      const res = await fetch(`/api/escrow/orders/${selectedOrder.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          senderName: user?.name || "User",
          senderRole: "buyer",
          message: text,
        }),
      });
      const data = await res.json();
      if (data.success && data.createdMessage) {
        setOrderMessages((prev) => [...prev, data.createdMessage]);
      }
    } catch {
      alert("Failed to send message.");
    }
  };

  const handleSendAdminSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim()) return;

    const userMsg = adminChatInput.trim();
    setAdminMessages((prev) => [
      ...prev,
      { sender: "user", text: userMsg, time: "Just now" },
    ]);
    setAdminChatInput("");

    setTimeout(() => {
      setAdminMessages((prev) => [
        ...prev,
        {
          sender: "admin",
          text: "Thank you for reaching out! A Hulu Market support officer has received your request and will review it promptly.",
          time: "Just now",
        },
      ]);
    }, 1000);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesTab = o.status === activeTab;
    const matchesSearch =
      searchQuery.trim() === "" ||
      o.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const processingCount = orders.filter((o) => o.status === "processing").length;
  const successCount = orders.filter((o) => o.status === "success").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* 1. Header */}
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
          <InboxIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Inbox
          </h1>
          <p className="text-xs text-slate-400">
            Escrow trades &bull; talk with sellers, buyers &amp; admin supervision
          </p>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="relative flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#111722] shadow-inner focus-within:border-cyan-500/50">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search orders, channels, platforms..."
          className="w-full bg-transparent px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mr-3 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        ) : (
          <span className="mr-4 text-slate-500">
            <Search size={16} />
          </span>
        )}
      </div>

      {/* 3. Pinned "Chat with Admin" Card */}
      <div
        onClick={() => setIsAdminChatOpen(true)}
        className="group flex cursor-pointer items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111722] p-4 transition-all duration-150 hover:border-amber-400/40 hover:bg-[#151d2a] shadow-md"
      >
        <div className="flex items-center gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-amber-400 to-teal-400 p-0.5 shadow-md overflow-hidden">
            <div className="grid size-full place-items-center rounded-full overflow-hidden bg-[#0c1017]">
              <img src="/logo.png" alt="Hulu Market" className="w-full h-full object-cover" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                Chat with Admin
              </h3>
              <Sparkles size={14} className="text-amber-400" />
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Escrow support, disputes &amp; verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 shadow-sm shadow-amber-400/20">
          <Pin size={12} className="fill-slate-950" />
          <span>Pinned</span>
        </div>
      </div>

      {/* 4. P2P Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Escrow Orders</h2>
          <span className="text-xs text-slate-400">
            Click any trade to open mediation chat
          </span>
        </div>

        {/* 3 Tabs Container */}
        <div className="grid grid-cols-3 rounded-2xl border border-white/[0.06] bg-[#111722] p-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("processing")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              activeTab === "processing"
                ? "bg-[#00A3FF] text-white font-bold shadow-md shadow-[#00A3FF]/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare size={15} />
            <span>Processing</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "processing"
                  ? "bg-white/20 text-white"
                  : "bg-white/[0.06] text-slate-400"
              }`}
            >
              {processingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("success")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              activeTab === "success"
                ? "bg-[#00A3FF] text-white font-bold shadow-md shadow-[#00A3FF]/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 size={15} />
            <span>Completed</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "success"
                  ? "bg-white/20 text-white"
                  : "bg-white/[0.06] text-slate-400"
              }`}
            >
              {successCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cancelled")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              activeTab === "cancelled"
                ? "bg-[#00A3FF] text-white font-bold shadow-md shadow-[#00A3FF]/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <XCircle size={15} />
            <span>Cancelled</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "cancelled"
                  ? "bg-white/20 text-white"
                  : "bg-white/[0.06] text-slate-400"
              }`}
            >
              {cancelledCount}
            </span>
          </button>
        </div>

        {/* Orders Content Area */}
        <div className="rounded-3xl border border-white/[0.06] bg-[#0c1017]/70 p-6 sm:p-8 text-center shadow-inner">
          {filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => openOrderChat(order)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-[#111722] p-4 text-left transition hover:border-teal-500/50 hover:bg-[#151c27]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        #{order.id}
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {order.channelName}
                      </h4>
                      <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[9px] font-bold text-cyan-400">
                        {order.platform}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Seller: {order.seller} &bull; Buyer: {order.buyer}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold text-teal-400">
                      {order.price}
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      {order.createdAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 py-8">
              <div className="grid size-16 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-400 shadow-lg shadow-amber-500/5">
                <ShoppingBag size={28} strokeWidth={1.8} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white sm:text-lg">
                  {activeTab === "processing"
                    ? "No processing trades"
                    : activeTab === "success"
                    ? "No completed trades"
                    : "No cancelled trades"}
                </h3>
                <p className="text-xs text-slate-400">
                  Buy a channel listing to begin an escrow trade.
                </p>
              </div>

              <Link
                href="/social-media"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-400/20 transition hover:bg-amber-300 active:scale-95"
              >
                <span>Browse Marketplace</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 5. Escrow Trade 3-Way Chat Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex h-[34rem] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111722] shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-white/[0.08] bg-[#0c1017] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      Trade #{selectedOrder.id}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {selectedOrder.channelName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Amount: <span className="font-bold text-amber-300">{selectedOrder.price}</span> &bull; Status:{" "}
                    <span className="font-bold text-teal-400 uppercase">{selectedOrder.status}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 text-[11px] text-teal-300">
                <ShieldCheck size={14} className="text-teal-400 shrink-0" />
                <span>Funds held in escrow. Admin supervises ownership transfer.</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
              {loadingMessages ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading trade messages...
                </div>
              ) : orderMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No messages yet. Start the conversation with seller and admin!
                </div>
              ) : (
                orderMessages.map((msg) => {
                  const isMine = msg.sender_name === user?.name;
                  const isAdmin = msg.sender_role === "admin";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isAdmin ? "justify-center" : isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isAdmin
                            ? "bg-amber-500/15 border border-amber-500/30 text-amber-200 text-center"
                            : isMine
                            ? "bg-teal-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-teal-500/20"
                            : "bg-[#18212f] text-slate-200 border border-white/[0.08] rounded-tl-none shadow-md"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-bold ${
                            isAdmin ? "text-amber-400" : isMine ? "text-slate-900" : "text-cyan-400"
                          }`}>
                            {msg.sender_name} ({msg.sender_role.toUpperCase()})
                          </span>
                          <span className="text-[9px] opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendOrderMessage}
              className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0c1017] p-3"
            >
              <input
                type="text"
                value={orderChatInput}
                onChange={(e) => setOrderChatInput(e.target.value)}
                placeholder="Message buyer, seller, and admin mediator..."
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="grid size-9 place-items-center rounded-xl bg-teal-500 text-slate-950 shadow-md transition hover:bg-teal-400"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Admin Support Modal */}
      {isAdminChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[32rem] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111722] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1017] p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-full overflow-hidden bg-gradient-to-tr from-amber-400 to-teal-400 p-0.5">
                  <div className="grid size-full place-items-center rounded-full overflow-hidden bg-[#0c1017]">
                    <img src="/logo.png" alt="HM" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Hulu Market Support
                    <span className="size-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Typically replies within 5 minutes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminChatOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
              {adminMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-teal-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-teal-500/20"
                        : "bg-[#18212f] text-slate-200 border border-white/[0.08] rounded-tl-none shadow-md"
                    }`}
                  >
                    <p>{m.text}</p>
                    <span
                      className={`mt-1 block text-[9px] text-right ${
                        m.sender === "user" ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSendAdminSupport}
              className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0c1017] p-3"
            >
              <input
                type="text"
                value={adminChatInput}
                onChange={(e) => setAdminChatInput(e.target.value)}
                placeholder="Type your message to support..."
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="grid size-8 place-items-center rounded-lg bg-teal-500 text-slate-950 shadow-md transition hover:bg-teal-400"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
