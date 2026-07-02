const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { ORACLE_CHALLENGE_TYPES, ORACLE_SHOP, ORACLE_COOLDOWN_MS } = require('../gameConfig');

const router = express.Router();

function generateChallenge(profile) {
  const type = ORACLE_CHALLENGE_TYPES[Math.floor(Math.random() * ORACLE_CHALLENGE_TYPES.length)];
  const baseTaps = Math.max(Number(profile?.total_taps || 0), 1000);
  const difficulty = 0.05 + Math.random() * 0.1; // 5-15% of recent performance

  let target, time;
  switch (type.type) {
    case 'taps_in_time':
      time = 20 + Math.floor(Math.random() * 20);
      target = Math.max(50, Math.floor(baseTaps * difficulty));
      break;
    case 'hold_combo':
      time = 15 + Math.floor(Math.random() * 15);
      target = 3 + Math.floor(Math.random() * 5);
      break;
    case 'no_miss_rhythm':
      time = null;
      target = 10 + Math.floor(Math.random() * 20);
      break;
    case 'boss_damage':
      time = 30;
      target = Math.max(10000, Math.floor(baseTaps * difficulty * 100));
      break;
    case 'energy_spend':
      time = 30;
      target = 50 + Math.floor(Math.random() * 100);
      break;
    default:
      time = 30; target = 100;
  }

  return { type: type.type, target, time };
}

// GET /oracle
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    let [stateRes, purchasesRes] = await Promise.all([
      client.query('SELECT * FROM oracle_state WHERE telegram_id=$1', [telegramId]),
      client.query('SELECT item_key FROM oracle_purchases WHERE telegram_id=$1', [telegramId]),
    ]);

    let state = stateRes.rows[0];
    if (!state) {
      await client.query('INSERT INTO oracle_state (telegram_id) VALUES ($1) ON CONFLICT DO NOTHING', [telegramId]);
      state = { oracle_coins: 0, challenge_type: null, challenge_completed: false };
    }

    const owned = new Set(purchasesRes.rows.map(r => r.item_key));
    const cooldownLeft = state.challenge_issued_at
      ? Math.max(0, Number(state.challenge_issued_at) + ORACLE_COOLDOWN_MS - Date.now())
      : 0;
    const expired = state.challenge_expires_at && Date.now() > Number(state.challenge_expires_at);

    const typeInfo = ORACLE_CHALLENGE_TYPES.find(t => t.type === state.challenge_type);

    res.json({
      coins: state.oracle_coins || 0,
      challenge: state.challenge_type && !expired ? {
        type: state.challenge_type,
        target: state.challenge_target,
        time: state.challenge_time,
        progress: state.challenge_progress || 0,
        completed: state.challenge_completed,
        expiresAt: Number(state.challenge_expires_at),
        desc: typeInfo?.desc(state.challenge_time, state.challenge_target) || '',
        icon: typeInfo?.icon || '⚡',
        name: typeInfo?.name || '',
      } : null,
      canRequest: !state.challenge_type || expired || state.challenge_completed,
      cooldownMs: cooldownLeft,
      shop: ORACLE_SHOP.map(i => ({ ...i, owned: owned.has(i.key) })),
    });
  } finally { client.release(); }
}));

// POST /oracle/request — get a new challenge
router.post('/request', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  return withTransaction(async (client) => {
    const { rows: [state] } = await client.query('SELECT * FROM oracle_state WHERE telegram_id=$1', [telegramId]);
    const expired = state?.challenge_expires_at && Date.now() > Number(state?.challenge_expires_at);
    if (state?.challenge_type && !expired && !state?.challenge_completed) {
      return res.status(400).json({ error: 'Complete or wait for current challenge' });
    }

    const { rows: [profile] } = await client.query('SELECT total_taps FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    const ch = generateChallenge(profile);
    const expiresAt = ch.time ? Date.now() + (ch.time + 30) * 1000 * 10 : Date.now() + 24 * 60 * 60 * 1000;

    await client.query(
      `INSERT INTO oracle_state (telegram_id, challenge_type, challenge_target, challenge_time, challenge_progress, challenge_issued_at, challenge_expires_at, challenge_completed)
       VALUES ($1,$2,$3,$4,0,$5,$6,FALSE)
       ON CONFLICT (telegram_id) DO UPDATE SET
         challenge_type=$2, challenge_target=$3, challenge_time=$4, challenge_progress=0,
         challenge_issued_at=$5, challenge_expires_at=$6, challenge_completed=FALSE`,
      [telegramId, ch.type, ch.target, ch.time, Date.now(), expiresAt]
    );

    const typeInfo = ORACLE_CHALLENGE_TYPES.find(t => t.type === ch.type);
    return res.json({ challenge: { ...ch, desc: typeInfo?.desc(ch.time, ch.target), icon: typeInfo?.icon, name: typeInfo?.name } });
  });
}));

// POST /oracle/progress — update challenge progress (called from game events)
async function updateOracleProgress(telegramId, type, amount) {
  try {
    const { rows: [state] } = await pool.query('SELECT * FROM oracle_state WHERE telegram_id=$1', [telegramId]);
    if (!state || state.challenge_type !== type || state.challenge_completed) return;
    if (state.challenge_expires_at && Date.now() > Number(state.challenge_expires_at)) return;

    const newProgress = (state.challenge_progress || 0) + amount;
    const completed = newProgress >= state.challenge_target;

    await pool.query(
      'UPDATE oracle_state SET challenge_progress=$1, challenge_completed=$2 WHERE telegram_id=$3',
      [newProgress, completed, telegramId]
    );

    if (completed) {
      const reward = 15 + Math.floor(Math.random() * 20);
      await pool.query('UPDATE oracle_state SET oracle_coins=oracle_coins+$1 WHERE telegram_id=$2', [reward, telegramId]);
    }
  } catch (_) {}
}

// POST /oracle/claim
router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows: [state] } = await pool.query('SELECT challenge_completed FROM oracle_state WHERE telegram_id=$1', [telegramId]);
  if (!state?.challenge_completed) return res.status(400).json({ error: 'Challenge not completed' });

  const reward = 15 + Math.floor(Math.random() * 20);
  await pool.query(
    `UPDATE oracle_state SET oracle_coins=oracle_coins+$1, challenge_type=NULL, challenge_completed=FALSE WHERE telegram_id=$2`,
    [reward, telegramId]
  );
  res.json({ coins: reward });
}));

// POST /oracle/buy
router.post('/buy', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { itemKey } = req.body;
  const item = ORACLE_SHOP.find(i => i.key === itemKey);
  if (!item) return res.status(400).json({ error: 'Unknown item' });

  return withTransaction(async (client) => {
    const { rows: [state] } = await client.query('SELECT oracle_coins FROM oracle_state WHERE telegram_id=$1 FOR UPDATE', [telegramId]);
    if (!state || state.oracle_coins < item.cost) return res.status(400).json({ error: 'Not enough Oracle Coins' });

    const existing = await client.query('SELECT 1 FROM oracle_purchases WHERE telegram_id=$1 AND item_key=$2', [telegramId, itemKey]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Already owned' });

    await client.query('UPDATE oracle_state SET oracle_coins=oracle_coins-$1 WHERE telegram_id=$2', [item.cost, telegramId]);
    await client.query('INSERT INTO oracle_purchases (telegram_id, item_key, bought_at) VALUES ($1,$2,$3)', [telegramId, itemKey, Date.now()]);
    return res.json({ ok: true });
  });
}));

module.exports = { router, updateOracleProgress };
