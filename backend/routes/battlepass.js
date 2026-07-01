const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const {
  BATTLE_PASS_XP_PER_ENERGY, BATTLE_PASS_LEVEL_XP, BATTLE_PASS_LEVELS,
  BATTLE_PASS_FREE, BATTLE_PASS_PREMIUM, BATTLE_PASS_PREMIUM_COST,
  TAPPER_UPGRADES,
} = require('../gameConfig');

const router = express.Router();

function currentSeason() {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}
function bpLevel(xp) {
  return Math.min(BATTLE_PASS_LEVELS, Math.floor(xp / BATTLE_PASS_LEVEL_XP) + 1);
}

router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const season = currentSeason();
  const [profRes, claimsRes] = await Promise.all([
    pool.query('SELECT bp_xp, bp_premium FROM tapper_profiles WHERE telegram_id = $1', [telegramId]),
    pool.query(
      'SELECT level, is_premium FROM battle_pass_claims WHERE telegram_id = $1 AND season = $2',
      [telegramId, season]
    ),
  ]);
  const bp_xp = profRes.rows[0]?.bp_xp || 0;
  const bp_premium = profRes.rows[0]?.bp_premium || false;
  const level = bpLevel(bp_xp);
  const claimed = new Set(claimsRes.rows.map((r) => `${r.level}_${r.is_premium ? 'p' : 'f'}`));
  const levels = Array.from({ length: BATTLE_PASS_LEVELS }, (_, i) => {
    const lvl = i + 1;
    const freeR = BATTLE_PASS_FREE[lvl] || null;
    const premR = BATTLE_PASS_PREMIUM[lvl] || null;
    return {
      level: lvl,
      unlocked: level >= lvl,
      free: freeR ? { ...freeR, claimed: claimed.has(`${lvl}_f`), canClaim: level >= lvl && !claimed.has(`${lvl}_f`) } : null,
      premium: premR ? { ...premR, claimed: claimed.has(`${lvl}_p`), canClaim: level >= lvl && bp_premium && !claimed.has(`${lvl}_p`) } : null,
    };
  });
  res.json({ xp: bp_xp, level, xpForNext: BATTLE_PASS_LEVEL_XP - (bp_xp % BATTLE_PASS_LEVEL_XP), premium: bp_premium, premiumCost: BATTLE_PASS_PREMIUM_COST, levels, season });
}));

router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { level, premium } = req.body;
  if (!level || level < 1 || level > BATTLE_PASS_LEVELS) return res.status(400).json({ error: 'Invalid level' });
  const isPremium = !!premium;
  const season = currentSeason();

  const result = await withTransaction(async (client) => {
    const { rows: p } = await client.query(
      'SELECT bp_xp, bp_premium FROM tapper_profiles WHERE telegram_id = $1', [telegramId]
    );
    const bp_xp = p[0]?.bp_xp || 0;
    if (bpLevel(bp_xp) < level) return { error: 'Level not unlocked' };
    if (isPremium && !p[0]?.bp_premium) return { error: 'Premium pass not owned' };
    const reward = isPremium ? BATTLE_PASS_PREMIUM[level] : BATTLE_PASS_FREE[level];
    if (!reward) return { error: 'No reward at this level' };

    const ins = await client.query(
      `INSERT INTO battle_pass_claims (telegram_id, season, level, is_premium, claimed_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
      [telegramId, season, level, isPremium, Date.now()]
    );
    if (!ins.rows[0]) return { error: 'Already claimed' };

    const now = Date.now();
    if (reward.type === 'coins') {
      await client.query('UPDATE users SET coins=coins+$1, weekly_coins=weekly_coins+$1 WHERE telegram_id=$2', [reward.amount, telegramId]);
    } else if (reward.type === 'gems') {
      await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [reward.amount, telegramId]);
    } else if (reward.type === 'energy_refill') {
      const { rows: tp } = await client.query('SELECT energy_max_level FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
      const max = TAPPER_UPGRADES.ENERGY_MAX.getEffect(tp[0]?.energy_max_level || 0);
      await client.query('UPDATE tapper_profiles SET energy=$1, last_energy_at=$2 WHERE telegram_id=$3', [max, now, telegramId]);
    } else if (reward.type === 'skill_points') {
      await client.query('UPDATE tapper_profiles SET skill_points=skill_points+$1 WHERE telegram_id=$2', [reward.amount, telegramId]);
    } else if (reward.type === '2x_boost') {
      await client.query('INSERT INTO user_boosts (telegram_id,boost_type,expires_at,activated_at) VALUES($1,$2,$3,$4)',
        [telegramId, '2x_tap', now + reward.durationMs, now]);
    } else if (reward.type === 'skin') {
      await client.query(
        `UPDATE tapper_profiles SET skins_unlocked=array_append(skins_unlocked,$1)
         WHERE telegram_id=$2 AND NOT ($1=ANY(skins_unlocked))`,
        [reward.skin, telegramId]
      );
    }
    return { success: true, reward };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/buy-premium', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const result = await withTransaction(async (client) => {
    const { rows: u } = await client.query('SELECT gems FROM users WHERE telegram_id=$1', [telegramId]);
    if (!u[0] || u[0].gems < BATTLE_PASS_PREMIUM_COST) return { error: `Need ${BATTLE_PASS_PREMIUM_COST} gems` };
    const { rows: tp } = await client.query('SELECT bp_premium FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    if (tp[0]?.bp_premium) return { error: 'Already have premium' };
    await client.query('UPDATE users SET gems=gems-$1 WHERE telegram_id=$2', [BATTLE_PASS_PREMIUM_COST, telegramId]);
    await client.query('UPDATE tapper_profiles SET bp_premium=TRUE WHERE telegram_id=$1', [telegramId]);
    return { success: true };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
