const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

// Public endpoint — no auth required.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const weekly = req.query.period === 'weekly';
    const column = weekly ? 'weekly_coins' : 'coins';
    // NOTE: telegram_id is intentionally NOT selected/returned. It is a
    // sensitive account identifier and this endpoint is public (no auth),
    // so exposing it would leak every player's raw Telegram id.
    const result = await pool.query(`
      SELECT username, coins, level, ${column} AS score
      FROM users
      ORDER BY ${column} DESC
      LIMIT 50
    `);
    res.json({ leaderboard: result.rows, period: weekly ? 'weekly' : 'all-time' });
  })
);

module.exports = router;
