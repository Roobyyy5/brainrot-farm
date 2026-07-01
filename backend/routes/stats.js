const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

// GET /stats — last 7 days of tap stats + lifetime totals
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const [dailyRes, profileRes] = await Promise.all([
    pool.query(
      `SELECT
         to_char(to_timestamp(created_at / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
         SUM(tap_count)::bigint AS taps,
         SUM(bp_earned)::bigint AS bp
       FROM tap_batches
       WHERE telegram_id = $1 AND created_at >= $2
       GROUP BY day
       ORDER BY day ASC`,
      [tid, sevenDaysAgo]
    ),
    pool.query(
      'SELECT total_taps, total_bp_earned, prestige, tap_streak, max_combo, current_zone FROM tapper_profiles WHERE telegram_id=$1',
      [tid]
    ),
  ]);

  // Fill in missing days with zeros
  const dayMap = {};
  for (const r of dailyRes.rows) dayMap[r.day] = { taps: Number(r.taps), bp: Number(r.bp) };
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, taps: dayMap[key]?.taps || 0, bp: dayMap[key]?.bp || 0 });
  }

  const p = profileRes.rows[0] || {};
  res.json({
    days,
    totals: {
      totalTaps: Number(p.total_taps) || 0,
      totalBp: Number(p.total_bp_earned) || 0,
      prestige: p.prestige || 0,
      maxStreak: p.tap_streak || 0,
      maxCombo: parseFloat(p.max_combo) || 1.0,
      currentZone: p.current_zone || 1,
    },
  });
}));

module.exports = router;
