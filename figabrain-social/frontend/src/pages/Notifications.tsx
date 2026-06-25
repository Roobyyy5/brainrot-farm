import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { NotificationItem } from "../api/types";

export function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    api
      .get<{ data: NotificationItem[] }>("/notifications")
      .then((res) => {
        setItems(res.data);
        // Mark as read only after items are rendered; ignore failures silently
        // since a failed read-all is not critical to the user.
        return api.post("/notifications/read-all").catch(() => {});
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div key={n.id} className={`glass-panel rounded-xl p-4 ${n.isRead ? "opacity-60" : ""}`}>
          <p className="text-sm">{n.message}</p>
          <p className="text-xs text-white/30 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
        </div>
      ))}
      {items.length === 0 && <p className="text-white/40 text-sm text-center mt-10">No notifications yet.</p>}
    </div>
  );
}
