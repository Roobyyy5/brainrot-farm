const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// Public endpoint — no auth required.
router.get('/', async (req, res) => {
  const result = await pool.query(`
    SELECT telegram_id, username, coins, level
    FROM users
    ORDER BY coins DESC
    LIMIT 50
  `);
  res.json({ leaderboard: result.rows });
});

module.exports = router;
