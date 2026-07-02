const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { LIVE_WORLD_EVENTS, LIVE_EVENT_COOLDOWN_MS, LIVE_EVENT_MIN_GAP_MS } = require('../gameConfig');
const { broadcastAll } = require('../wsManager');

const router = express.Router();

// GET /worldevents — current active events
router.get('/', asyncHandler(async (req, res) => {
  const now = Date.now();
  const { rows } = await pool.query(
    `SELECT * FROM live_world_events WHERE active=TRUE AND ends_at > $1 ORDER BY starts_at DESC`,
    [now]
  );
  res.json({ events: rows.map(r => ({
    id: r.id,
    key: r.event_key,
    name: r.name,
    icon: r.icon,
    effect: r.effect,
    value: Number(r.value),
    startsAt: Number(r.starts_at),
    endsAt: Number(r.ends_at),
    remainingMs: Number(r.ends_at) - now,
  })) });
}));

// Internal: spawn a random event and broadcast it
async function spawnRandomEvent() {
  const now = Date.now();

  // Check last event time (avoid spam)
  const { rows: recent } = await pool.query(
    `SELECT ends_at FROM live_world_events WHERE starts_at > $1 ORDER BY starts_at DESC LIMIT 1`,
    [now - LIVE_EVENT_COOLDOWN_MS]
  );
  if (recent.length > 0) return null;

  // Deactivate expired events
  await pool.query(
    `UPDATE live_world_events SET active=FALSE WHERE ends_at < $1`,
    [now]
  );

  const def = LIVE_WORLD_EVENTS[Math.floor(Math.random() * LIVE_WORLD_EVENTS.length)];
  const endsAt = now + def.durationMs;
  const { rows: [ev] } = await pool.query(
    `INSERT INTO live_world_events (event_key, name, icon, effect, value, starts_at, ends_at, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING *`,
    [def.key, def.name, def.icon, def.effect, def.value, now, endsAt]
  );

  const payload = {
    type: 'world_event',
    event: {
      id: ev.id,
      key: def.key,
      name: def.name,
      icon: def.icon,
      effect: def.effect,
      value: Number(def.value),
      endsAt,
      durationMs: def.durationMs,
      desc: def.desc,
    },
  };
  broadcastAll(payload);
  console.log(`[WorldEvent] Spawned: ${def.name}`);
  return ev;
}

module.exports = { router, spawnRandomEvent };
