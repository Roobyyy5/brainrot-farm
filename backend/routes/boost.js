const express = require('express');
const { pool } = require('../db');
const { FARM_COOLDOWN_MS, BOOST_COST } = require('../gameConfig');
const { logEvent } = require('../events');

const router = express.Router();

// Spend coins to instantly clear the farm cooldown.
router.post('/', async (req, res) => {
  const { id: telegramId } = req.tgUser;
  const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found. Call /register first.' });

  const now = Date.now();
  const elapsed = now - user.last_farm_at;
  if (elapsed >= FARM_COOLDOWN_MS) {
    return res.status(400).json({ error: 'Farm is not on cooldown right now' });
  }
  if (user.coins < BOOST_COST) {
    return res.status(400).json({ error: 'Not enough brainrot points', cost: BOOST_COST });
  }

  await pool.query('UPDATE users SET coins = coins - $1, last_farm_at = 0 WHERE telegram_id = $2', [
    BOOST_COST,
    telegramId,
  ]);

  logEvent(telegramId, 'boost');

  const updated = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  res.json({ user: updated.rows[0] });
});

module.exports = router;
