const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { ACHIEVEMENT_GALLERY, TIER_ORDER, TIER_COLOR } = require('../gameConfig');

const router = express.Router();

// GET /gallery
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const { rows: [profile] } = await client.query(
      'SELECT * FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
    );
    const { rows: [user] } = await client.query('SELECT * FROM users WHERE telegram_id=$1', [telegramId]);
    const { rows: claimedRows } = await client.query(
      'SELECT ach_key FROM gallery_achievements WHERE telegram_id=$1', [telegramId]
    );
    const claimed = new Set(claimedRows.map(r => r.ach_key));

    // Build context for social checks
    const { rows: [guildRow] } = await client.query(
      'SELECT 1 FROM guild_members WHERE telegram_id=$1', [telegramId]
    );
    const { rows: [refRow] } = await client.query(
      "SELECT COUNT(*)::int AS n FROM referrals r JOIN users u ON u.telegram_id=r.referred_id WHERE r.referrer_id=$1 AND u.has_farmed_once=TRUE",
      [telegramId]
    );
    const { rows: [duelRow] } = await client.query(
      "SELECT SUM(CASE WHEN winner_id=$1 THEN 1 ELSE 0 END)::int AS wins FROM ranked_duels WHERE (challenger_id=$1 OR opponent_id=$1) AND status='settled'",
      [telegramId]
    );
    const { rows: [bossKillRow] } = await client.query(
      "SELECT COUNT(DISTINCT boss_key)::int AS n FROM boss_ecosystem_hits WHERE telegram_id=$1 AND rewarded=TRUE",
      [telegramId]
    );

    const ctx = {
      inGuild: !!guildRow,
      referrals: refRow?.n || 0,
      duelWins: duelRow?.wins || 0,
      seasonTop10: false, // simplified
      bossKills: bossKillRow?.n || 0,
    };

    const achievements = ACHIEVEMENT_GALLERY.map(ach => {
      const completed = ach.check(profile || {}, ctx);
      return {
        key:         ach.key,
        name:        ach.name,
        icon:        ach.icon,
        description: ach.desc,
        category:    ach.category,
        tier:        ach.tier,
        gems:        ach.reward?.gems || 0,
        completed,
        claimed:     claimed.has(ach.key),
        progress:    null,
        progressTarget: null,
      };
    });

    const totalGems = achievements
      .filter(a => a.claimed)
      .reduce((sum, a) => sum + a.gems, 0);

    // Legend badge: all platinum+ claimed
    const platinumAndAbove = ACHIEVEMENT_GALLERY.filter(a => ['platinum', 'diamond'].includes(a.tier));
    const legendUnlocked = platinumAndAbove.every(a => claimed.has(a.key));

    res.json({ achievements, totalGems, legendUnlocked });
  } finally {
    client.release();
  }
}));

// POST /gallery/claim
router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { achKey } = req.body;

  const def = ACHIEVEMENT_GALLERY.find(a => a.key === achKey);
  if (!def) return res.status(400).json({ error: 'Unknown achievement' });

  const result = await withTransaction(async (client) => {
    const { rows: [already] } = await client.query(
      'SELECT 1 FROM gallery_achievements WHERE telegram_id=$1 AND ach_key=$2', [telegramId, achKey]
    );
    if (already) throw Object.assign(new Error('Already claimed'), { status: 400 });

    const { rows: [profile] } = await client.query(
      'SELECT * FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
    );
    const { rows: [guildRow] } = await client.query('SELECT 1 FROM guild_members WHERE telegram_id=$1', [telegramId]);
    const { rows: [refRow] } = await client.query(
      "SELECT COUNT(*)::int AS n FROM referrals r JOIN users u ON u.telegram_id=r.referred_id WHERE r.referrer_id=$1 AND u.has_farmed_once=TRUE",
      [telegramId]
    );
    const { rows: [duelRow] } = await client.query(
      "SELECT SUM(CASE WHEN winner_id=$1 THEN 1 ELSE 0 END)::int AS wins FROM ranked_duels WHERE (challenger_id=$1 OR opponent_id=$1) AND status='settled'",
      [telegramId]
    );
    const { rows: [bossKillRow] } = await client.query(
      "SELECT COUNT(DISTINCT boss_key)::int AS n FROM boss_ecosystem_hits WHERE telegram_id=$1 AND rewarded=TRUE",
      [telegramId]
    );
    const ctx = {
      inGuild: !!guildRow,
      referrals: refRow?.n || 0,
      duelWins: duelRow?.wins || 0,
      seasonTop10: false,
      bossKills: bossKillRow?.n || 0,
    };

    if (!def.check(profile || {}, ctx)) throw Object.assign(new Error('Achievement not unlocked yet'), { status: 400 });

    await client.query(
      'INSERT INTO gallery_achievements (telegram_id, ach_key, claimed_at) VALUES ($1,$2,$3)',
      [telegramId, achKey, Date.now()]
    );

    const gems = def.reward?.gems || 0;
    if (gems > 0) await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [gems, telegramId]);

    return { gems, achKey };
  });

  res.json(result);
}));

module.exports = router;
