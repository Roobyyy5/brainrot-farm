const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TAP_RUSH_DURATION_MS, TAP_RUSH_COOLDOWN_MS, TAP_RUSH_MULTIPLIER } = require('../gameConfig');

function weekKey() {
  return 'W' + Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

// GET /taprush
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const now = Date.now();
  const wk = weekKey();

  const r = await db.query(
    'SELECT rush_active_until, rush_cooldown_at, rush_week_score, rush_week_key FROM tapper_profiles WHERE telegram_id = $1',
    [telegramId]
  );
  const p = r.rows[0] || {};
  const weekScore = p.rush_week_key === wk ? Number(p.rush_week_score || 0) : 0;

  const lb = await db.query(`
    SELECT u.username,
      CASE WHEN tp.rush_week_key = $1 THEN tp.rush_week_score ELSE 0 END AS ws
    FROM tapper_profiles tp
    JOIN users u ON u.telegram_id = tp.telegram_id
    ORDER BY ws DESC
    LIMIT 10
  `, [wk]);

  res.json({
    active:       Number(p.rush_active_until || 0) > now,
    activeUntil:  Number(p.rush_active_until || 0),
    cooldownMs:   Math.max(0, Number(p.rush_cooldown_at || 0) - now),
    weekScore,
    multiplier:   TAP_RUSH_MULTIPLIER,
    durationMs:   TAP_RUSH_DURATION_MS,
    cooldownTotalMs: TAP_RUSH_COOLDOWN_MS,
    leaderboard:  lb.rows.map((row, i) => ({ rank: i + 1, username: row.username || '???', score: Number(row.ws) })),
  });
}));

// POST /taprush/start
router.post('/start', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const now = Date.now();

  const r = await db.query('SELECT rush_cooldown_at FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Profile not found' });
  if (Number(r.rows[0].rush_cooldown_at) > now) {
    return res.status(400).json({ error: 'Rush on cooldown', cooldownMs: Number(r.rows[0].rush_cooldown_at) - now });
  }

  await db.query(
    'UPDATE tapper_profiles SET rush_active_until = $1, rush_cooldown_at = $2 WHERE telegram_id = $3',
    [now + TAP_RUSH_DURATION_MS, now + TAP_RUSH_COOLDOWN_MS, telegramId]
  );

  res.json({ ok: true, activeUntil: now + TAP_RUSH_DURATION_MS, cooldownUntil: now + TAP_RUSH_COOLDOWN_MS });
}));

module.exports = router;
