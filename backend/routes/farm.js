const express = require('express');
const { pool, withTransaction } = require('../db');
const { FARM_COOLDOWN_MS, FARM_MIN_REWARD, FARM_MAX_REWARD, levelForCoins, REFERRAL_ACTIVE_BONUS } = require('../gameConfig');
const { logEvent } = require('../events');

const router = express.Router();

router.post('/', async (req, res) => {
  const { id: telegramId } = req.tgUser;
  const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found. Call /register first.' });

  const now = Date.now();
  const elapsed = now - user.last_farm_at;
  if (elapsed < FARM_COOLDOWN_MS) {
    return res.status(429).json({
      error: 'Farming on cooldown',
      retryAfterMs: FARM_COOLDOWN_MS - elapsed,
    });
  }

  const reward = Math.floor(Math.random() * (FARM_MAX_REWARD - FARM_MIN_REWARD + 1)) + FARM_MIN_REWARD;
  const newCoins = user.coins + reward;
  const newLevel = levelForCoins(newCoins);
  let referralBonusPaidTo = null;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE users SET coins = $1, level = $2, last_farm_at = $3, has_farmed_once = TRUE, farm_reminder_sent = FALSE
       WHERE telegram_id = $4`,
      [newCoins, newLevel, now, telegramId]
    );

    // Pay the referrer an "active friend" bonus the first time this user farms.
    if (!user.has_farmed_once && user.referred_by) {
      const refRow = await client.query(
        'SELECT * FROM referrals WHERE referred_id = $1 AND active_bonus_paid = FALSE',
        [telegramId]
      );
      if (refRow.rows[0]) {
        await client.query('UPDATE users SET coins = coins + $1 WHERE telegram_id = $2', [
          REFERRAL_ACTIVE_BONUS,
          refRow.rows[0].referrer_id,
        ]);
        await client.query('UPDATE referrals SET active_bonus_paid = TRUE WHERE id = $1', [refRow.rows[0].id]);
        referralBonusPaidTo = refRow.rows[0].referrer_id;
      }
    }
  });

  logEvent(telegramId, 'farm');
  if (referralBonusPaidTo) logEvent(referralBonusPaidTo, 'referral_active');

  const updated = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  res.json({ reward, user: updated.rows[0] });
});

module.exports = router;
