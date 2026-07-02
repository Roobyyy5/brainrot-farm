const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { ACTIVE_ABILITIES, ASCENSION_TREE } = require('../gameConfig');

async function getCooldowns(telegramId) {
  const { rows } = await pool.query(
    'SELECT ability_key, last_used_at FROM active_ability_cooldowns WHERE telegram_id=$1',
    [telegramId]
  );
  const map = {};
  for (const r of rows) map[r.ability_key] = Number(r.last_used_at);
  return map;
}

async function getTimeWarpLevel(telegramId) {
  const { rows } = await pool.query(
    "SELECT level FROM ascension_upgrades WHERE telegram_id=$1 AND upgrade_key='time_warp'",
    [telegramId]
  );
  return rows[0] ? rows[0].level : 0;
}

// GET /abilities — status of all abilities
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const now = Date.now();
  const cooldowns = await getCooldowns(telegramId);
  const timeWarp = await getTimeWarpLevel(telegramId);
  const cdMult = timeWarp > 0 ? 0.5 : 1;

  const abilities = Object.entries(ACTIVE_ABILITIES).map(([key, cfg]) => {
    const lastUsed = cooldowns[key] || 0;
    const effectiveCd = Math.floor(cfg.cooldownMs * cdMult);
    const cooldownEndsAt = lastUsed + effectiveCd;
    const cooldownMs = Math.max(0, cooldownEndsAt - now);

    let activeUntil = 0;
    if (cfg.durationMs) {
      activeUntil = lastUsed + cfg.durationMs;
    }
    const active = activeUntil > now;

    // golden_tap: check remaining uses in user_boosts
    let goldenTapsLeft = 0;
    if (key === 'golden_tap') {
      // stored via separate mechanism — checked in tapper.js
    }

    return {
      key,
      name: cfg.name,
      icon: cfg.icon,
      desc: cfg.desc,
      cooldownMs,
      cooldownTotalMs: effectiveCd,
      active,
      activeUntil: active ? activeUntil : 0,
      effect: cfg.effect,
      value: cfg.value,
    };
  });

  res.json({ abilities });
}));

// POST /abilities/activate
router.post('/activate', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { abilityKey } = req.body;
  const cfg = ACTIVE_ABILITIES[abilityKey];
  if (!cfg) return res.status(400).json({ error: 'Unknown ability' });

  const now = Date.now();

  await withTransaction(async (client) => {
    const timeWarpR = await client.query(
      "SELECT level FROM ascension_upgrades WHERE telegram_id=$1 AND upgrade_key='time_warp'",
      [telegramId]
    );
    const cdMult = (timeWarpR.rows[0]?.level || 0) > 0 ? 0.5 : 1;
    const effectiveCd = Math.floor(cfg.cooldownMs * cdMult);

    const cdRow = await client.query(
      'SELECT last_used_at FROM active_ability_cooldowns WHERE telegram_id=$1 AND ability_key=$2',
      [telegramId, abilityKey]
    );
    const lastUsed = cdRow.rows[0] ? Number(cdRow.rows[0].last_used_at) : 0;
    if (now < lastUsed + effectiveCd) {
      const remaining = (lastUsed + effectiveCd) - now;
      throw Object.assign(new Error(`Ability on cooldown (${Math.ceil(remaining / 1000)}s)`), { status: 400 });
    }

    // Record cooldown
    await client.query(
      `INSERT INTO active_ability_cooldowns (telegram_id, ability_key, last_used_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (telegram_id, ability_key) DO UPDATE SET last_used_at=$3`,
      [telegramId, abilityKey, now]
    );

    // Apply effects
    if (abilityKey === 'energy_nova') {
      // Refill energy to max
      const profR = await client.query(
        'SELECT energy_max_level FROM tapper_profiles WHERE telegram_id=$1',
        [telegramId]
      );
      const { TAPPER_UPGRADES } = require('../gameConfig');
      const energyMax = TAPPER_UPGRADES.ENERGY_MAX.getEffect(profR.rows[0]?.energy_max_level || 0);
      await client.query(
        'UPDATE tapper_profiles SET energy=$1, last_energy_at=$2 WHERE telegram_id=$3',
        [energyMax, now, telegramId]
      );
    }

    if (abilityKey === 'golden_tap') {
      // Store golden taps remaining as a boost entry with a large expires_at
      // We use boost_type = 'golden_tap' and track count via activated_at offset trick:
      // We'll use a separate approach: store in user_boosts with a far expires_at,
      // and tapper.js reads the count from a dedicated column — simplest: store via
      // a custom boost entry, countdown handled in tapper.js
      const expiresAt = now + 10 * 60 * 1000; // 10-minute safety window
      await client.query(
        `INSERT INTO user_boosts (telegram_id, boost_type, expires_at, activated_at)
         VALUES ($1,'golden_tap',$2,$3)`,
        [telegramId, expiresAt, now]
      );
    }

    if (cfg.durationMs && abilityKey !== 'golden_tap') {
      const expiresAt = now + cfg.durationMs;
      await client.query(
        `INSERT INTO user_boosts (telegram_id, boost_type, expires_at, activated_at)
         VALUES ($1,$2,$3,$4)`,
        [telegramId, abilityKey, expiresAt, now]
      );
    }
  });

  res.json({ ok: true, activatedAt: now });
}));

module.exports = router;
