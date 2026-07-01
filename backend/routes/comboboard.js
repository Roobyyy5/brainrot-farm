const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

// GET /comboboard — weekly top-combo leaderboard
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const weekKey = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [boardRes, myRes] = await Promise.all([
    pool.query(
      `SELECT p.telegram_id, u.username, p.max_combo
       FROM tapper_profiles p
       JOIN users u ON u.telegram_id = p.telegram_id
       WHERE p.max_combo_week = $1
       ORDER BY p.max_combo DESC
       LIMIT 20`,
      [weekKey]
    ),
    pool.query(
      'SELECT max_combo, max_combo_week FROM tapper_profiles WHERE telegram_id=$1',
      [tid]
    ),
  ]);

  const entries = boardRes.rows.map((r, i) => ({
    rank: i + 1,
    telegramId: r.telegram_id,
    username: r.username || `User_${String(r.telegram_id).slice(-4)}`,
    maxCombo: parseFloat(r.max_combo),
    isMe: r.telegram_id === tid,
  }));

  const me = myRes.rows[0];
  res.json({
    entries,
    myBest: me?.max_combo_week === weekKey ? parseFloat(me.max_combo) : null,
    weekKey,
  });
}));

module.exports = router;
