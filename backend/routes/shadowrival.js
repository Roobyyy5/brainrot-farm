const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { SHADOW_RIVAL } = require('../gameConfig');

const router = express.Router();

async function getOrCreateRival(client, telegramId) {
  const { rows } = await client.query('SELECT * FROM shadow_rivals WHERE telegram_id=$1', [telegramId]);
  if (rows[0]) return rows[0];
  const { rows: [r] } = await client.query(
    `INSERT INTO shadow_rivals (telegram_id, rival_level, rival_score, wins, losses, shards, last_challenge)
     VALUES ($1,1,0,0,0,0,0) RETURNING *`,
    [telegramId]
  );
  return r;
}

// GET /shadowrival
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const rival = await getOrCreateRival(client, telegramId);
    const { rows: [profile] } = await client.query(
      'SELECT total_taps, prestige FROM tapper_profiles WHERE telegram_id=$1',
      [telegramId]
    );
    const lvlDef = SHADOW_RIVAL.rivalLevels.find(l => l.lvl === rival.rival_level) || SHADOW_RIVAL.rivalLevels[0];
    const cooldownLeft = Math.max(0, rival.last_challenge + SHADOW_RIVAL.challengeCooldownMs - Date.now());

    res.json({
      rival: {
        level: rival.rival_level,
        name: lvlDef.name,
        icon: lvlDef.icon,
        score: Number(rival.rival_score),
      },
      myStats: { totalTaps: Number(profile?.total_taps || 0), prestige: profile?.prestige || 0 },
      wins: rival.wins,
      losses: rival.losses,
      shards: rival.shards,
      cooldownMs: cooldownLeft,
      canChallenge: cooldownLeft <= 0,
      shardRewardWin:  SHADOW_RIVAL.shardRewardWin[Math.min(rival.rival_level - 1, 4)],
      shardRewardLoss: SHADOW_RIVAL.shardRewardLoss[Math.min(rival.rival_level - 1, 4)],
    });
  } finally { client.release(); }
}));

// POST /shadowrival/challenge — 30s tap session result
router.post('/challenge', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { myScore } = req.body;
  if (typeof myScore !== 'number') return res.status(400).json({ error: 'Invalid score' });

  return withTransaction(async (client) => {
    const rival = await getOrCreateRival(client, telegramId);
    const cooldownLeft = Math.max(0, rival.last_challenge + SHADOW_RIVAL.challengeCooldownMs - Date.now());
    if (cooldownLeft > 0) return res.status(429).json({ error: 'Challenge on cooldown' });

    const lvlDef = SHADOW_RIVAL.rivalLevels.find(l => l.lvl === rival.rival_level) || SHADOW_RIVAL.rivalLevels[0];
    const { rows: [profile] } = await client.query('SELECT total_taps FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    const baseTaps = Number(profile?.total_taps || 1000);
    const rivalScore = Math.floor(baseTaps * SHADOW_RIVAL.baseScoreMultiplier * lvlDef.diffMult * (0.9 + Math.random() * 0.2));

    const won = myScore > rivalScore;
    const shardIdx = Math.min(rival.rival_level - 1, 4);
    const shards = won ? SHADOW_RIVAL.shardRewardWin[shardIdx] : SHADOW_RIVAL.shardRewardLoss[shardIdx];

    let newLevel = rival.rival_level;
    if (won && rival.wins + 1 >= rival.rival_level * 3 && rival.rival_level < 5) {
      newLevel = rival.rival_level + 1;
    }

    await client.query(
      `UPDATE shadow_rivals SET
        wins = wins + $1, losses = losses + $2,
        shards = shards + $3, rival_level = $4,
        rival_score = $5, last_challenge = $6
       WHERE telegram_id=$7`,
      [won ? 1 : 0, won ? 0 : 1, shards, newLevel, rivalScore, Date.now(), telegramId]
    );

    return res.json({ won, myScore, rivalScore, shards, newLevel, levelUp: newLevel > rival.rival_level });
  });
}));

// POST /shadowrival/upgrade — spend shards on permanent boosts
const SHARD_UPGRADES = [
  { key: 'tap_power_shard',    name: '+5% Tap Power',      cost: 20,  bonus: 'tap_power' },
  { key: 'energy_shard',       name: '+10 Energy Max',      cost: 15,  bonus: 'energy_max' },
  { key: 'combo_shard',        name: '+0.1× Combo Bonus',   cost: 30,  bonus: 'combo_bonus' },
  { key: 'gem_shard',          name: '+5% Gem Drops',       cost: 25,  bonus: 'gem_bonus' },
];

router.get('/upgrades', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const [rivalRes, ownedRes] = await Promise.all([
    pool.query('SELECT shards FROM shadow_rivals WHERE telegram_id=$1', [telegramId]),
    pool.query('SELECT upgrade_key FROM rival_shard_upgrades WHERE telegram_id=$1', [telegramId]),
  ]);
  const shards = Number(rivalRes.rows[0]?.shards || 0);
  const owned = new Set(ownedRes.rows.map(r => r.upgrade_key));
  res.json({ shards, upgrades: SHARD_UPGRADES.map(u => ({ ...u, owned: owned.has(u.key) })) });
}));

router.post('/upgrade', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { upgradeKey } = req.body;
  const upg = SHARD_UPGRADES.find(u => u.key === upgradeKey);
  if (!upg) return res.status(400).json({ error: 'Unknown upgrade' });

  return withTransaction(async (client) => {
    const { rows: [rival] } = await client.query('SELECT shards FROM shadow_rivals WHERE telegram_id=$1 FOR UPDATE', [telegramId]);
    if (!rival || rival.shards < upg.cost) return res.status(400).json({ error: 'Not enough shards' });

    const existing = await client.query('SELECT 1 FROM rival_shard_upgrades WHERE telegram_id=$1 AND upgrade_key=$2', [telegramId, upgradeKey]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Already owned' });

    await client.query('UPDATE shadow_rivals SET shards=shards-$1 WHERE telegram_id=$2', [upg.cost, telegramId]);
    await client.query('INSERT INTO rival_shard_upgrades (telegram_id, upgrade_key, purchased_at) VALUES ($1,$2,$3)', [telegramId, upgradeKey, Date.now()]);
    return res.json({ ok: true });
  });
}));

module.exports = router;
