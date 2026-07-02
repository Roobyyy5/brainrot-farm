const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GLOBAL_BOSS_DEFINITIONS, GLOBAL_BOSS_DURATION_MS } = require('../gameConfig');
const { broadcastAll } = require('../wsManager');

const router = express.Router();

async function getActiveEvent(client) {
  const { rows } = await client.query(
    `SELECT * FROM global_boss_events WHERE status='active' AND ends_at > $1 ORDER BY id DESC LIMIT 1`,
    [Date.now()]
  );
  return rows[0] || null;
}

// GET /globalboss
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const event = await getActiveEvent(client);
    if (!event) {
      return res.json({ active: false, nextBoss: GLOBAL_BOSS_DEFINITIONS[0] });
    }

    const def = GLOBAL_BOSS_DEFINITIONS.find(b => b.key === event.boss_key) || GLOBAL_BOSS_DEFINITIONS[0];
    const { rows: [myHit] } = await client.query(
      'SELECT damage FROM global_boss_hits WHERE event_id=$1 AND telegram_id=$2',
      [event.id, telegramId]
    );
    const { rows: topDmg } = await client.query(
      `SELECT gbh.telegram_id, u.username, gbh.damage
       FROM global_boss_hits gbh JOIN users u ON u.telegram_id=gbh.telegram_id
       WHERE gbh.event_id=$1 ORDER BY gbh.damage DESC LIMIT 10`,
      [event.id]
    );
    const { rows: [{ count: participantCount }] } = await client.query(
      'SELECT COUNT(*) FROM global_boss_hits WHERE event_id=$1',
      [event.id]
    );

    res.json({
      active: true,
      event: {
        id: event.id,
        bossKey: event.boss_key,
        name: def.name,
        icon: def.icon,
        color: def.color,
        maxHp: Number(event.max_hp),
        currentHp: Number(event.current_hp),
        startedAt: Number(event.started_at),
        endsAt: Number(event.ends_at),
        milestones: def.milestones,
        milestonesHit: event.milestones_hit || [],
        participants: Number(participantCount),
      },
      myDamage: Number(myHit?.damage || 0),
      topDamage: topDmg.map((r, i) => ({
        rank: i + 1,
        username: r.username,
        damage: Number(r.damage),
        isMe: r.telegram_id === telegramId,
      })),
    });
  } finally { client.release(); }
}));

// POST /globalboss/tap
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { count } = req.body;
  const taps = Math.min(Math.max(1, Number(count) || 1), 500);

  return withTransaction(async (client) => {
    const event = await getActiveEvent(client);
    if (!event) return res.status(400).json({ error: 'No active global boss' });
    if (Number(event.current_hp) <= 0) return res.status(400).json({ error: 'Boss already defeated' });

    const { rows: [profile] } = await client.query('SELECT tap_power_level FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    const tapPower = (profile?.tap_power_level || 0) * 3 + 10;
    const damage = taps * tapPower;

    const newHp = Math.max(0, Number(event.current_hp) - damage);

    await client.query(
      `INSERT INTO global_boss_hits (event_id, telegram_id, damage)
       VALUES ($1,$2,$3)
       ON CONFLICT (event_id, telegram_id) DO UPDATE SET damage = global_boss_hits.damage + $3`,
      [event.id, telegramId, damage]
    );

    // Check milestones
    const def = GLOBAL_BOSS_DEFINITIONS.find(b => b.key === event.boss_key);
    const maxHp = Number(event.max_hp);
    const hitMilestones = event.milestones_hit || [];
    const newMilestones = [];

    for (const ms of def.milestones) {
      const alreadyHit = hitMilestones.includes(ms.pct);
      const nowHit = newHp <= maxHp * (1 - ms.pct / 100);
      if (!alreadyHit && nowHit) {
        newMilestones.push(ms.pct);
        // reward ALL participants
        const { rows: participants } = await client.query(
          'SELECT telegram_id FROM global_boss_hits WHERE event_id=$1', [event.id]
        );
        for (const p of participants) {
          await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [ms.reward.gems, p.telegram_id]);
        }
      }
    }

    const allMilestones = [...hitMilestones, ...newMilestones];
    const defeated = newHp <= 0;

    if (defeated) {
      await client.query(`UPDATE global_boss_events SET current_hp=0, status='defeated', milestones_hit=$1 WHERE id=$2`, [JSON.stringify(allMilestones), event.id]);
      // Kill rewards for top contributors
      const { rows: topHits } = await client.query(
        'SELECT telegram_id FROM global_boss_hits WHERE event_id=$1 ORDER BY damage DESC LIMIT 50', [event.id]
      );
      for (const h of topHits) {
        await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [def.killReward.gems, h.telegram_id]);
        await client.query('UPDATE global_boss_hits SET rewarded=TRUE WHERE event_id=$1 AND telegram_id=$2', [event.id, h.telegram_id]);
      }
      broadcastAll({ type: 'global_boss_defeated', bossKey: event.boss_key, gems: def.killReward.gems });
    } else {
      await client.query(`UPDATE global_boss_events SET current_hp=$1, milestones_hit=$2 WHERE id=$3`, [newHp, JSON.stringify(allMilestones), event.id]);
      broadcastAll({ type: 'global_boss_hp', eventId: event.id, currentHp: newHp, maxHp });
    }

    return res.json({ newHp, damage, defeated, newMilestones });
  });
}));

// Internal: spawn a new global boss event (called by scheduler)
async function spawnGlobalBoss() {
  const client = await pool.connect();
  try {
    const existing = await getActiveEvent(client);
    if (existing) return;

    const { rows: [{ count }] } = await client.query('SELECT COUNT(*) FROM users');
    const playerCount = Math.max(Number(count), 10);
    const defIdx = Math.floor(Math.random() * GLOBAL_BOSS_DEFINITIONS.length);
    const def = GLOBAL_BOSS_DEFINITIONS[defIdx];
    const maxHp = def.hpPerPlayer * playerCount;
    const now = Date.now();

    await client.query(
      `INSERT INTO global_boss_events (boss_key, max_hp, current_hp, started_at, ends_at, status)
       VALUES ($1,$2,$2,$3,$4,'active')`,
      [def.key, maxHp, now, now + GLOBAL_BOSS_DURATION_MS]
    );

    broadcastAll({ type: 'global_boss_spawned', bossKey: def.key, name: def.name, icon: def.icon, maxHp });
  } finally { client.release(); }
}

module.exports = { router, spawnGlobalBoss };
