const express = require('express');
const db = require('../db');

const router = express.Router();

// Public endpoint — no auth required.
router.get('/', (req, res) => {
  const top = db.prepare(`
    SELECT telegram_id, username, coins, level
    FROM users
    ORDER BY coins DESC
    LIMIT 50
  `).all();
  res.json({ leaderboard: top });
});

module.exports = router;
