import { useEffect, useRef, useCallback } from 'react';
import { getInitData } from './telegram';

const WS_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:4000')
  .replace(/^http/, 'ws');

export function useWebSocket({ onMessage, rooms = [] }) {
  const wsRef = useRef(null);
  const subscribedRooms = useRef(new Set());
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      const initData = getInitData();
      if (initData) {
        ws.send(JSON.stringify({ type: 'auth', initData }));
      } else {
        // dev mode
        const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'dev';
        ws.send(JSON.stringify({ type: 'auth', telegramId: String(tgId) }));
      }
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type === 'auth_ok') {
        // Subscribe to all requested rooms
        for (const room of rooms) {
          ws.send(JSON.stringify({ type: 'subscribe', room }));
          subscribedRooms.current.add(room);
        }
      }
      onMessageRef.current?.(msg);
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => { ws.close(); };
  }, []);

  // Subscribe to new rooms dynamically
  useEffect(() => {
    for (const room of rooms) {
      if (!subscribedRooms.current.has(room) && wsRef.current?.readyState === WebSocket.OPEN) {
        send({ type: 'subscribe', room });
        subscribedRooms.current.add(room);
      }
    }
  }, [rooms, send]);

  return { send };
}
