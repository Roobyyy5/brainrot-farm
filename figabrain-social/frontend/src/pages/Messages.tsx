import { useEffect, useState } from "react";
import { api } from "../api/client";

interface ConversationSummary {
  id: string;
  participants: { username: string; displayName: string; avatarUrl: string | null }[];
  lastMessage: { content: string; createdAt: string } | null;
}

export function Messages() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    api.get<{ data: ConversationSummary[] }>("/messages/conversations").then((res) => setConversations(res.data));
  }, []);

  async function sendMessage() {
    if (!recipient.trim() || !content.trim()) return;
    await api.post("/messages/send", { recipientUsername: recipient.trim(), content: content.trim() });
    setContent("");
    const res = await api.get<{ data: ConversationSummary[] }>("/messages/conversations");
    setConversations(res.data);
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4 space-y-2">
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="username"
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message..."
          rows={2}
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none resize-none"
        />
        <button
          onClick={sendMessage}
          className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 py-2 rounded-full"
        >
          Send
        </button>
      </div>

      {conversations.map((c) => (
        <div key={c.id} className="glass-panel rounded-xl p-4">
          <div className="text-sm font-semibold">
            {c.participants.map((p) => `@${p.username}`).join(", ")}
          </div>
          {c.lastMessage && <p className="text-xs text-white/50 mt-1">{c.lastMessage.content}</p>}
        </div>
      ))}
    </div>
  );
}
