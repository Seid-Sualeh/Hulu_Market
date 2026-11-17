"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Image as ImageIcon,
  Inbox as InboxIcon,
  Lock,
  MessageSquare,
  Mic,
  Pin,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Square,
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
  buyerId: number;
  sellerId: number | null;
  status: "processing" | "success" | "cancelled";
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  isClosed: boolean;
  closedAt: string | null;
  createdAt: string;
}

interface EscrowMessage {
  id: number;
  sender_name: string;
  sender_role: "buyer" | "seller" | "admin";
  message: string;
  message_type: "text" | "voice" | "image";
  attachment_url: string | null;
  created_at: string;
}

const BACKEND = "http://localhost:4001";

export default function InboxPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderTab>("processing");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<P2POrder[]>([]);

  // Admin support chat
  const [isAdminChatOpen, setIsAdminChatOpen] = useState(false);
  const [adminMessages, setAdminMessages] = useState<
    { sender: "admin" | "user"; text: string; time: string }[]
  >([]);
  const [adminChatInput, setAdminChatInput] = useState("");

  // Escrow order chat
  const [selectedOrder, setSelectedOrder] = useState<P2POrder | null>(null);
  const [orderMessages, setOrderMessages] = useState<EscrowMessage[]>([]);
  const [orderChatInput, setOrderChatInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Init admin chat greeting
  useEffect(() => {
    const greeting = user?.name ? `Hello ${user.name}!` : "Hello!";
    setAdminMessages([
      {
        sender: "admin",
        text: `${greeting} Welcome to Hulu Market Escrow Support. How can we assist you today?`,
        time: "Just now",
      },
    ]);
  }, [user?.name]);

  // Load escrow orders
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
          buyerId: Number(o.buyer_id),
          sellerId: o.seller_id ? Number(o.seller_id) : null,
          status: o.status,
          buyerConfirmed: !!o.buyer_confirmed,
          sellerConfirmed: !!o.seller_confirmed,
          isClosed: !!o.is_closed,
          closedAt: o.closed_at || null,
          createdAt: new Date(o.created_at).toLocaleDateString(),
        }));
        setOrders(mapped);
        // Update selected order if still open
        if (selectedOrder) {
          const updated = mapped.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orderMessages]);

  const openOrderChat = async (order: P2POrder) => {
    setSelectedOrder(order);
    setLoadingMessages(true);
    setOrderChatInput("");
    try {
      const res = await fetch(`/api/escrow/orders/${order.id}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setOrderMessages(data.messages);
      }
    } catch {}
    finally { setLoadingMessages(false); }
  };

  // Upload a file (image or audio blob) to backend
  const uploadFile = async (file: File | Blob, filename?: string): Promise<string | null> => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file, filename || "upload");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      return data.success ? data.url : null;
    } catch {
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const sendEscrowMessage = async (
    message: string,
    messageType: "text" | "voice" | "image",
    attachmentUrl?: string
  ) => {
    if (!selectedOrder || selectedOrder.isClosed) return;
    setSendingMessage(true);
    const role = isBuyer(selectedOrder) ? "buyer" : isSeller(selectedOrder) ? "seller" : "buyer";
    try {
      const res = await fetch(`/api/escrow/orders/${selectedOrder.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          senderName: user?.name || (role === "buyer" ? "Buyer" : "Seller"),
          senderRole: role,
          message,
          messageType,
          attachmentUrl: attachmentUrl || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.createdMessage) {
        setOrderMessages((prev) => [...prev, data.createdMessage]);
      }
    } catch {
      alert("Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderChatInput.trim() || sendingMessage) return;
    const text = orderChatInput.trim();
    setOrderChatInput("");
    await sendEscrowMessage(text, "text");
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const url = await uploadFile(blob, `voice-${Date.now()}.webm`);
        if (url) {
          await sendEscrowMessage("[Voice message]", "voice", url);
        } else {
          alert("Failed to upload voice recording. Please try again.");
        }
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setMediaRecorder(null);
    setIsRecording(false);
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, file.name);
    if (url) {
      await sendEscrowMessage("[Image]", "image", url);
    } else {
      alert("Failed to upload image. Please try again.");
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Buyer confirms ownership receipt
  const handleBuyerConfirm = async () => {
    if (!selectedOrder || !user?.id) return;
    if (!confirm("Are you sure you have successfully received the channel ownership and want to confirm completion?")) return;
    setConfirmingCompletion(true);
    try {
      const res = await fetch(`/api/escrow/orders/${selectedOrder.id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "buyer", userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        // Reload messages and order list
        await openOrderChat({ ...selectedOrder, buyerConfirmed: true });
        await loadOrders();
      } else {
        alert(data.error || "Failed to confirm.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setConfirmingCompletion(false);
    }
  };

  // Seller confirms ownership transfer
  const handleSellerConfirm = async () => {
    if (!selectedOrder || !user?.id) return;
    if (!confirm("Are you sure you have successfully completed the transfer of channel ownership to the buyer and want to confirm completion?")) return;
    setConfirmingCompletion(true);
    try {
      const res = await fetch(`/api/escrow/orders/${selectedOrder.id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "seller", userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        await openOrderChat({ ...selectedOrder, sellerConfirmed: true });
        await loadOrders();
      } else {
        alert(data.error || "Failed to confirm.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setConfirmingCompletion(false);
    }
  };

  const handleSendAdminSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim()) return;
    const userMsg = adminChatInput.trim();
    setAdminMessages((prev) => [...prev, { sender: "user", text: userMsg, time: "Just now" }]);
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
    const matchesTab =
      activeTab === "processing"
        ? o.status === "processing" && !o.isClosed
        : activeTab === "success"
        ? o.status === "success" || o.isClosed
        : o.status === "cancelled";
    const matchesSearch =
      searchQuery.trim() === "" ||
      o.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const processingCount = orders.filter((o) => o.status === "processing" && !o.isClosed).length;
  const successCount = orders.filter((o) => o.status === "success" || o.isClosed).length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const isBuyer = (order: P2POrder) => order.buyerId === Number(user?.id);
  const isSeller = (order: P2POrder) =>
    (order.sellerId != null && order.sellerId === Number(user?.id)) ||
    (Boolean(order.seller) && Boolean(user?.name) && order.seller.toLowerCase() === user?.name?.toLowerCase());

  // Polling for new messages and status updates while modal is open
  useEffect(() => {
    if (!selectedOrder) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/escrow/orders/${selectedOrder.id}/messages`);
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setOrderMessages(data.messages);
        }
        // Also refresh order state
        const orderRes = await fetch(`/api/escrow/orders?userId=${user?.id}`);
        const orderData = await orderRes.json();
        if (orderData.success && Array.isArray(orderData.orders)) {
          const updated = orderData.orders.find((o: any) => o.id === selectedOrder.id);
          if (updated) {
            setSelectedOrder((prev) => (prev ? {
              ...prev,
              buyerConfirmed: !!updated.buyer_confirmed,
              sellerConfirmed: !!updated.seller_confirmed,
              isClosed: !!updated.is_closed,
              status: updated.status,
            } : null));
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedOrder?.id, user?.id]);

  // Resolve attachment URL through backend server
  const resolveUrl = (url: string | null) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${BACKEND}${url}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
          <InboxIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Inbox</h1>
          <p className="text-xs text-slate-400">
            Escrow trades &bull; talk with sellers, buyers &amp; admin supervision
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#111722] shadow-inner focus-within:border-cyan-500/50">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search orders, channels, platforms..."
          className="w-full bg-transparent px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        {searchQuery ? (
          <button type="button" onClick={() => setSearchQuery("")} className="mr-3 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        ) : (
          <span className="mr-4 text-slate-500"><Search size={16} /></span>
        )}
      </div>

      {/* Pinned Admin Chat */}
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
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">Chat with Admin</h3>
              <Sparkles size={14} className="text-amber-400" />
            </div>
            <p className="mt-0.5 text-xs text-slate-400">Escrow support, disputes &amp; verification</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 shadow-sm shadow-amber-400/20">
          <Pin size={12} className="fill-slate-950" />
          <span>Pinned</span>
        </div>
      </div>

      {/* Escrow Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Escrow Orders</h2>
          <span className="text-xs text-slate-400">Click any trade to open mediation chat</span>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 rounded-2xl border border-white/[0.06] bg-[#111722] p-1.5 text-xs font-semibold">
          {(["processing", "success", "cancelled"] as OrderTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
                activeTab === tab
                  ? "bg-[#00A3FF] text-white font-bold shadow-md shadow-[#00A3FF]/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "processing" && <MessageSquare size={15} />}
              {tab === "success" && <CheckCircle2 size={15} />}
              {tab === "cancelled" && <XCircle size={15} />}
              <span>{tab === "processing" ? "Processing" : tab === "success" ? "Completed" : "Cancelled"}</span>
              <span className={`rounded-full px-1.5 text-[10px] ${activeTab === tab ? "bg-white/20 text-white" : "bg-white/[0.06] text-slate-400"}`}>
                {tab === "processing" ? processingCount : tab === "success" ? successCount : cancelledCount}
              </span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="rounded-3xl border border-white/[0.06] bg-[#0c1017]/70 p-6 sm:p-8 text-center shadow-inner">
          {filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => openOrderChat(order)}
                  className="flex cursor-pointer items-start justify-between rounded-xl border border-white/[0.08] bg-[#111722] p-4 text-left transition hover:border-teal-500/50 hover:bg-[#151c27]"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400">#{order.id}</span>
                      <h4 className="text-sm font-bold text-white">{order.channelName}</h4>
                      <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[9px] font-bold text-cyan-400">
                        {order.platform}
                      </span>
                      {order.isClosed && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-500/20 border border-slate-500/30 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                          <Lock size={9} /> Closed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Seller: {order.seller} &bull; Buyer: {order.buyer}
                    </p>
                    {!order.isClosed && order.status === "processing" && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${order.buyerConfirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>
                          Buyer {order.buyerConfirmed ? "✓ Confirmed" : "• Pending"}
                        </span>
                        <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${order.sellerConfirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>
                          Seller {order.sellerConfirmed ? "✓ Confirmed" : "• Pending"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-1 ml-4 shrink-0">
                    <p className="text-sm font-bold text-teal-400">{order.price}</p>
                    <span className="text-[10px] text-slate-500 block">{order.createdAt}</span>
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
                  {activeTab === "processing" ? "No processing trades" : activeTab === "success" ? "No completed trades" : "No cancelled trades"}
                </h3>
                <p className="text-xs text-slate-400">Buy a channel listing to begin an escrow trade.</p>
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

      {/* ===== Escrow 3-Way Chat Modal ===== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex h-[40rem] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111722] shadow-2xl">

            {/* Modal Header */}
            <div className="border-b border-white/[0.08] bg-[#0c1017] p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-400">Trade #{selectedOrder.id}</span>
                    <h3 className="text-sm font-bold text-white">{selectedOrder.channelName}</h3>
                    {selectedOrder.isClosed && (
                      <span className="flex items-center gap-1 rounded-full bg-slate-500/20 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                        <Lock size={9} /> Closed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Amount: <span className="font-bold text-amber-300">{selectedOrder.price}</span> &bull; Status:{" "}
                    <span className="font-bold text-teal-400 uppercase">
                      {selectedOrder.isClosed ? "closed" : selectedOrder.status}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white ml-2 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedOrder.isClosed ? (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 px-2.5 py-1.5 text-[11px] text-slate-300">
                  <Lock size={14} className="text-slate-400 shrink-0" />
                  <span>This trade is closed. For further assistance, use the Chat with Admin feature.</span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 text-[11px] text-teal-300">
                  <ShieldCheck size={14} className="text-teal-400 shrink-0" />
                  <span>Funds held in escrow. Admin supervises ownership transfer.</span>
                </div>
              )}
            </div>

            {/* Mark as Complete Banner — shown to buyer when processing and not yet confirmed */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isBuyer(selectedOrder) && !selectedOrder.buyerConfirmed && (
              <div className="border-b border-amber-500/20 bg-amber-950/20 px-4 py-3 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1 text-xs text-slate-300">
                    <span className="font-bold text-amber-300">Admin instruction: </span>
                    If you have successfully received the ownership of your purchased channel and verified everything, please click the{" "}
                    <span className="font-bold text-white">Mark as Complete</span> button.
                  </div>
                  <button
                    type="button"
                    disabled={confirmingCompletion}
                    onClick={handleBuyerConfirm}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-emerald-400 active:scale-95 disabled:opacity-60 transition"
                  >
                    <CheckCircle2 size={14} />
                    {confirmingCompletion ? "Confirming..." : "Mark as Complete"}
                  </button>
                </div>
              </div>
            )}

            {/* Buyer already confirmed — show status */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isBuyer(selectedOrder) && selectedOrder.buyerConfirmed && (
              <div className="border-b border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span>
                    You have confirmed receipt.{" "}
                    {selectedOrder.sellerConfirmed
                      ? "Seller also confirmed ✓ — Waiting for admin to finalize."
                      : "Waiting for seller confirmation..."}
                  </span>
                </div>
              </div>
            )}

            {/* Seller confirmation banner — shown to seller when processing and not yet confirmed */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isSeller(selectedOrder) && !selectedOrder.sellerConfirmed && (
              <div className="border-b border-cyan-500/20 bg-cyan-950/20 px-4 py-3 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1 text-xs text-slate-300">
                    <span className="font-bold text-cyan-300">Seller Transfer Confirmation: </span>
                    If you have successfully transferred channel credentials and ownership evidence to the buyer, please click the{" "}
                    <span className="font-bold text-white">Confirm Transfer Complete</span> button.
                  </div>
                  <button
                    type="button"
                    disabled={confirmingCompletion}
                    onClick={handleSellerConfirm}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-cyan-400 active:scale-95 disabled:opacity-60 transition"
                  >
                    <CheckCircle2 size={14} />
                    {confirmingCompletion ? "Confirming..." : "Confirm Transfer Complete"}
                  </button>
                </div>
              </div>
            )}

            {/* Seller already confirmed — show status */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isSeller(selectedOrder) && selectedOrder.sellerConfirmed && (
              <div className="border-b border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span>
                    You have confirmed transfer completion.{" "}
                    {selectedOrder.buyerConfirmed
                      ? "Buyer also confirmed ✓ — Administrator will finalize and release funds."
                      : "Waiting for buyer to verify and confirm receipt..."}
                  </span>
                </div>
              </div>
            )}

            {/* Both Confirmed Status Banner */}
            {!selectedOrder.isClosed && selectedOrder.buyerConfirmed && selectedOrder.sellerConfirmed && (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Both parties confirmed! The administrator will now finalize and close this trade.</span>
                </div>
              </div>
            )}

            {/* Confirmation status badges */}
            {!selectedOrder.isClosed && (selectedOrder.buyerConfirmed || selectedOrder.sellerConfirmed) && (
              <div className="flex gap-2 px-4 py-2 border-b border-white/[0.06] bg-[#0a1420] shrink-0">
                <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${selectedOrder.buyerConfirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>
                  Buyer: {selectedOrder.buyerConfirmed ? "✓ Confirmed" : "Pending"}
                </span>
                <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${selectedOrder.sellerConfirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>
                  Seller: {selectedOrder.sellerConfirmed ? "✓ Confirmed" : "Pending"}
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
              {loadingMessages ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading trade messages...</div>
              ) : orderMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No messages yet. Start the conversation!</div>
              ) : (
                orderMessages.map((msg) => {
                  const isMine = msg.sender_name === user?.name;
                  const isAdmin = msg.sender_role === "admin";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? "justify-center" : isMine ? "justify-end" : "justify-start"}`}
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
                          <span className={`text-[10px] font-bold ${isAdmin ? "text-amber-400" : isMine ? "text-slate-900" : "text-cyan-400"}`}>
                            {msg.sender_name} ({msg.sender_role.toUpperCase()})
                          </span>
                          <span className="text-[9px] opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {/* Render by message type */}
                        {msg.message_type === "image" && msg.attachment_url ? (
                          <img
                            src={resolveUrl(msg.attachment_url)}
                            alt="Shared image"
                            className="max-w-full rounded-lg max-h-48 object-contain mt-1 cursor-pointer border border-white/10"
                            onClick={() => window.open(resolveUrl(msg.attachment_url), "_blank")}
                          />
                        ) : msg.message_type === "voice" && msg.attachment_url ? (
                          <div className="mt-1">
                            <audio controls src={resolveUrl(msg.attachment_url)} className="w-full h-8 rounded" />
                          </div>
                        ) : (
                          <p>{msg.message}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedOrder.isClosed ? (
              <div className="border-t border-white/[0.08] bg-[#0c1017] p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2 shrink-0">
                <Lock size={12} />
                <span>Conversation closed. Use Chat with Admin for support.</span>
              </div>
            ) : (
              <div className="border-t border-white/[0.08] bg-[#0c1017] p-3 space-y-1.5 shrink-0">
                {uploadingFile && (
                  <p className="text-[10px] text-teal-400 text-center animate-pulse">Uploading file...</p>
                )}
                <form onSubmit={handleSendText} className="flex items-center gap-2">
                  {/* Image upload */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    title="Send image"
                    disabled={uploadingFile || isRecording}
                    onClick={() => imageInputRef.current?.click()}
                    className="grid size-8 place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 disabled:opacity-40 transition"
                  >
                    <ImageIcon size={15} />
                  </button>

                  {/* Voice record */}
                  <button
                    type="button"
                    title={isRecording ? "Stop recording" : "Record voice message"}
                    disabled={uploadingFile}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`grid size-8 place-items-center rounded-lg border transition ${
                      isRecording
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse"
                        : "border-white/10 text-slate-400 hover:text-teal-400 hover:border-teal-500/30"
                    } disabled:opacity-40`}
                  >
                    {isRecording ? <Square size={13} /> : <Mic size={15} />}
                  </button>

                  <input
                    type="text"
                    value={orderChatInput}
                    onChange={(e) => setOrderChatInput(e.target.value)}
                    disabled={isRecording || uploadingFile}
                    placeholder={
                      isRecording
                        ? "Recording... click ■ to stop and send"
                        : "Message seller and admin mediator..."
                    }
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!orderChatInput.trim() || sendingMessage || isRecording || uploadingFile}
                    className="grid size-9 place-items-center rounded-xl bg-teal-500 text-slate-950 shadow-md transition hover:bg-teal-400 disabled:opacity-40"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Admin Support Modal ===== */}
      {isAdminChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[32rem] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111722] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1017] p-4 shrink-0">
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
                  <p className="text-[10px] text-slate-400">Typically replies within 5 minutes</p>
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
                <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-teal-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-teal-500/20"
                        : "bg-[#18212f] text-slate-200 border border-white/[0.08] rounded-tl-none shadow-md"
                    }`}
                  >
                    <p>{m.text}</p>
                    <span className={`mt-1 block text-[9px] text-right ${m.sender === "user" ? "text-slate-800" : "text-slate-400"}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendAdminSupport} className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0c1017] p-3 shrink-0">
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
