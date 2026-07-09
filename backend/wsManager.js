const { WebSocketServer } = require('ws');
const { verifyInitData } = require('./telegramAuth');

const rooms = new Map(); // roomKey → Set<ws>

function broadcast(roomKey, payload) {
  const clients = rooms.get(roomKey);
  if (!clients) return;
  const msg = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function broadcastAll(payload) {
  const msg = JSON.stringify(payload);
  for (const clients of rooms.values()) {
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }
}

function join(roomKey, ws) {
  if (!rooms.has(roomKey)) rooms.set(roomKey, new Set());
  rooms.get(roomKey).add(ws);
}

function leave(ws) {
  for (const [key, clients] of rooms) {
    clients.delete(ws);
    if (clients.size === 0) rooms.delete(key);
  }
}

function attachToServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'auth') {
        const skipAuth = process.env.SKIP_TELEGRAM_AUTH === 'true';
        let userId = null;
        if (skipAuth) {
          userId = msg.telegramId?.toString();
        } else {
          const parsed = verifyInitData(msg.initData, process.env.BOT_TOKEN);
          userId = parsed?.id?.toString();
        }
        if (!userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'auth_failed' }));
          return;
        }
        ws.telegramId = userId;
        ws.send(JSON.stringify({ type: 'auth_ok', telegramId: userId }));
      }

      if (msg.type === 'subscribe') {
        if (!ws.telegramId) return;
        const room = msg.room;
        if (!room || typeof room !== 'string' || room.length > 100) return;
        join(room, ws);
        ws.send(JSON.stringify({ type: 'subscribed', room }));
      }

      if (msg.type === 'unsubscribe') {
        const room = msg.room;
        if (rooms.has(room)) rooms.get(room).delete(ws);
      }
    });

    ws.on('close', () => leave(ws));
    ws.on('error', () => leave(ws));
  });

  // Heartbeat every 30s to drop dead connections
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  return wss;
}

module.exports = { attachToServer, broadcast, broadcastAll, join, leave };
