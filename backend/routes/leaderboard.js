const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// Public endpoint — no auth required.
router.get('/', async (req, res) => {
  const weekly = req.query.period === 'weekly';
  const column = weekly ? 'weekly_coins' : 'coins';
  const result = await pool.query(`
    SELECT telegram_id, username, coins, level, ${column} AS score
    FROM users
    ORDER BY ${column} DESC
    LIMIT 50
  `);
  res.json({ leaderboard: result.rows, period: weekly ? 'weekly' : 'all-time' });
});

module.exports = router;
