import { useEffect, useRef } from "react";
import { apiFetch } from "../api/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(enabled: boolean) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!enabled || subscribed.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    async function subscribe() {
      try {
        const { data } = await apiFetch<{ data: { key: string | null } }>("/push/vapid-public-key");
        if (!data.key) return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          subscribed.current = true;
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.key).buffer as ArrayBuffer,
        });

        const json = sub.toJSON();
        await apiFetch("/push/subscribe", {
          method: "POST",
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          }),
        });
        subscribed.current = true;
      } catch { /* push не підтримується або відхилено */ }
    }

    subscribe();
  }, [enabled]);
}
