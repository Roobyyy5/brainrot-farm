const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { DAILY_MISSIONS } = require('../gameConfig');

const router = express.Router();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function computeProgress(client, telegramId, mission) {
  const dayStart = new Date(todayKey()).getTime();

  if (mission.type === 'taps') {
    const { rows } = await client.query(
      'SELECT COALESCE(SUM(tap_count),0)::int AS total FROM tap_batches WHERE telegram_id=$1 AND created_at>=$2',
      [telegramId, dayStart]
    );
    return rows[0].total;
  }

  if (mission.type === 'bp') {
    const { rows } = await client.query(
      'SELECT COALESCE(SUM(bp_earned),0)::int AS total FROM tap_batches WHERE telegram_id=$1 AND created_at>=$2',
      [telegramId, dayStart]
    );
    return rows[0].total;
  }

  if (mission.type === 'boss') {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM boss_participants bp
       JOIN boss_fights bf ON bf.id = bp.boss_id
       WHERE bp.telegram_id=$1 AND bf.starts_at>=$2 AND bp.damage>0`,
      [telegramId, dayStart]
    );
    return rows[0].count;
  }

  if (mission.type === 'upgrade') {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM events
       WHERE telegram_id=$1 AND event_type='tapper_upgrade' AND created_at>=$2`,
      [telegramId, dayStart]
    );
    return rows[0].count;
  }

  return 0;
}

// GET /missions
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const key = todayKey();

  const { rows: claimed } = await pool.query(
    'SELECT mission_key FROM mission_claims WHERE telegram_id=$1 AND date_key=$2',
    [telegramId, key]
  );
  const claimedSet = new Set(claimed.map((r) => r.mission_key));

  const client = await pool.connect();
  try {
    const missions = await Promise.all(
      DAILY_MISSIONS.map(async (m) => {
        const progress = await computeProgress(client, telegramId, m);
        return {
          key: m.key,
          name: m.name,
          emoji: m.emoji,
          target: m.target,
          reward: m.reward,
          progress: Math.min(progress, m.target),
          completed: progress >= m.target,
          claimed: claimedSet.has(m.key),
        };
      })
    );
    res.json({ missions, dateKey: key });
  } finally {
    client.release();
  }
}));

// POST /missions/claim
router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { key } = req.body;

  const mission = DAILY_MISSIONS.find((m) => m.key === key);
  if (!mission) return res.status(400).json({ error: 'Unknown mission' });

  const result = await withTransaction(async (client) => {
    const dateKey = todayKey();

    const already = await client.query(
      'SELECT id FROM mission_claims WHERE telegram_id=$1 AND mission_key=$2 AND date_key=$3',
      [telegramId, key, dateKey]
    );
    if (already.rows[0]) return { error: 'Already claimed' };

    const progress = await computeProgress(client, telegramId, mission);
    if (progress < mission.target) return { error: 'Mission not completed yet' };

    await client.query(
      'INSERT INTO mission_claims (telegram_id, mission_key, reward, date_key, claimed_at) VALUES ($1,$2,$3,$4,$5)',
      [telegramId, key, mission.reward, dateKey, Date.now()]
    );
    await client.query(
      'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
      [mission.reward, telegramId]
    );

    return { success: true, reward: mission.reward };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
