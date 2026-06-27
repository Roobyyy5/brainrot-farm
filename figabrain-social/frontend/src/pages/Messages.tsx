import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { Message } from "../api/types";
import { useAuth } from "../context/AuthContext";

interface ConversationSummary {
  id: string;
  participants: { username: string; displayName: string; avatarUrl: string | null }[];
  lastMessage: { content: string; createdAt: string } | null;
}

export function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeConvRef = useRef<ConversationSummary | null>(null);
  const recipientRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    activeConvRef.current = activeConv;
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeConv) return;
    pollRef.current = setInterval(async () => {
      const conv = activeConvRef.current;
      if (!conv) return;
      try {
        const res = await api.get<{ data: Message[] }>(`/messages/conversations/${conv.id}/messages`);
        setMessages((prev) => {
          if (res.data.length !== prev.length || res.data.at(-1)?.id !== prev.at(-1)?.id) {
            return res.data;
          }
          return prev;
        });
      } catch { /* ignore */ }
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv]);

  async function refreshConversations() {
    const res = await api.get<{ data: ConversationSummary[] }>("/messages/conversations");
    setConversations(res.data);
    return res.data;
  }

  const openConversation = useCallback(async (conv: ConversationSummary) => {
    setIsComposing(false);
    setActiveConv(conv);
    const res = await api.get<{ data: Message[] }>(`/messages/conversations/${conv.id}/messages`);
    setMessages(res.data);
  }, []);

  function startCompose() {
    setActiveConv(null);
    setIsComposing(true);
    setRecipient("");
    setContent("");
    setError(null);
    setTimeout(() => recipientRef.current?.focus(), 50);
  }

  function goToList() {
    setActiveConv(null);
    setIsComposing(false);
  }

  function otherParticipants(conv: ConversationSummary) {
    return conv.participants.filter((p) => p.username !== user?.username);
  }

  async function sendMessage() {
    if (!content.trim()) return;
    if (!activeConv && !recipient.trim()) {
      setError(t("messages.recipientRequired", "Enter a recipient username"));
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      if (activeConv) {
        const others = otherParticipants(activeConv);
        if (!others[0]) return;
        await api.post("/messages/send", { recipientUsername: others[0].username, content: content.trim() });
        const res = await api.get<{ data: Message[] }>(`/messages/conversations/${activeConv.id}/messages`);
        setMessages(res.data);
      } else {
        const trimmed = recipient.trim();
        await api.post("/messages/send", { recipientUsername: trimmed, content: content.trim() });
        // Refresh list and auto-open the new conversation
        const updated = await refreshConversations();
        const newConv = updated.find((c) =>
          c.participants.some((p) => p.username === trimmed)
        );
        if (newConv) {
          await openConversation(newConv);
        } else {
          setIsComposing(false);
        }
      }
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  }

  // On mobile: show chat panel only when composing or in a conversation
  const showChatPanel = isComposing || activeConv !== null;

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">

      {/* ── Conversation list ── hidden on mobile when chat is open */}
      <div className={`w-full lg:w-72 lg:shrink-0 flex flex-col gap-2 overflow-y-auto ${showChatPanel ? "hidden lg:flex" : "flex"}`}>
        <button
          onClick={startCompose}
          className="glass-panel rounded-xl px-4 py-2 text-sm font-semibold text-brain-accent hover:bg-brain-accent/10 text-left transition-colors"
        >
          {t("messages.newConversation")}
        </button>
        {conversations.length === 0 && (
          <p className="text-white/30 text-xs text-center py-6">{t("messages.noConversations", "No conversations yet.")}</p>
        )}
        {conversations.map((c) => {
          const others = otherParticipants(c);
          const isActive = activeConv?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className={`glass-panel rounded-xl p-3 text-left transition-colors ${isActive ? "bg-white/10 border border-brain-accent/30" : "hover:bg-white/5"}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-full bg-brain-accent/20 flex items-center justify-center text-xs font-bold shrink-0">
                  {others[0]?.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="font-semibold text-sm truncate">
                  {others.map((p) => p.displayName).join(", ") || "Conversation"}
                </div>
              </div>
              <div className="text-xs text-white/30 truncate pl-9">
                {others.map((p) => `@${p.username}`).join(", ")}
              </div>
              {c.lastMessage && (
                <div className="text-xs text-white/40 mt-1 truncate pl-9">{c.lastMessage.content}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Chat / Compose panel ── hidden on mobile when on list view */}
      <div className={`flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden ${showChatPanel ? "flex" : "hidden lg:flex"}`}>

        {activeConv ? (
          <>
            {/* Conversation header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 shrink-0">
              <button onClick={goToList} className="text-white/40 hover:text-white text-lg mr-1 leading-none">←</button>
              <div className="w-8 h-8 rounded-full bg-brain-accent/20 flex items-center justify-center text-sm font-bold shrink-0">
                {otherParticipants(activeConv)[0]?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">
                  {otherParticipants(activeConv).map((p) => p.displayName).join(", ")}
                </div>
                <div className="text-xs text-white/30 truncate">
                  {otherParticipants(activeConv).map((p) => `@${p.username}`).join(", ")}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-brain-accent/20 text-white" : "bg-white/10 text-white/90"}`}>
                      <p className="leading-relaxed break-words">{m.content}</p>
                      <p className="text-xs text-white/30 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-white/30 text-sm text-center mt-10">{t("messages.noMessages")}</p>
              )}
              <div ref={bottomRef} />
            </div>
          </>
        ) : isComposing ? (
          <>
            {/* Compose header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 shrink-0">
              <button onClick={goToList} className="text-white/40 hover:text-white text-lg leading-none">←</button>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-white/50 shrink-0">{t("messages.to")}</span>
                <input
                  ref={recipientRef}
                  value={recipient}
                  onChange={(e) => { setRecipient(e.target.value); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder={t("messages.usernamePlaceholder")}
                  className="flex-1 bg-black/30 rounded-lg px-3 py-1.5 text-sm outline-none"
                />
              </div>
            </div>
            {/* Empty state */}
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white/20 text-sm">{t("messages.composeHint", "Type a message below to start")}</p>
            </div>
          </>
        ) : (
          /* Desktop empty state — no conversation selected, not composing */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">✉️</div>
              <p className="text-white/30 text-sm">{t("messages.selectOrNew", "Select a conversation or start a new one")}</p>
            </div>
          </div>
        )}

        {/* Input — shown when composing or in a conversation */}
        {(activeConv || isComposing) && (
          <div className="shrink-0 border-t border-white/5">
            {error && <p className="text-red-400 text-xs px-4 pt-2">{error}</p>}
            <div className="p-3 flex gap-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={t("messages.placeholder")}
                rows={1}
                disabled={isSending}
                className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-sm outline-none resize-none disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || !content.trim()}
                className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 rounded-xl disabled:opacity-40 shrink-0"
              >
                {isSending ? "..." : "↑"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
