const express = require('express');
const crypto = require('crypto');
const { pool, withTransaction } = require('../db');
const { REFERRAL_SIGNUP_BONUS } = require('../gameConfig');
const { logEvent } = require('../events');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex');
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { id: telegramId, username } = req.tgUser;
    const { ref } = req.body;

    const existing = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (existing.rows[0]) {
      return res.json({ user: existing.rows[0], alreadyRegistered: true });
    }

    let referredBy = null;
    if (ref) {
      const referrer = await pool.query('SELECT * FROM users WHERE referral_code = $1', [ref]);
      if (referrer.rows[0] && referrer.rows[0].telegram_id !== telegramId) {
        referredBy = referrer.rows[0].telegram_id;
      }
    }

    let referralCode = generateReferralCode();
    while ((await pool.query('SELECT 1 FROM users WHERE referral_code = $1', [referralCode])).rows[0]) {
      referralCode = generateReferralCode();
    }

    const now = Date.now();

    // ON CONFLICT DO NOTHING handles two near-simultaneous /register calls
    // for the same brand-new telegram_id (e.g. a double-tap) gracefully
    // instead of throwing a unique-violation that would 500 one of them.
    const inserted = await withTransaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO users (telegram_id, username, coins, level, last_farm_at, last_daily_at, daily_streak, referral_code, referred_by, has_farmed_once, created_at)
         VALUES ($1, $2, 0, 'NPC', 0, 0, 0, $3, $4, FALSE, $5)
         ON CONFLICT (telegram_id) DO NOTHING
         RETURNING telegram_id`,
        [telegramId, username, referralCode, referredBy, now]
      );

      if (insertResult.rows[0] && referredBy) {
        await client.query('UPDATE users SET coins = coins + $1 WHERE telegram_id = $2', [
          REFERRAL_SIGNUP_BONUS,
          referredBy,
        ]);
        await client.query(
          `INSERT INTO referrals (referrer_id, referred_id, signup_bonus_paid, active_bonus_paid, created_at)
           VALUES ($1, $2, TRUE, FALSE, $3)
           ON CONFLICT (referred_id) DO NOTHING`,
          [referredBy, telegramId, now]
        );
      }

      return Boolean(insertResult.rows[0]);
    });

    const user = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (inserted) {
      logEvent(telegramId, 'register');
      if (referredBy) logEvent(referredBy, 'referral_signup');
    }
    res.json({ user: user.rows[0], alreadyRegistered: !inserted });
  })
);

module.exports = router;
