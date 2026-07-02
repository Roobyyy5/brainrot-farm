const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { ASCENSION_TREE, ASCENSION_REQUIRED_PRESTIGES } = require('../gameConfig');

// GET /ascension
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const profR = await pool.query(
    'SELECT prestige, ascension_count, ascension_points FROM tapper_profiles WHERE telegram_id=$1',
    [telegramId]
  );
  const profile = profR.rows[0] || { prestige: 0, ascension_count: 0, ascension_points: 0 };
  const canAscend = Number(profile.prestige) >= ASCENSION_REQUIRED_PRESTIGES;

  const upgradesR = await pool.query(
    'SELECT upgrade_key, level FROM ascension_upgrades WHERE telegram_id=$1',
    [telegramId]
  );
  const upgMap = {};
  for (const r of upgradesR.rows) upgMap[r.upgrade_key] = r.level;

  const tree = Object.entries(ASCENSION_TREE).map(([key, cfg]) => ({
    key,
    name: cfg.name,
    icon: cfg.icon,
    desc: cfg.desc,
    maxLevel: cfg.maxLevel,
    costPerLevel: cfg.costPerLevel,
    currentLevel: upgMap[key] || 0,
  }));

  res.json({
    canAscend,
    prestige: Number(profile.prestige),
    requiredPrestiges: ASCENSION_REQUIRED_PRESTIGES,
    ascensionCount: Number(profile.ascension_count),
    ascensionPoints: Number(profile.ascension_points),
    tree,
  });
}));

// POST /ascension/ascend — reset prestige count to 0, gain 3 ascension points
router.post('/ascend', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  await withTransaction(async (client) => {
    const profR = await client.query(
      'SELECT prestige, ascension_count FROM tapper_profiles WHERE telegram_id=$1 FOR UPDATE',
      [telegramId]
    );
    if (!profR.rows[0]) throw Object.assign(new Error('Profile not found'), { status: 404 });
    const profile = profR.rows[0];
    if (Number(profile.prestige) < ASCENSION_REQUIRED_PRESTIGES) {
      throw Object.assign(
        new Error(`Need ${ASCENSION_REQUIRED_PRESTIGES} prestiges to ascend (have ${profile.prestige})`),
        { status: 400 }
      );
    }

    await client.query(
      `UPDATE tapper_profiles SET
         prestige = 0,
         tap_power_level = 0, energy_max_level = 0, regen_rate_level = 0,
         multi_tap_level = 0, auto_brain_level = 0,
         energy = 1000, last_energy_at = $1,
         talent_points = 0, talents_chosen = '{}',
         skill_points = 0,
         ascension_count = ascension_count + 1,
         ascension_points = ascension_points + 3
       WHERE telegram_id = $2`,
      [Date.now(), telegramId]
    );

    await client.query('DELETE FROM user_skills WHERE telegram_id=$1', [telegramId]);
    await client.query('DELETE FROM prestige_upgrades WHERE telegram_id=$1', [telegramId]);
  });

  res.json({ ok: true });
}));

// POST /ascension/upgrade
router.post('/upgrade', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { upgradeKey } = req.body;
  const cfg = ASCENSION_TREE[upgradeKey];
  if (!cfg) return res.status(400).json({ error: 'Unknown ascension upgrade' });

  await withTransaction(async (client) => {
    const profR = await client.query(
      'SELECT ascension_points FROM tapper_profiles WHERE telegram_id=$1 FOR UPDATE',
      [telegramId]
    );
    if (!profR.rows[0]) throw Object.assign(new Error('Profile not found'), { status: 404 });

    const currentPoints = Number(profR.rows[0].ascension_points);
    const upgradeR = await client.query(
      'SELECT level FROM ascension_upgrades WHERE telegram_id=$1 AND upgrade_key=$2',
      [telegramId, upgradeKey]
    );
    const currentLevel = upgradeR.rows[0] ? Number(upgradeR.rows[0].level) : 0;
    if (currentLevel >= cfg.maxLevel) throw Object.assign(new Error('Already at max level'), { status: 400 });
    if (currentPoints < cfg.costPerLevel) throw Object.assign(new Error('Not enough ascension points'), { status: 400 });

    await client.query(
      'UPDATE tapper_profiles SET ascension_points = ascension_points - $1 WHERE telegram_id=$2',
      [cfg.costPerLevel, telegramId]
    );
    await client.query(
      `INSERT INTO ascension_upgrades (telegram_id, upgrade_key, level) VALUES ($1,$2,1)
       ON CONFLICT (telegram_id, upgrade_key) DO UPDATE SET level = ascension_upgrades.level + 1`,
      [telegramId, upgradeKey]
    );
  });

  res.json({ ok: true });
}));

// GET /ascension/leaderboard — prestige score = total_taps × prestige²
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.username, tp.total_taps, tp.prestige, tp.ascension_count,
           (tp.total_taps * tp.prestige * tp.prestige)::BIGINT AS prestige_score
    FROM tapper_profiles tp
    JOIN users u ON u.telegram_id = tp.telegram_id
    WHERE tp.prestige > 0
    ORDER BY prestige_score DESC
    LIMIT 20
  `);
  res.json({
    leaderboard: rows.map((r, i) => ({
      rank: i + 1,
      username: r.username || '???',
      totalTaps: Number(r.total_taps),
      prestige: Number(r.prestige),
      ascensionCount: Number(r.ascension_count),
      prestigeScore: Number(r.prestige_score),
    })),
  });
}));

module.exports = router;
