const express = require('express');
const { pool } = require('../db');
const { FARM_COOLDOWN_MS, BOOST_COST } = require('../gameConfig');
const { logEvent } = require('../events');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

// Spend coins to instantly clear the farm cooldown. Guarded atomically (see
// /farm for why) so two concurrent boosts can't both succeed and double-spend.
router.post(
  '/',
  asyncHandler(async (req, res) => {
  const { id: telegramId } = req.tgUser;
  const now = Date.now();

  const updateResult = await pool.query(
    `UPDATE users SET coins = coins - $1, last_farm_at = 0, farm_reminder_sent = TRUE
     WHERE telegram_id = $2 AND coins >= $1 AND $3 - last_farm_at < $4
     RETURNING *`,
    [BOOST_COST, telegramId, now, FARM_COOLDOWN_MS]
  );

  if (!updateResult.rows[0]) {
    const existing = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    const user = existing.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found. Call /register first.' });
    if (now - user.last_farm_at >= FARM_COOLDOWN_MS) {
      return res.status(400).json({ error: 'Farm is not on cooldown right now' });
    }
    return res.status(400).json({ error: 'Not enough brainrot points', cost: BOOST_COST });
  }

  logEvent(telegramId, 'boost');

    res.json({ user: updateResult.rows[0] });
  })
);

module.exports = router;
