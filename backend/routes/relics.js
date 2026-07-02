const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { RELIC_DEFINITIONS } = require('../gameConfig');

const router = express.Router();

// GET /relics
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const { rows: [profile] } = await client.query(
      'SELECT ascension_count FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
    );
    const ascensionCount = Number(profile?.ascension_count || 0);

    const { rows: owned } = await client.query(
      'SELECT relic_key, equipped FROM player_relics WHERE telegram_id=$1', [telegramId]
    );
    const ownedMap = Object.fromEntries(owned.map(r => [r.relic_key, r]));

    const { rows: cooldowns } = await client.query(
      "SELECT boost_type, expires_at FROM user_boosts WHERE telegram_id=$1 AND boost_type LIKE 'relic_%' AND expires_at>$2",
      [telegramId, Date.now()]
    );
    const cooldownMap = Object.fromEntries(cooldowns.map(r => [r.boost_type.replace('relic_', ''), Number(r.expires_at)]));

    const equippedRelic = owned.find(r => r.equipped)?.relic_key || null;

    const relics = Object.entries(RELIC_DEFINITIONS).map(([key, def]) => ({
      key,
      name: def.name,
      icon: def.icon,
      requiredAscension: def.requiredAscension,
      passiveDesc: def.passiveDesc,
      activeDesc: def.activeDesc,
      activeCooldownMs: def.activeCooldownMs,
      activeDurationMs: def.activeDurationMs,
      owned: !!ownedMap[key],
      equipped: ownedMap[key]?.equipped || false,
      cooldownEndsAt: cooldownMap[key] || null,
      unlockable: ascensionCount >= def.requiredAscension,
    }));

    res.json({ relics, equippedRelic, ascensionCount });
  } finally {
    client.release();
  }
}));

// POST /relics/grant — internal, called when player reaches required ascension (or from admin)
router.post('/grant', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { relicKey } = req.body;
  const def = RELIC_DEFINITIONS[relicKey];
  if (!def) return res.status(400).json({ error: 'Unknown relic' });

  const { rows: [profile] } = await pool.query(
    'SELECT ascension_count FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
  );
  if (Number(profile?.ascension_count || 0) < def.requiredAscension) {
    return res.status(400).json({ error: `Requires Ascension ${def.requiredAscension}` });
  }

  await pool.query(
    `INSERT INTO player_relics (telegram_id, relic_key, equipped, acquired_at) VALUES ($1,$2,FALSE,$3)
     ON CONFLICT (telegram_id, relic_key) DO NOTHING`,
    [telegramId, relicKey, Date.now()]
  );
  res.json({ ok: true, relicKey });
}));

// POST /relics/equip
router.post('/equip', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { relicKey } = req.body;

  await withTransaction(async (client) => {
    const { rows: [owned] } = await client.query(
      'SELECT 1 FROM player_relics WHERE telegram_id=$1 AND relic_key=$2', [telegramId, relicKey]
    );
    if (!owned) throw Object.assign(new Error('You do not own this relic'), { status: 400 });

    await client.query('UPDATE player_relics SET equipped=FALSE WHERE telegram_id=$1', [telegramId]);
    await client.query('UPDATE player_relics SET equipped=TRUE WHERE telegram_id=$1 AND relic_key=$2', [telegramId, relicKey]);
  });

  res.json({ ok: true });
}));

// POST /relics/unequip
router.post('/unequip', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  await pool.query('UPDATE player_relics SET equipped=FALSE WHERE telegram_id=$1', [telegramId]);
  res.json({ ok: true });
}));

// POST /relics/activate
router.post('/activate', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { relicKey } = req.body;
  const def = RELIC_DEFINITIONS[relicKey];
  if (!def) return res.status(400).json({ error: 'Unknown relic' });

  const result = await withTransaction(async (client) => {
    const { rows: [owned] } = await client.query(
      'SELECT equipped FROM player_relics WHERE telegram_id=$1 AND relic_key=$2', [telegramId, relicKey]
    );
    if (!owned?.equipped) throw Object.assign(new Error('Relic not equipped'), { status: 400 });

    const now = Date.now();
    const boostType = `relic_${relicKey}`;
    const { rows: [existing] } = await client.query(
      'SELECT expires_at FROM user_boosts WHERE telegram_id=$1 AND boost_type=$2 AND expires_at>$3',
      [telegramId, boostType, now]
    );
    if (existing) {
      const remaining = Math.ceil((Number(existing.expires_at) - now) / 1000);
      throw Object.assign(new Error(`On cooldown — ${remaining}s remaining`), { status: 400 });
    }

    const expiresAt = now + def.activeCooldownMs;
    const activeUntil = now + def.activeDurationMs;
    await client.query(
      `INSERT INTO user_boosts (telegram_id, boost_type, expires_at, activated_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (telegram_id, boost_type) DO UPDATE SET expires_at=$3, activated_at=$4`,
      [telegramId, boostType, expiresAt, now]
    );

    // Also insert the actual active effect boost
    const activeBoostType = `relic_active_${def.activeEffect}`;
    await client.query(
      `INSERT INTO user_boosts (telegram_id, boost_type, expires_at, activated_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (telegram_id, boost_type) DO UPDATE SET expires_at=$3, activated_at=$4`,
      [telegramId, activeBoostType, activeUntil, now]
    );

    return { activeEffect: def.activeEffect, activeUntil, cooldownUntil: expiresAt };
  });

  res.json(result);
}));

// Helper: get equipped relic passive bonuses for a player
async function getRelicBonuses(client, telegramId) {
  const { rows: [equipped] } = await client.query(
    'SELECT relic_key FROM player_relics WHERE telegram_id=$1 AND equipped=TRUE', [telegramId]
  );
  if (!equipped) return {};
  const def = RELIC_DEFINITIONS[equipped.relic_key];
  if (!def) return {};
  return { ...def.passiveStats, relicKey: equipped.relic_key };
}

module.exports = { router, getRelicBonuses };
