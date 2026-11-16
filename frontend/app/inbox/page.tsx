"use client";

import { useState } from "react";
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
  ShoppingBag,
  Sparkles,
  User,
  X,
  XCircle,
} from "lucide-react";

type OrderTab = "processing" | "success" | "cancelled";

interface P2POrder {
  id: string;
  channelName: string;
  platform: string;
  price: string;
  seller: string;
  status: "processing" | "success" | "cancelled";
  createdAt: string;
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<OrderTab>("processing");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdminChatOpen, setIsAdminChatOpen] = useState(false);
  const [messages, setMessages] = useState<
    { sender: "admin" | "user"; text: string; time: string }[]
  >([
    {
      sender: "admin",
      text: "Hello Seid! Welcome to Hulu Market P2P Escrow Support. How can we help you today?",
      time: "Just now",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Orders list (default empty as shown in inbox-page.png)
  const [orders, setOrders] = useState<P2POrder[]>([]);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMsg, time: "Just now" },
    ]);
    setChatInput("");

    // Automated support reply after 1s
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "admin",
          text: "Thanks for reaching out! A Hulu Market support agent has received your message and will review your transaction details shortly.",
          time: "Just now",
        },
      ]);
    }, 1000);
  };

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
            Buy a listing to start a P2P trade
          </p>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="relative flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#111722] shadow-inner focus-within:border-cyan-500/50">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search orders, platforms..."
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
          {/* Avatar with logo */}
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
              Tap to message support anytime
            </p>
          </div>
        </div>

        {/* Pinned Badge */}
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 shadow-sm shadow-amber-400/20">
          <Pin size={12} className="fill-slate-950" />
          <span>Pinned</span>
        </div>
      </div>

      {/* 4. P2P Orders Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white">P2P Orders</h2>

        {/* 3 Tabs Container */}
        <div className="grid grid-cols-3 rounded-2xl border border-white/[0.06] bg-[#111722] p-1.5 text-xs font-semibold">
          {/* Tab 1: Processing */}
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

          {/* Tab 2: Success */}
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
            <span>Success</span>
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

          {/* Tab 3: Cancelled */}
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

        {/* Orders Content / Empty State Area */}
        <div className="rounded-3xl border border-white/[0.06] bg-[#0c1017]/70 p-12 sm:p-20 text-center shadow-inner">
          {filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#111722] p-4 text-left"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {order.channelName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Seller: {order.seller} • {order.platform}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">
                      {order.price}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {order.createdAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Exact Empty State from inbox-page.png */
            <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4">
              {/* Gold outline shopping bag box */}
              <div className="grid size-16 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-400 shadow-lg shadow-amber-500/5">
                <ShoppingBag size={28} strokeWidth={1.8} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white sm:text-lg">
                  {activeTab === "processing"
                    ? "No processing orders"
                    : activeTab === "success"
                    ? "No completed orders"
                    : "No cancelled orders"}
                </h3>
                <p className="text-xs text-slate-400">
                  Buy a listing to start a trade.
                </p>
              </div>

              <Link
                href="/social-media"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-400/20 transition hover:bg-amber-300 active:scale-95"
              >
                <span>Browse marketplace</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 5. Live Interactive Support Chat Modal */}
      {isAdminChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[32rem] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111722] shadow-2xl">
            {/* Modal Header */}
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

            {/* Chat Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
              {messages.map((m, idx) => (
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
                        m.sender === "user"
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0c1017] p-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
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
