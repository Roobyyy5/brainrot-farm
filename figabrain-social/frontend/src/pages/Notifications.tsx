import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { NotificationItem } from "../api/types";
import { useNotificationBadge } from "../context/NotificationBadgeContext";

export function Notifications() {
  const { t } = useTranslation();
  const { clearBadge } = useNotificationBadge();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    api
      .get<{ data: NotificationItem[] }>("/notifications")
      .then((res) => {
        setItems(res.data);
        clearBadge();
        return api.post("/notifications/read-all").catch(() => {});
      })
      .catch(() => {});
  }, [clearBadge]);

  const TYPE_ICON: Record<string, string> = {
    LIKE: "♥",
    COMMENT: "💬",
    FOLLOW: "👤",
    REPOST: "⟲",
    REWARD: "🎁",
    MENTION: "@",
    SYSTEM: "📢",
  };

  function handleClick(n: NotificationItem) {
    if (n.postId) { navigate(`/posts/${n.postId}`); return; }
    if (n.type === "FOLLOW" && n.actor) { navigate(`/u/${n.actor.username}`); return; }
  }

  return (
    <div className="space-y-2 max-w-2xl">
      {items.map((n) => {
        const isClickable = !!n.postId || (n.type === "FOLLOW" && !!n.actor);
        return (
          <div
            key={n.id}
            onClick={() => handleClick(n)}
            className={`glass-panel rounded-xl p-4 flex items-start gap-3 transition-colors
              ${n.isRead ? "opacity-60" : "border-l-2 border-brain-accent/50"}
              ${isClickable ? "cursor-pointer hover:bg-white/5" : ""}
            `}
          >
            <span className="text-xl mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? "•"}</span>
            <div className="flex-1 min-w-0">
              {n.actor && (
                <span className="font-semibold text-sm">{n.actor.displayName} </span>
              )}
              <span className="text-sm text-white/80">{n.message}</span>
              <p className="text-xs text-white/30 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {isClickable && <span className="text-white/20 text-sm shrink-0 mt-0.5">›</span>}
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-white/40 text-sm text-center mt-10">{t("notifications.empty")}</p>
      )}
    </div>
  );
}
