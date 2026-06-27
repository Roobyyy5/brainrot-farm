import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Message } from "../api/types";
import { useAuth } from "../context/AuthContext";

interface ConversationSummary {
  id: string;
  participants: { username: string; displayName: string; avatarUrl: string | null }[];
  lastMessage: { content: string; createdAt: string } | null;
}

export function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function refreshConversations() {
    const res = await api.get<{ data: ConversationSummary[] }>("/messages/conversations");
    setConversations(res.data);
  }

  async function openConversation(conv: ConversationSummary) {
    setActiveConv(conv);
    const res = await api.get<{ data: Message[] }>(`/messages/conversations/${conv.id}/messages`);
    setMessages(res.data);
  }

  function otherParticipants(conv: ConversationSummary) {
    return conv.participants.filter((p) => p.username !== user?.username);
  }

  async function sendMessage() {
    if (!content.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      if (activeConv) {
        // Reply in active conversation
        const others = otherParticipants(activeConv);
        if (!others[0]) return;
        await api.post("/messages/send", { recipientUsername: others[0].username, content: content.trim() });
        const res = await api.get<{ data: Message[] }>(`/messages/conversations/${activeConv.id}/messages`);
        setMessages(res.data);
      } else {
        // New conversation
        if (!recipient.trim()) return;
        await api.post("/messages/send", { recipientUsername: recipient.trim(), content: content.trim() });
        setRecipient("");
        await refreshConversations();
      }
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Conversation list */}
      <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto">
        <button
          onClick={() => setActiveConv(null)}
          className="glass-panel rounded-xl px-4 py-2 text-sm font-semibold text-brain-accent hover:bg-white/5 text-left"
        >
          + New message
        </button>
        {conversations.map((c) => {
          const others = otherParticipants(c);
          const isActive = activeConv?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className={`glass-panel rounded-xl p-3 text-left transition-colors ${isActive ? "bg-white/10 border-brain-accent/30" : "hover:bg-white/5"}`}
            >
              <div className="text-sm font-semibold truncate">
                {others.map((p) => p.displayName).join(", ") || "Conversation"}
              </div>
              <div className="text-xs text-white/30 truncate">
                {others.map((p) => `@${p.username}`).join(", ")}
              </div>
              {c.lastMessage && (
                <div className="text-xs text-white/40 mt-1 truncate">{c.lastMessage.content}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <button onClick={() => setActiveConv(null)} className="text-white/40 hover:text-white text-sm mr-1">←</button>
              <span className="font-semibold text-sm">
                {otherParticipants(activeConv).map((p) => p.displayName).join(", ")}
              </span>
              <span className="text-xs text-white/30">
                {otherParticipants(activeConv).map((p) => `@${p.username}`).join(", ")}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-brain-accent/20 text-white" : "bg-white/10 text-white/90"}`}>
                      <p className="leading-relaxed">{m.content}</p>
                      <p className="text-xs text-white/30 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <p className="text-white/30 text-sm text-center mt-10">No messages yet. Say hello!</p>}
              <div ref={bottomRef} />
            </div>
          </>
        ) : (
          <div className="p-4 border-b border-white/5">
            <p className="text-sm text-white/50 mb-2">To:</p>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="@username"
              className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-white/5 flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message..."
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
        {error && <p className="text-red-400 text-xs px-4 pb-2">{error}</p>}
      </div>
    </div>
  );
}
