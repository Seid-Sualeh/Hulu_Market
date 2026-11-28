"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search, Send, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchBackend } from "@/lib/api";

interface SupportMessage {
  id: number;
  user_id: number;
  sender_id: number;
  sender_role: "user" | "admin";
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface SupportConversation {
  user_id: number;
  user_name: string;
  email: string;
  last_message: string;
  sender_role: "user" | "admin";
  created_at: string;
  unread_count: number;
}

interface SupportChatPanelProps {
  isAdmin: boolean;
}

export default function SupportChatPanel({ isAdmin }: SupportChatPanelProps) {
  const { user, signedIn, mounted } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(isAdmin);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (showLoading: boolean) => {
    if (!isAdmin) return;
    if (showLoading) setLoadingConversations(true);
    try {
      const response = await fetchBackend("support/conversations");
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.conversations)) {
        throw new Error(data.error || "Could not load support conversations.");
      }
      const rows = data.conversations as SupportConversation[];
      setConversations(rows);
      setSelectedUserId((current) => current ?? rows[0]?.user_id ?? null);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load support conversations.");
    } finally {
      if (showLoading) setLoadingConversations(false);
    }
  }, [isAdmin]);

  const signedInUserId = Number(user?.id);
  const isAuthenticated = mounted && signedIn && Number.isSafeInteger(signedInUserId) && signedInUserId > 0;
  const conversationUserId = isAdmin
    ? selectedUserId
    : isAuthenticated ? signedInUserId : null;

  const loadMessages = useCallback(async (userId: number, showLoading: boolean) => {
    if (!userId) return;
    if (showLoading) setLoadingMessages(true);
    try {
      const query = isAdmin ? `?userId=${userId}` : "";
      const response = await fetchBackend(`support/messages${query}`);
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.messages)) {
        throw new Error(data.error || "Could not load support messages.");
      }
      const nextMessages = data.messages as SupportMessage[];
      setMessages((current) =>
        current.length === nextMessages.length &&
        current.every((item, index) => item.id === nextMessages[index]?.id)
          ? current
          : nextMessages
      );
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load support messages.");
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const initialLoad = window.setTimeout(() => void loadConversations(false), 0);
    const interval = window.setInterval(() => void loadConversations(false), 5000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [isAdmin, loadConversations]);

  useEffect(() => {
    if (!conversationUserId) return;
    const initialLoad = window.setTimeout(() => void loadMessages(conversationUserId, true), 0);
    const interval = window.setInterval(() => void loadMessages(conversationUserId, false), 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [conversationUserId, loadMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const activeConversation = conversations.find((item) => item.user_id === selectedUserId);
  const filteredConversations = conversations.filter((item) =>
    `${item.user_name} ${item.email} ${item.last_message}`.toLowerCase().includes(search.toLowerCase())
  );
  const visibleMessages = isAdmin
    ? messages
    : messages.filter((item) => item.message.toLowerCase().includes(search.toLowerCase()));

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = messageInput.trim();
    if (!message || sending || !conversationUserId) return;

    setSending(true);
    setSendError(null);
    try {
      const response = await fetchBackend("support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(isAdmin ? { userId: conversationUserId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.message) {
        throw new Error(data.error || "Could not send your message.");
      }
      setMessages((current) => [...current, data.message as SupportMessage]);
      setMessageInput("");
      if (isAdmin) void loadConversations(false);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const currentUserId = Number(user?.id);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017]/85 shadow-xl">
      <div className="grid min-h-[440px] md:h-[500px] md:grid-cols-[minmax(240px,0.82fr)_minmax(0,1.55fr)]">
        <aside className="flex min-h-0 flex-col border-b border-white/[0.08] bg-[#0a101a] md:border-b-0 md:border-r">
          <div className="border-b border-white/[0.08] p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare size={16} className="text-amber-400" />
              {isAdmin ? "Customer messages" : "Your messages"}
            </h2>
            <div className="relative mt-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isAdmin ? "Search customers..." : "Search messages..."}
                className="w-full rounded-xl border border-white/[0.08] bg-[#111722] py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50"
                aria-label={isAdmin ? "Search customer conversations" : "Search support messages"}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {isAdmin ? (
              loadingConversations ? (
                <p className="p-4 text-xs text-slate-400">Loading conversations...</p>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.user_id}
                    type="button"
                    onClick={() => setSelectedUserId(conversation.user_id)}
                    className={`mb-1 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      selectedUserId === conversation.user_id
                        ? "border-amber-400/50 bg-amber-400/[0.12]"
                        : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-300">
                      <UserRound size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-white">{conversation.user_name}</span>
                        {Number(conversation.unread_count) > 0 && (
                          <span className="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                            {conversation.unread_count}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-slate-400">{conversation.last_message}</span>
                      <span className="mt-1 block truncate text-[10px] text-slate-500">{conversation.email}</span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-4 text-xs leading-5 text-slate-400">
                  {search ? "No conversations match your search." : "Customer messages will appear here when someone contacts support."}
                </p>
              )
            ) : (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.1] p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-teal-400 text-slate-950">
                    <ShieldCheck size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white">Hulu Market Support</span>
                    <span className="mt-1 block text-[10px] text-slate-400">Admin support</span>
                  </span>
                </div>
                <p className="mt-3 truncate text-[11px] text-slate-400">
                  {messages.at(-1)?.message || "Start a conversation with our support team."}
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-[340px] min-w-0 flex-col bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.06),transparent_38%)] md:min-h-0">
          <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#101722]/80 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-300">
                {isAdmin ? <UserRound size={20} /> : <ShieldCheck size={19} />}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-white">
                  {isAdmin ? activeConversation?.user_name || "Select a conversation" : "Hulu Market Support"}
                </h3>
                <p className="truncate text-[10px] text-slate-400">
                  {isAdmin ? activeConversation?.email || "Customer support inbox" : "Messages are sent directly to our admin team"}
                </p>
              </div>
            </div>
            {!isAdmin && (
              <span className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300">
                Private support chat
              </span>
            )}
          </header>

          {loadError && (
            <div role="alert" className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
              {loadError}
            </div>
          )}

          <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
            {!isAuthenticated && !isAdmin ? (
              <div className="grid h-full place-items-center px-5 text-center">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                    <ShieldCheck size={22} />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-white">Sign in to contact support</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-400">
                    Your support messages are private and connected to your account.
                  </p>
                  <Link
                    href="/auth?redirect=/inbox"
                    className="mt-4 inline-flex rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            ) : !conversationUserId ? (
              <div className="grid h-full place-items-center text-center">
                <p className="max-w-xs text-xs leading-5 text-slate-400">Select a customer conversation to review and reply.</p>
              </div>
            ) : loadingMessages ? (
              <p className="py-8 text-center text-xs text-slate-400">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                    <MessageSquare size={22} />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-white">How can we help?</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                    Send a message here. A member of our admin team will see it and reply in this conversation.
                  </p>
                </div>
              </div>
            ) : visibleMessages.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No messages match your search.</p>
            ) : (
              visibleMessages.map((item) => {
                const isOwnMessage = item.sender_id === currentUserId;
                return (
                  <div key={item.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                      isOwnMessage
                        ? "rounded-tr-sm bg-amber-400 text-slate-950"
                        : "rounded-tl-sm border border-white/[0.08] bg-[#1a2433] text-slate-100"
                    }`}>
                      <p className={`mb-1 text-[9px] font-semibold ${isOwnMessage ? "text-slate-800" : "text-amber-300"}`}>
                        {isOwnMessage ? "You" : isAdmin ? item.sender_name : "Hulu Market Support"}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{item.message}</p>
                      <time className={`mt-1.5 block text-right text-[9px] ${isOwnMessage ? "text-slate-800" : "text-slate-400"}`}>
                        {new Date(item.created_at).toLocaleString()}
                      </time>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {isAuthenticated && (
          <form onSubmit={sendMessage} className="border-t border-white/[0.08] bg-[#0a101a] p-3">
            {sendError && <p role="alert" className="mb-2 px-1 text-xs text-rose-300">{sendError}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                maxLength={2000}
                rows={1}
                placeholder={isAdmin ? "Reply to this customer..." : "Type your message..."}
                aria-label="Support message"
                disabled={!conversationUserId || sending || (isAdmin && !activeConversation)}
                className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-white/[0.08] bg-[#111722] px-3.5 py-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || sending || !conversationUserId || (isAdmin && !activeConversation)}
                aria-label="Send support message"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
            <p className="mt-2 text-[9px] text-slate-500">Enter to send · Shift + Enter for a new line</p>
          </form>
          )}
        </div>
      </div>
    </section>
  );
}
