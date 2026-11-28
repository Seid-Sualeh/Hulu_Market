"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  PackageCheck,
  Search,
  Send,
  Scale,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Square,
  Trash2,
  Upload,
  User,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchBackend, resolveImageUrl } from "@/lib/api";
import SupportChatPanel from "@/components/inbox/SupportChatPanel";

type OrderTab = "processing" | "success" | "cancelled";
type InboxSection = "messages" | "escrow" | "disputes" | "notifications";

interface P2POrder {
  id: number;
  channelName: string;
  platform: string;
  listingType: string;
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
  closedBy: number | null;
  createdAt: string;
}

interface DeliveryFileMeta {
  id: number;
  original_filename: string;
  file_format: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  created_at: string;
}

interface DigitalDeliveryBatch {
  id: number;
  order_id: number;
  listing_id: number;
  file_count: number;
  delivery_note: string | null;
  status: "delivered" | "revoked";
  created_at: string;
  files: DeliveryFileMeta[];
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

interface DisputeSummary {
  id: number;
  order_id: number;
  category: string;
  description: string;
  status: string;
  channel_name: string;
  amount: number | string;
  created_at: string;
}

interface InboxNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  created_at: string;
}


export default function InboxPage() {
  const { user } = useAuth();
  const [inboxSection, setInboxSection] = useState<InboxSection>("messages");
  const [activeTab, setActiveTab] = useState<OrderTab>("processing");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [inboxDisputes, setInboxDisputes] = useState<DisputeSummary[]>([]);
  const [inboxNotifications, setInboxNotifications] = useState<InboxNotification[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  // Escrow order chat
  const [selectedOrder, setSelectedOrder] = useState<P2POrder | null>(null);
  const [orderMessages, setOrderMessages] = useState<EscrowMessage[]>([]);
  const [orderChatInput, setOrderChatInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const orderMessagesContainerRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Digital product seller delivery (Feature 8)
  const deliveryInputRef = useRef<HTMLInputElement>(null);
  const [orderDeliveries, setOrderDeliveries] = useState<DigitalDeliveryBatch[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [selectedDeliveryFiles, setSelectedDeliveryFiles] = useState<File[]>([]);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveringFiles, setDeliveringFiles] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliverySuccess, setDeliverySuccess] = useState<string | null>(null);
  const [deliveryPanelOpen, setDeliveryPanelOpen] = useState(false);

  // Feature 9: Buyer file download state
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);

  // Feature 10: Admin chat closure state
  const [closingChat, setClosingChat] = useState(false);
  const [showAdminCloseConfirm, setShowAdminCloseConfirm] = useState(false);

  // Feature 11: Order dispute state
  const [orderDispute, setOrderDispute] = useState<any | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("non_delivery");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeInfoNote, setDisputeInfoNote] = useState("");

  // Participants online status (for escrow order chat header)
  const [participantsStatus, setParticipantsStatus] = useState<{
    buyer: { isOnline: boolean; label: string } | null;
    seller: { isOnline: boolean; label: string } | null;
    admin: { isOnline: boolean; label: string } | null;
  } | null>(null);

  // Load escrow orders
  const loadOrders = async () => {
    if (!user?.id) return;
    try {
      const res = await fetchBackend(`escrow/orders?userId=${user.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const mapped: P2POrder[] = data.orders.map((o: any) => ({
          id: o.id,
          channelName: o.channel_name,
          platform: o.platform,
          listingType: o.listing_type || "social-media",
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
          closedBy: o.closed_by ? Number(o.closed_by) : null,
          createdAt: new Date(o.created_at).toLocaleDateString(),
        }));
        setOrders(mapped);

        // Check if specific order is requested via URL query e.g. /inbox?orderId=123
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const targetOrderId = parseInt(urlParams.get("orderId") || "", 10);
          if (!isNaN(targetOrderId) && targetOrderId > 0) {
            const targetOrder = mapped.find((o) => o.id === targetOrderId);
            if (targetOrder) {
              openOrderChat(targetOrder);
              return;
            }
          }
        }

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

  useEffect(() => {
    if (!user?.id || !["disputes", "notifications"].includes(inboxSection)) return;
    let active = true;
    const loadSectionData = async () => {
      setSectionLoading(true);
      setSectionError(null);
      try {
        if (inboxSection === "disputes") {
          const endpoint = user.role === "admin" ? "disputes/admin" : "disputes/my";
          const response = await fetchBackend(endpoint);
          const data = await response.json() as { success?: boolean; disputes?: DisputeSummary[]; error?: string };
          if (!response.ok || !data.success || !Array.isArray(data.disputes)) {
            throw new Error(data.error || "Could not load disputes.");
          }
          if (active) setInboxDisputes(data.disputes);
        } else {
          const response = await fetchBackend("user/notifications?limit=100");
          const data = await response.json() as {
            success?: boolean;
            notifications?: InboxNotification[];
            unreadCount?: number;
            error?: string;
          };
          if (!response.ok || !data.success || !Array.isArray(data.notifications)) {
            throw new Error(data.error || "Could not load notifications.");
          }
          if (active) {
            setInboxNotifications(data.notifications);
            setNotificationUnreadCount(Number(data.unreadCount) || 0);
          }
        }
      } catch (error) {
        if (active) setSectionError(error instanceof Error ? error.message : "Could not load inbox details.");
      } finally {
        if (active) setSectionLoading(false);
      }
    };

    void loadSectionData();
    return () => {
      active = false;
    };
  }, [inboxSection, user?.id, user?.role]);

  const markInboxNotificationRead = async (notificationId: number) => {
    const notification = inboxNotifications.find((item) => item.id === notificationId);
    if (!notification || notification.is_read) return;
    try {
      const response = await fetchBackend(`user/notifications/${notificationId}/read`, { method: "PATCH" });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not mark notification as read.");
      }
      setInboxNotifications((items) => items.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      ));
      setNotificationUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : "Could not mark notification as read.");
    }
  };

  // Keep auto-scroll inside the trade message pane rather than moving the page.
  useEffect(() => {
    const container = orderMessagesContainerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [orderMessages]);

  const formatBytes = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fetchDeliveries = async (orderId: number) => {
    setLoadingDeliveries(true);
    try {
      const res = await fetchBackend(`escrow/orders/${orderId}/deliveries`);
      const data = await res.json();
      if (data.success && Array.isArray(data.deliveries)) {
        setOrderDeliveries(data.deliveries);
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleDeliveryFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    setSelectedDeliveryFiles((prev) => {
      const combined = [...prev, ...filesArray];
      return combined.slice(0, 5); // max 5 files
    });
    setDeliveryError(null);
    setDeliverySuccess(null);
  };

  const handleRemoveDeliveryFile = (index: number) => {
    setSelectedDeliveryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDelivery = async () => {
    if (!selectedOrder || selectedDeliveryFiles.length === 0) return;
    setDeliveringFiles(true);
    setDeliveryError(null);
    setDeliverySuccess(null);

    try {
      const formData = new FormData();
      selectedDeliveryFiles.forEach((f) => formData.append("files", f));
      if (deliveryNote.trim()) {
        formData.append("deliveryNote", deliveryNote.trim());
      }

      const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/deliveries`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setDeliverySuccess(`Delivered ${data.delivery?.file_count || selectedDeliveryFiles.length} file(s) successfully!`);
        setSelectedDeliveryFiles([]);
        setDeliveryNote("");
        setDeliveryPanelOpen(false);
        // Refresh deliveries and chat messages
        fetchDeliveries(selectedOrder.id);
        const msgRes = await fetchBackend(`escrow/orders/${selectedOrder.id}/messages`);
        const msgData = await msgRes.json();
        if (msgData.success && Array.isArray(msgData.messages)) {
          setOrderMessages(msgData.messages);
        }
      } else {
        setDeliveryError(data.error || "Failed to deliver files.");
      }
    } catch {
      setDeliveryError("Network error while uploading delivery files.");
    } finally {
      setDeliveringFiles(false);
    }
  };

  const openOrderChat = async (order: P2POrder) => {
    setSelectedOrder(order);
    setLoadingMessages(true);
    setOrderChatInput("");
    setParticipantsStatus(null);
    setSelectedDeliveryFiles([]);
    setDeliveryNote("");
    setDeliveryError(null);
    setDeliverySuccess(null);
    setDeliveryPanelOpen(false);
    setDownloadError(null);
    setShowReceiptConfirm(false);
    setShowAdminCloseConfirm(false);
    setOrderDispute(null);
    setShowDisputeModal(false);
    setDisputeError(null);

    if (order.listingType === "ebooks-digital") {
      fetchDeliveries(order.id);
    } else {
      setOrderDeliveries([]);
    }

    // Fetch existing dispute for this order (Feature 11)
    fetchBackend("disputes/my")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.disputes)) {
          const found = d.disputes.find((item: any) => Number(item.order_id) === order.id);
          if (found) setOrderDispute(found);
        }
      })
      .catch(() => {});

    try {
      const res = await fetchBackend(`escrow/orders/${order.id}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setOrderMessages(data.messages);
      }
      // Mark this order's messages as read (clears unread badge for this order)
      fetchBackend(`escrow/orders/${order.id}/mark-read`, { method: "POST" }).catch(() => {});
      // Fetch participant online status
      const statusRes = await fetchBackend(`escrow/orders/${order.id}/participants-status`);
      const statusData = await statusRes.json();
      if (statusData.success) {
        setParticipantsStatus({
          buyer: statusData.buyer,
          seller: statusData.seller,
          admin: statusData.admin,
        });
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
      const res = await fetchBackend("upload?visibility=private", { method: "POST", body: formData });
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
      const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/messages`, {
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
    // Digital product orders: show modal instead of browser confirm
    if (selectedOrder.listingType === "ebooks-digital") {
      setShowReceiptConfirm(true);
      return;
    }
    if (!confirm("Are you sure you have successfully received the channel ownership and want to confirm completion?")) return;
    setConfirmingCompletion(true);
    try {
      const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/confirm`, {
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

  // Digital product receipt confirmation (from modal)
  const handleDigitalReceiptConfirm = async () => {
    if (!selectedOrder || !user?.id) return;
    setShowReceiptConfirm(false);
    setConfirmingCompletion(true);
    try {
      const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "buyer", userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        await openOrderChat({ ...selectedOrder, buyerConfirmed: true });
        await loadOrders();
      } else {
        alert(data.error || "Failed to confirm receipt.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setConfirmingCompletion(false);
    }
  };

  // Feature 9: Download a delivered file
  const handleDownloadFile = async (orderId: number, fileId: number, filename: string) => {
    setDownloadingFileId(fileId);
    setDownloadError(null);
    try {
      const res = await fetchBackend(`escrow/orders/${orderId}/deliveries/${fileId}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError((data as any).error || `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Network error during download. Please try again.");
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Seller confirms ownership transfer
  const handleSellerConfirm = async () => {
    if (!selectedOrder || !user?.id) return;
    if (!confirm("Are you sure you have successfully completed the transfer of channel ownership to the buyer and want to confirm completion?")) return;
    setConfirmingCompletion(true);
    try {
      const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/confirm`, {
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

  // Feature 10: Admin closes the escrow chat after both confirmations
  const handleAdminCloseChat = async () => {
    if (!selectedOrder || !user?.id) return;
    setShowAdminCloseConfirm(false);
    setClosingChat(true);
    try {
      const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        await loadOrders();
        const msgRes = await fetchBackend(`escrow/orders/${selectedOrder.id}/messages`);
        const msgData = await msgRes.json();
        if (msgData.success && Array.isArray(msgData.messages)) {
          setOrderMessages(msgData.messages);
        }
        setSelectedOrder((prev) => prev ? { ...prev, isClosed: true, status: "success" } : null);
      } else {
        alert(data.error || "Failed to close trade.");
      }
    } catch {
      alert("Network error while closing trade. Please try again.");
    } finally {
      setClosingChat(false);
    }
  };

  // Feature 11: Submit new dispute + optional evidence
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setDisputeError(null);
    if (disputeDescription.trim().length < 10) {
      setDisputeError("Please describe the issue in at least 10 characters.");
      return;
    }
    setSubmittingDispute(true);
    try {
      const res = await fetchBackend("disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          category: disputeCategory,
          description: disputeDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDisputeError(data.error || "Failed to submit dispute.");
        return;
      }
      const created = data.dispute;
      if (disputeFiles.length > 0 && created?.id) {
        const fd = new FormData();
        disputeFiles.slice(0, 3).forEach((f) => fd.append("files", f));
        await fetchBackend(`disputes/${created.id}/evidence`, { method: "POST", body: fd }).catch(() => {});
      }
      setOrderDispute(created);
      setDisputeDescription("");
      setDisputeFiles([]);
      setShowDisputeModal(false);
    } catch {
      setDisputeError("Network error while submitting dispute.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleSubmitDisputeInfo = async () => {
    if (!orderDispute || disputeInfoNote.trim().length < 3) return;
    try {
      const res = await fetchBackend(`disputes/${orderDispute.id}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: disputeInfoNote.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDisputeInfoNote("");
        alert("Additional information submitted to admin.");
      } else {
        alert(data.error || "Failed to submit info.");
      }
    } catch {
      alert("Network error.");
    }
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
  const isUserAdmin = user?.role === "admin";

  // Polling for new messages and status updates while modal is open
  useEffect(() => {
    if (!selectedOrder) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/messages`);
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          const nextMessages = data.messages as EscrowMessage[];
          setOrderMessages((current) =>
            current.length === nextMessages.length &&
            current.every((message, index) => message.id === nextMessages[index]?.id)
              ? current
              : nextMessages
          );
        }
        // Also refresh deliveries if digital
        if (selectedOrder.listingType === "ebooks-digital") {
          const delivRes = await fetchBackend(`escrow/orders/${selectedOrder.id}/deliveries`);
          const delivData = await delivRes.json();
          if (delivData.success && Array.isArray(delivData.deliveries)) {
            setOrderDeliveries(delivData.deliveries);
          }
        }
        // Also refresh order state
        const orderRes = await fetchBackend(`escrow/orders?userId=${user?.id}`);
        const orderData = await orderRes.json();
        if (orderData.success && Array.isArray(orderData.orders)) {
          const updated = orderData.orders.find((o: any) => o.id === selectedOrder.id);
          if (updated) {
            setSelectedOrder((prev) => (prev ? {
              ...prev,
              buyerConfirmed: !!updated.buyer_confirmed,
              sellerConfirmed: !!updated.seller_confirmed,
              isClosed: !!updated.is_closed,
              closedAt: updated.closed_at || null,
              closedBy: updated.closed_by ? Number(updated.closed_by) : null,
              status: updated.status,
            } : null));
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedOrder?.id, user?.id]);

  // Poll participants online status every 30 seconds while order chat is open
  useEffect(() => {
    if (!selectedOrder) return;
    const fetchStatus = async () => {
      try {
        const res = await fetchBackend(`escrow/orders/${selectedOrder.id}/participants-status`);
        const data = await res.json();
        if (data.success) {
          setParticipantsStatus({ buyer: data.buyer, seller: data.seller, admin: data.admin });
        }
      } catch {}
    };
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [selectedOrder?.id]);

  // Resolve attachment URL through backend server
  const resolveUrl = (url: string | null) => {
    if (!url) return "";
    return resolveImageUrl(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-20">
      <header className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-[radial-gradient(ellipse_at_80%_10%,rgba(245,158,11,0.22),transparent_38%),linear-gradient(110deg,#111722,#0b1422_55%,#332509)] px-6 py-7 sm:px-9 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-20 size-64 rounded-full border border-amber-300/10" />
        <div className="pointer-events-none absolute -right-2 -top-14 size-52 rounded-full border border-amber-300/10" />
        <div className="relative flex items-center gap-5">
          <div className="relative grid size-16 shrink-0 place-items-center text-amber-300 sm:size-20">
            <div className="absolute inset-2 rotate-[-18deg] rounded-full border border-amber-300/30" />
            <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-md" />
            <Mail className="relative drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]" size={42} strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Inb<span className="text-amber-400">ox</span>
            </h1>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">Manage your messages and escrow transactions</p>
          </div>
        </div>
      </header>

      <nav aria-label="Inbox sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0c1017]/80 p-2">
        {([
          { id: "messages", label: "All Messages", icon: MessageSquare },
          { id: "escrow", label: "Escrow Orders", icon: Scale },
          { id: "disputes", label: "Disputes", icon: ShieldCheck },
          { id: "notifications", label: "Notifications", icon: Bell },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setInboxSection(id)}
            aria-current={inboxSection === id ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              inboxSection === id
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Icon size={16} />
            {label}
            {id === "escrow" && orders.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${inboxSection === id ? "bg-black/10" : "bg-white/[0.08]"}`}>
                {orders.length}
              </span>
            )}
            {id === "disputes" && inboxDisputes.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${inboxSection === id ? "bg-black/10" : "bg-white/[0.08]"}`}>
                {inboxDisputes.length}
              </span>
            )}
            {id === "notifications" && notificationUnreadCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${inboxSection === id ? "bg-black/10" : "bg-white/[0.08]"}`}>
                {notificationUnreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {inboxSection === "messages" && <SupportChatPanel isAdmin={user?.role === "admin"} />}

      {inboxSection === "disputes" && (
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0c1017]/75 p-4 sm:p-6">
          <div>
            <h2 className="text-sm font-bold text-white">Disputes</h2>
            <p className="mt-1 text-xs text-slate-400">Review your escrow dispute history and open its trade chat.</p>
          </div>
          {sectionError && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300">{sectionError}</p>}
          {sectionLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading disputes...</p>
          ) : inboxDisputes.length > 0 ? (
            <div className="space-y-2">
              {inboxDisputes.map((dispute) => (
                <article key={dispute.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#111722] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">
                      Order #{dispute.order_id} <span className="font-normal text-slate-400">· {dispute.channel_name}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{dispute.description}</p>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {dispute.category.replaceAll("_", " ")} · {dispute.status.replaceAll("_", " ")} · {new Date(dispute.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!orders.some((order) => order.id === Number(dispute.order_id))}
                    onClick={() => {
                      const order = orders.find((item) => item.id === Number(dispute.order_id));
                      if (order) void openOrderChat(order);
                    }}
                    className="shrink-0 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Open trade chat
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No disputes found.</p>
          )}
        </section>
      )}

      {inboxSection === "notifications" && (
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0c1017]/75 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">Notifications</h2>
              <p className="mt-1 text-xs text-slate-400">Updates about your account and marketplace activity.</p>
            </div>
            <Link href="/notifications" className="text-xs font-semibold text-amber-300 hover:text-amber-200">View all notifications</Link>
          </div>
          {sectionError && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300">{sectionError}</p>}
          {sectionLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading notifications...</p>
          ) : inboxNotifications.length > 0 ? (
            <div className="space-y-2">
              {inboxNotifications.map((notification) => (
                <article key={notification.id} className={`flex items-start gap-3 rounded-xl border p-4 ${
                  notification.is_read ? "border-white/[0.06] bg-[#111722]" : "border-amber-400/25 bg-amber-400/[0.06]"
                }`}>
                  <Bell size={16} className={`mt-0.5 shrink-0 ${notification.is_read ? "text-slate-500" : "text-amber-300"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">{notification.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{notification.message}</p>
                    <p className="mt-2 text-[10px] text-slate-500">{new Date(notification.created_at).toLocaleString()}</p>
                    <div className="mt-3 flex gap-4">
                      <Link
                        href={notification.action_url || "/inbox"}
                        onClick={() => void markInboxNotificationRead(notification.id)}
                        className="text-[11px] font-semibold text-amber-300 hover:text-amber-200"
                      >
                        {notification.action_label || "View details"}
                      </Link>
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() => void markInboxNotificationRead(notification.id)}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">You’re all caught up. No notifications to show.</p>
          )}
        </section>
      )}

      {inboxSection === "escrow" && (
      <div className="space-y-4">
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
                  ? tab === "processing"
                    ? "bg-[#00A3FF] text-white font-bold shadow-md shadow-[#00A3FF]/25"
                    : tab === "success"
                    ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25"
                    : "bg-red-600 text-white font-bold shadow-md shadow-red-600/25"
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
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                          order.status === "cancelled"
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : order.status === "success" || order.isClosed
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {order.status === "cancelled" ? "Cancelled" : order.status === "success" || order.isClosed ? "Completed" : "Processing"}
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
      </div>
      )}

      {/* ===== Escrow 3-Way Chat Modal ===== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-2 sm:p-4 md:p-6 backdrop-blur-md">
          <div className="my-auto flex h-[calc(100dvh-3rem)] max-h-[760px] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1017] shadow-2xl shadow-black/80 sm:h-[88vh] sm:min-h-[480px]">

            {/* ── Compact Unified Header ── */}
            <div className="shrink-0 bg-[#111722] border-b border-white/[0.08]">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 px-2 py-1 shrink-0">
                    <ShieldCheck size={14} className="text-amber-400" />
                    <span className="font-mono text-xs font-bold text-amber-300">Trade #{selectedOrder.id}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate flex items-center gap-2">
                      <span>{selectedOrder.channelName}</span>
                      <span className="text-[10px] font-semibold text-slate-400 capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{selectedOrder.platform}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-amber-300">{selectedOrder.price}</span>
                      <span className="text-slate-600">&bull;</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        selectedOrder.status === "cancelled"
                          ? "text-red-400"
                          : selectedOrder.status === "success" || selectedOrder.isClosed
                          ? "text-emerald-400"
                          : "text-blue-400"
                      }`}>
                        {selectedOrder.isClosed ? "CLOSED" : selectedOrder.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!selectedOrder.isClosed &&
                    selectedOrder.status === "processing" &&
                    (isBuyer(selectedOrder) || isSeller(selectedOrder)) &&
                    !orderDispute && (
                      <button
                        type="button"
                        onClick={() => setShowDisputeModal(true)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20 transition"
                      >
                        Report Dispute
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="shrink-0 grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition"
                    title="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status and 3-Way Participants row with real online/last-seen indicators */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] bg-[#0c1017]/80 px-4 py-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-teal-300/90 font-medium">
                  {selectedOrder.isClosed ? (
                    <>
                      <Lock size={12} className="text-slate-400 shrink-0" />
                      <span className="text-slate-400">Trade closed &bull; Use Chat with Admin for assistance</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={13} className="text-teal-400 shrink-0" />
                      <span>Funds held in escrow &bull; Admin supervises</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Buyer pill with online dot */}
                  <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    selectedOrder.buyerConfirmed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20"
                  }`} title={participantsStatus?.buyer?.label ?? "Buyer"}>
                    <span className={`size-1.5 rounded-full ${participantsStatus?.buyer?.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                    <span>Buyer</span>
                    {participantsStatus?.buyer && !participantsStatus.buyer.isOnline && (
                      <span className="font-normal text-slate-500 ml-0.5">{participantsStatus.buyer.label.replace("Last seen ", "")}</span>
                    )}
                    {selectedOrder.buyerConfirmed && <CheckCircle2 size={10} className="text-emerald-400 ml-0.5" />}
                  </div>
                  {/* Seller pill with online dot */}
                  <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    selectedOrder.sellerConfirmed ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20"
                  }`} title={participantsStatus?.seller?.label ?? "Seller"}>
                    <span className={`size-1.5 rounded-full ${participantsStatus?.seller?.isOnline ? "bg-cyan-400 animate-pulse" : "bg-slate-500"}`} />
                    <span>Seller</span>
                    {participantsStatus?.seller && !participantsStatus.seller.isOnline && (
                      <span className="font-normal text-slate-500 ml-0.5">{participantsStatus.seller.label.replace("Last seen ", "")}</span>
                    )}
                    {selectedOrder.sellerConfirmed && <CheckCircle2 size={10} className="text-cyan-400 ml-0.5" />}
                  </div>
                  {/* Admin pill with online dot */}
                  <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    title={participantsStatus?.admin?.label ?? "Admin"}>
                    <span className={`size-1.5 rounded-full ${participantsStatus?.admin?.isOnline ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
                    <span>Admin</span>
                    {participantsStatus?.admin && !participantsStatus.admin.isOnline && (
                      <span className="font-normal text-slate-500 ml-0.5">{participantsStatus.admin.label.replace("Last seen ", "")}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 11: Active/Resolved Dispute Status Banner */}
            {orderDispute && (
              <div className="shrink-0 border-b border-rose-500/25 bg-rose-950/25 px-4 py-2 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-rose-300">
                    Dispute #{orderDispute.id} &bull; Status: {String(orderDispute.status).replace(/_/g, " ").toUpperCase()}
                  </span>
                  {orderDispute.resolution_summary && (
                    <span className="text-slate-300 truncate max-w-[260px]" title={orderDispute.resolution_summary}>
                      Outcome: {orderDispute.resolution_summary}
                    </span>
                  )}
                </div>
                {["open", "under_review", "awaiting_information"].includes(orderDispute.status) &&
                  (isBuyer(selectedOrder) || isSeller(selectedOrder)) && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={disputeInfoNote}
                        onChange={(e) => setDisputeInfoNote(e.target.value)}
                        placeholder="Submit additional info for admin review..."
                        className="flex-1 rounded-lg border border-white/10 bg-[#0c1017] px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                      />
                      <button
                        type="button"
                        onClick={handleSubmitDisputeInfo}
                        className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 transition"
                      >
                        Send Info
                      </button>
                    </div>
                  )}
              </div>
            )}

            {/* ── Action banners (compact, high-contrast) ── */}

            {/* Buyer: needs to confirm */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isBuyer(selectedOrder) && !selectedOrder.buyerConfirmed && (
              <div className="shrink-0 flex items-center justify-between gap-3 border-b border-emerald-500/30 bg-emerald-950/40 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <p className="text-[11px] text-slate-200">
                    <span className="font-bold text-emerald-400">Admin instruction: </span>
                    {selectedOrder.listingType === "ebooks-digital"
                      ? "Download and review the delivered files below, then click Confirm Receipt of Files."
                      : "If you have received channel ownership and verified everything, click Mark as Complete."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={confirmingCompletion}
                  onClick={handleBuyerConfirm}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 active:scale-95 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
                >
                  <CheckCircle2 size={13} className="text-slate-950" />
                  <span>{confirmingCompletion ? "Confirming..." : selectedOrder.listingType === "ebooks-digital" ? "Confirm Receipt of Files" : "Mark as Complete"}</span>
                </button>
              </div>
            )}

            {/* Buyer: already confirmed */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isBuyer(selectedOrder) && selectedOrder.buyerConfirmed && (
              <div className="shrink-0 flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-950/20 px-4 py-2 text-[11px] text-emerald-400">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>
                  You have confirmed receipt.{" "}
                  {selectedOrder.sellerConfirmed
                    ? "Seller also confirmed ✓ — Waiting for admin to finalize."
                    : "Waiting for seller confirmation..."}
                </span>
              </div>
            )}

            {/* Seller confirmation banner */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isSeller(selectedOrder) && !selectedOrder.sellerConfirmed && (
              <div className="shrink-0 flex items-center justify-between gap-3 border-b border-cyan-500/30 bg-cyan-950/40 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                  <p className="text-[11px] text-slate-200">
                    <span className="font-bold text-cyan-400">Seller instruction: </span>
                    {selectedOrder.listingType === "ebooks-digital"
                      ? "Delivered all digital product files to buyer? Click Confirm Delivery."
                      : "Transferred credentials and ownership to buyer? Click Confirm Transfer."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={confirmingCompletion}
                  onClick={handleSellerConfirm}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 active:scale-95 disabled:opacity-60 transition shadow-md shadow-cyan-500/20"
                >
                  <CheckCircle2 size={13} className="text-slate-950" />
                  <span>{confirmingCompletion ? "Confirming..." : selectedOrder.listingType === "ebooks-digital" ? "Confirm Delivery" : "Confirm Transfer"}</span>
                </button>
              </div>
            )}

            {/* Seller already confirmed */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isSeller(selectedOrder) && selectedOrder.sellerConfirmed && (
              <div className="shrink-0 flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-950/20 px-4 py-2 text-[11px] text-emerald-400">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>
                  {selectedOrder.listingType === "ebooks-digital" ? "You confirmed delivery. " : "You confirmed transfer. "}
                  {selectedOrder.buyerConfirmed
                    ? "Buyer confirmed ✓ — Admin will finalize."
                    : "Waiting for buyer to verify..."}
                </span>
              </div>
            )}

            {/* Both confirmed */}
            {!selectedOrder.isClosed && selectedOrder.buyerConfirmed && selectedOrder.sellerConfirmed && (
              <div className="shrink-0 flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-300 font-semibold">
                <Sparkles size={13} className="text-amber-400 shrink-0" />
                <span>Both parties confirmed! Admin will finalize and release payment.</span>
              </div>
            )}

            {/* Feature 10: Awaiting Admin Closure banner (non-admin view) */}
            {!selectedOrder.isClosed && selectedOrder.buyerConfirmed && selectedOrder.sellerConfirmed && !isUserAdmin && (
              <div className="shrink-0 flex items-center gap-2 border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-[11px] text-amber-200">
                <Lock size={12} className="text-amber-400 shrink-0" />
                <span>Awaiting Admin Closure — both parties have confirmed. The admin will review and finalize this trade.</span>
              </div>
            )}

            {/* Feature 10: Admin close button — shown only to admin when both confirmed */}
            {!selectedOrder.isClosed && selectedOrder.buyerConfirmed && selectedOrder.sellerConfirmed && isUserAdmin && (
              <div className="shrink-0 flex items-center justify-between gap-3 border-b border-rose-500/30 bg-rose-950/30 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck size={14} className="text-rose-400 shrink-0" />
                  <p className="text-[11px] text-slate-200">
                    <span className="font-bold text-rose-400">Admin Action: </span>
                    Both buyer and seller have confirmed. You may now close this trade conversation and release funds.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={closingChat}
                  onClick={() => setShowAdminCloseConfirm(true)}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-400 active:scale-95 disabled:opacity-60 transition shadow-md shadow-rose-500/20"
                >
                  <Lock size={12} />
                  <span>{closingChat ? "Closing..." : "Close Trade"}</span>
                </button>
              </div>
            )}

            {/* Digital Product: Seller File Delivery Upload Interface (Feature 8) */}
            {!selectedOrder.isClosed && selectedOrder.status === "processing" && isSeller(selectedOrder) && selectedOrder.listingType === "ebooks-digital" && (
              <div className="shrink-0 border-b border-amber-500/30 bg-[#0d131f] p-3 sm:px-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="size-4 text-[#D4AF37] shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">Seller File Delivery</span>
                      <span className="text-[11px] text-slate-400">
                        Upload digital product files to deliver them securely to the buyer in this trade.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliveryPanelOpen((prev) => !prev)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/20 transition"
                  >
                    <Upload size={13} />
                    <span>{deliveryPanelOpen ? "Close Delivery Form" : "Deliver Files"}</span>
                  </button>
                </div>

                {deliveryPanelOpen && (
                  <div className="pt-2 border-t border-white/5 space-y-3">
                    <input
                      ref={deliveryInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleDeliveryFilesSelected}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={deliveringFiles || selectedDeliveryFiles.length >= 5}
                        onClick={() => deliveryInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-400 hover:text-white transition disabled:opacity-50"
                      >
                        <Upload size={13} className="text-amber-400" />
                        <span>Select Files ({selectedDeliveryFiles.length}/5)</span>
                      </button>
                      <span className="text-[10px] text-slate-500">
                        PDF, EPUB, ZIP, DOCX, etc. (max 5 files, 50MB each)
                      </span>
                    </div>

                    {selectedDeliveryFiles.length > 0 && (
                      <div className="space-y-1.5 rounded-xl border border-white/5 bg-[#121722] p-2.5">
                        {selectedDeliveryFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg bg-white/[0.02]">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={13} className="text-amber-400 shrink-0" />
                              <span className="font-medium text-slate-200 truncate">{file.name}</span>
                              <span className="text-[10px] text-slate-500 shrink-0">({formatBytes(file.size)})</span>
                            </div>
                            <button
                              type="button"
                              disabled={deliveringFiles}
                              onClick={() => handleRemoveDeliveryFile(idx)}
                              className="text-slate-500 hover:text-rose-400 transition shrink-0"
                              title="Remove"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <input
                        type="text"
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        disabled={deliveringFiles}
                        placeholder="Optional delivery note or instructions for the buyer..."
                        className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                        maxLength={500}
                      />
                    </div>

                    {deliveryError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{deliveryError}</span>
                      </div>
                    )}
                    {deliverySuccess && (
                      <div className="flex items-center gap-1.5 text-xs text-teal-300 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>{deliverySuccess}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={deliveringFiles}
                        onClick={() => {
                          setSelectedDeliveryFiles([]);
                          setDeliveryNote("");
                          setDeliveryError(null);
                          setDeliveryPanelOpen(false);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={deliveringFiles || selectedDeliveryFiles.length === 0}
                        onClick={handleSubmitDelivery}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-95 disabled:opacity-50 transition shadow-md shadow-amber-950/30"
                      >
                        <PackageCheck size={13} />
                        <span>{deliveringFiles ? "Uploading & Delivering..." : `Deliver ${selectedDeliveryFiles.length} File(s)`}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delivered Files Summary for Digital Product Trades */}
            {selectedOrder.listingType === "ebooks-digital" && orderDeliveries.length > 0 && (
              <div className="shrink-0 border-b border-teal-500/20 bg-teal-950/20 px-4 py-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                    <PackageCheck size={14} className="text-teal-400" />
                    <span>Delivered Files ({orderDeliveries.reduce((sum, d) => sum + d.files.length, 0)} total)</span>
                  </span>
                  <span className="text-[10px] text-teal-400/80 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full font-semibold">
                    {isBuyer(selectedOrder) ? "Download & Review Before Confirming" : "Delivered • Awaiting Buyer Verification"}
                  </span>
                </div>

                <div className="space-y-1">
                  {orderDeliveries.map((delivery) => (
                    <div key={delivery.id} className="space-y-1">
                      {delivery.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-black/20 border border-white/5 px-2.5 py-1 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={12} className="text-[#D4AF37] shrink-0" />
                            <span className="text-slate-200 font-medium truncate">{file.original_filename}</span>
                            <span className="text-[10px] text-slate-500 shrink-0">({formatBytes(file.file_size_bytes)})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {file.file_format}
                            </span>
                            {isBuyer(selectedOrder) && delivery.status === "delivered" && (
                              <button
                                type="button"
                                disabled={downloadingFileId === file.id}
                                onClick={() => handleDownloadFile(selectedOrder.id, file.id, file.original_filename)}
                                title={`Download ${file.original_filename}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/30 active:scale-95 disabled:opacity-50 transition"
                              >
                                {downloadingFileId === file.id ? (
                                  <span className="animate-pulse">↓ Downloading…</span>
                                ) : (
                                  <><Download size={10} /><span>Download</span></>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Download error display */}
                {isBuyer(selectedOrder) && downloadError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg mt-1">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{downloadError}</span>
                    <button type="button" onClick={() => setDownloadError(null)} className="ml-auto text-rose-400/60 hover:text-rose-300">
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Digital Order Waiting Banner for Buyer */}
            {selectedOrder.listingType === "ebooks-digital" && orderDeliveries.length === 0 && isBuyer(selectedOrder) && (
              <div className="shrink-0 border-b border-white/[0.05] bg-[#0c1017]/60 px-4 py-2 text-[11px] text-slate-400 flex items-center gap-2">
                <PackageCheck size={13} className="text-[#D4AF37]" />
                <span>Waiting for seller to deliver the digital product files in this trade...</span>
              </div>
            )}

            {/* Messages area */}
            <div ref={orderMessagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-slate-500 animate-pulse">Loading trade messages...</p>
                </div>
              ) : orderMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <MessageSquare size={28} className="text-slate-700" />
                  <p className="text-xs text-slate-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                orderMessages.map((msg) => {
                  const isMine = msg.sender_name === user?.name;
                  const isBot  = msg.sender_role === "admin" && msg.sender_name?.toLowerCase().includes("bot");
                  const isAdminMsg = msg.sender_role === "admin" && !isBot;

                  /* ── Bot / System message ── */
                  if (isBot) {
                    return (
                      <div key={msg.id} className="flex justify-center px-2">
                        <div className="flex items-start gap-2 max-w-[90%] rounded-xl bg-[#111722] border border-amber-500/20 px-3 py-2.5 text-[11px] text-amber-200/80">
                          <ShieldCheck size={14} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[9px] font-bold text-amber-400 mb-0.5">{msg.sender_name}</span>
                            <p className="leading-relaxed">{msg.message}</p>
                            <span className="block text-right text-[9px] text-amber-400/50 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* ── Admin mediator message ── */
                  if (isAdminMsg) {
                    return (
                      <div key={msg.id} className="flex justify-start gap-2">
                        <div className="size-7 shrink-0 rounded-full bg-amber-400/10 border border-amber-400/30 grid place-items-center">
                          <ShieldCheck size={13} className="text-amber-400" />
                        </div>
                        <div className="max-w-[80%]">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-bold text-amber-400">Admin Mediator</span>
                            <span className="text-[9px] text-slate-600">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="rounded-2xl rounded-tl-none bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-100 leading-relaxed">
                            {msg.message_type === "image" && msg.attachment_url ? (
                              <img src={resolveUrl(msg.attachment_url)} alt="Shared" className="max-w-full rounded-lg max-h-48 object-contain cursor-pointer border border-amber-500/20" onClick={() => window.open(resolveUrl(msg.attachment_url), "_blank")} />
                            ) : msg.message_type === "voice" && msg.attachment_url ? (
                              <audio controls src={resolveUrl(msg.attachment_url)} className="w-full h-8 rounded mt-1" />
                            ) : (
                              <p>{msg.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* ── My own message ── */
                  if (isMine) {
                    return (
                      <div key={msg.id} className="flex justify-end gap-2">
                        <div className="max-w-[78%]">
                          <div className="flex items-center justify-end gap-1.5 mb-1">
                            <span className="text-[9px] text-slate-600">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-[9px] font-bold text-teal-400">You ({msg.sender_role})</span>
                          </div>
                          <div className="rounded-2xl rounded-tr-none bg-teal-500 px-3 py-2 text-xs text-slate-950 font-medium leading-relaxed shadow-md shadow-teal-500/20">
                            {msg.message_type === "image" && msg.attachment_url ? (
                              <img src={resolveUrl(msg.attachment_url)} alt="Shared" className="max-w-full rounded-lg max-h-48 object-contain cursor-pointer" onClick={() => window.open(resolveUrl(msg.attachment_url), "_blank")} />
                            ) : msg.message_type === "voice" && msg.attachment_url ? (
                              <audio controls src={resolveUrl(msg.attachment_url)} className="w-full h-8 rounded mt-1" />
                            ) : (
                              <p>{msg.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="size-7 shrink-0 rounded-full bg-teal-500/20 border border-teal-500/30 grid place-items-center text-[9px] font-bold text-teal-400 uppercase">
                          {user?.name?.charAt(0) ?? "U"}
                        </div>
                      </div>
                    );
                  }

                  /* ── Other party: buyer on LEFT, seller on RIGHT ── */
                  const isSel = msg.sender_role === "seller";
                  const isSellerSide = isSel; // seller messages go RIGHT
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isSellerSide ? "justify-end" : "justify-start"}`}>
                      {/* Avatar on the left for buyer messages */}
                      {!isSellerSide && (
                        <div className="size-7 shrink-0 rounded-full grid place-items-center text-[9px] font-bold uppercase bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                          {msg.sender_name?.charAt(0) ?? "?"}
                        </div>
                      )}
                      <div className="max-w-[78%]">
                        <div className={`flex items-center gap-1.5 mb-1 ${isSellerSide ? "justify-end" : ""}`}>
                          {!isSellerSide && (
                            <span className="text-[9px] font-bold text-emerald-400">
                              {msg.sender_name} <span className="font-normal text-slate-500">(buyer)</span>
                            </span>
                          )}
                          <span className="text-[9px] text-slate-600">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isSellerSide && (
                            <span className="text-[9px] font-bold text-cyan-400">
                              {msg.sender_name} <span className="font-normal text-slate-500">(seller)</span>
                            </span>
                          )}
                        </div>
                        <div className={`px-3 py-2 text-xs leading-relaxed shadow-md ${
                          isSellerSide
                            ? "rounded-2xl rounded-tr-none bg-cyan-500/10 border border-cyan-500/20 text-cyan-100"
                            : "rounded-2xl rounded-tl-none bg-[#18212f] border border-white/[0.08] text-slate-200"
                        }`}>
                          {msg.message_type === "image" && msg.attachment_url ? (
                            <img src={resolveUrl(msg.attachment_url)} alt="Shared" className="max-w-full rounded-lg max-h-48 object-contain cursor-pointer border border-white/10" onClick={() => window.open(resolveUrl(msg.attachment_url), "_blank")} />
                          ) : msg.message_type === "voice" && msg.attachment_url ? (
                            <audio controls src={resolveUrl(msg.attachment_url)} className="w-full h-8 rounded mt-1" />
                          ) : (
                            <p>{msg.message}</p>
                          )}
                        </div>
                      </div>
                      {/* Avatar on the right for seller messages */}
                      {isSellerSide && (
                        <div className="size-7 shrink-0 rounded-full grid place-items-center text-[9px] font-bold uppercase bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                          {msg.sender_name?.charAt(0) ?? "?"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Bottom input bar ── */}
            {selectedOrder.isClosed ? (
              <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 border-t border-white/[0.08] bg-[#0c1017] p-3 text-xs text-slate-400">
                <div className="flex items-center gap-2 font-semibold text-slate-300">
                  <Lock size={13} className="text-slate-400" />
                  <span>Conversation Closed by Admin &bull; Read-Only</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {selectedOrder.closedAt
                    ? `Closed on ${new Date(selectedOrder.closedAt).toLocaleString()} • `
                    : ""}
                  Use Chat with Admin for support
                </span>
              </div>
            ) : (
              <div className="shrink-0 border-t border-white/[0.08] bg-[#111722] p-3 sm:px-4 sm:py-3">
                {uploadingFile && (
                  <p className="mb-2 text-center text-[10px] font-semibold text-teal-400 animate-pulse">Uploading attachment...</p>
                )}
                {isRecording && (
                  <div className="mb-2 flex items-center justify-center gap-2 text-[11px] font-bold text-rose-400 animate-pulse">
                    <span className="size-2 rounded-full bg-rose-500" />
                    <span>Recording voice note... click stop when done</span>
                  </div>
                )}
                <form onSubmit={handleSendText} className="flex items-center gap-2">
                  {/* hidden file input */}
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  {/* image button */}
                  <button
                    type="button"
                    title="Send screenshot or image"
                    disabled={uploadingFile || isRecording}
                    onClick={() => imageInputRef.current?.click()}
                    className="shrink-0 grid size-9 place-items-center rounded-xl border border-white/10 bg-[#0c1017] text-slate-400 hover:border-amber-400/50 hover:text-amber-400 disabled:opacity-40 transition shadow-sm"
                  >
                    <ImageIcon size={16} />
                  </button>

                  {/* mic button */}
                  <button
                    type="button"
                    title={isRecording ? "Stop recording" : "Record voice note"}
                    disabled={uploadingFile}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`shrink-0 grid size-9 place-items-center rounded-xl border transition shadow-sm ${
                      isRecording
                        ? "border-rose-500 bg-rose-500/20 text-rose-400 animate-pulse ring-2 ring-rose-500/30"
                        : "border-white/10 bg-[#0c1017] text-slate-400 hover:border-teal-400/50 hover:text-teal-400"
                    } disabled:opacity-40`}
                  >
                    {isRecording ? <Square size={14} className="fill-rose-400" /> : <Mic size={16} />}
                  </button>

                  {/* digital file delivery button (seller only for digital products) */}
                  {selectedOrder.listingType === "ebooks-digital" && isSeller(selectedOrder) && (
                    <button
                      type="button"
                      title="Deliver Digital Product Files"
                      disabled={uploadingFile || isRecording}
                      onClick={() => setDeliveryPanelOpen((prev) => !prev)}
                      className={`shrink-0 grid size-9 place-items-center rounded-xl border transition shadow-sm ${
                        deliveryPanelOpen
                          ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] ring-1 ring-[#D4AF37]/50"
                          : "border-white/10 bg-[#0c1017] text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10"
                      } disabled:opacity-40`}
                    >
                      <PackageCheck size={16} />
                    </button>
                  )}

                  {/* text input */}
                  <input
                    type="text"
                    value={orderChatInput}
                    onChange={(e) => setOrderChatInput(e.target.value)}
                    disabled={isRecording || uploadingFile}
                    placeholder="Type message to buyer, seller & admin..."
                    className="flex-1 min-w-0 rounded-xl border border-white/10 bg-[#0c1017] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none transition"
                  />

                  {/* send button */}
                  <button
                    type="submit"
                    disabled={!orderChatInput.trim() || sendingMessage || isRecording || uploadingFile}
                    className="shrink-0 grid size-9 place-items-center rounded-xl bg-teal-500 text-slate-950 font-bold shadow-md hover:bg-teal-400 active:scale-95 disabled:opacity-30 transition"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Feature 11: Submit Dispute Modal ===== */}
      {showDisputeModal && selectedOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/90 p-2 backdrop-blur-md sm:p-4">
          <form onSubmit={handleSubmitDispute} className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-rose-500/30 bg-[#0c1017] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Submit Order Dispute</h3>
                <p className="text-[11px] text-slate-400">Trade #{selectedOrder.id} — {selectedOrder.channelName}</p>
              </div>
              <button type="button" onClick={() => setShowDisputeModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">Category</label>
              <select
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#111722] px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              >
                <option value="non_delivery">Non-delivery / Missing files or credentials</option>
                <option value="file_corrupted_or_mismatch">Corrupted file or product mismatch</option>
                <option value="unauthorized_access">Unauthorized access / security concern</option>
                <option value="payment_issue">Payment / escrow discrepancy</option>
                <option value="communication_issue">Unresponsive counterparty</option>
                <option value="other">Other issue</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">Description</label>
              <textarea
                rows={4}
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Describe the issue clearly for admin review (min 10 characters)..."
                maxLength={2000}
                className="w-full rounded-xl border border-white/10 bg-[#111722] px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">Optional Evidence (up to 3 files: PNG, JPG, PDF, TXT, ZIP)</label>
              <input
                type="file"
                multiple
                onChange={(e) => setDisputeFiles(Array.from(e.target.files || []).slice(0, 3))}
                className="w-full text-[11px] text-slate-400"
              />
            </div>
            {disputeError && <p className="text-xs text-rose-400">{disputeError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingDispute}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-60 transition"
              >
                {submittingDispute ? "Submitting..." : "Submit Dispute"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Feature 10: Admin Trade Closure Confirmation Modal ===== */}
      {showAdminCloseConfirm && selectedOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/90 p-2 backdrop-blur-md sm:p-4">
          <div className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl border border-rose-500/30 bg-[#0c1017] p-4 shadow-2xl shadow-black/80 sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                <Lock size={20} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Close Escrow Trade</h3>
                <p className="text-[11px] text-slate-400">Trade #{selectedOrder.id} — {selectedOrder.channelName}</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-[11px] text-amber-200/80 leading-relaxed space-y-1">
              <p><span className="font-bold text-amber-300">⚠ Confirm closure:</span></p>
              <p>Both buyer and seller have confirmed this trade. Closing will:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-100/70">
                <li>Mark the conversation as <strong>closed</strong> (buyer/seller messaging disabled)</li>
                <li>Release funds of <strong>{selectedOrder.price}</strong> to the seller</li>
                <li>Send closure notifications to buyer and seller</li>
                <li>Preserve all existing message history</li>
              </ul>
              <p className="font-semibold text-rose-300 mt-1">This action is irreversible and will be logged with your admin ID.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowAdminCloseConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={closingChat}
                onClick={handleAdminCloseChat}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 active:scale-95 disabled:opacity-60 transition shadow-md shadow-rose-500/20"
              >
                {closingChat ? "Closing…" : "Yes, Close Trade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Feature 9: Digital Receipt Confirmation Modal ===== */}
      {showReceiptConfirm && selectedOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/90 p-2 backdrop-blur-md sm:p-4">
          <div className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl border border-emerald-500/30 bg-[#0c1017] p-4 shadow-2xl shadow-black/80 sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <PackageCheck size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirm Receipt of Files</h3>
                <p className="text-[11px] text-slate-400">Trade #{selectedOrder.id}</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-[11px] text-amber-200/80 leading-relaxed space-y-1">
              <p><span className="font-bold text-amber-300">⚠ Read before confirming:</span></p>
              <p>The seller has delivered files to this trade. Confirm receipt only after you have downloaded and reviewed all files.</p>
              <p className="font-semibold text-amber-300">This action cannot be undone. Once confirmed, funds will be queued for release to the seller after admin finalization.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowReceiptConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel — Not Yet
              </button>
              <button
                type="button"
                disabled={confirmingCompletion}
                onClick={handleDigitalReceiptConfirm}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
              >
                {confirmingCompletion ? "Confirming…" : "Yes, Confirm Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}