const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { REFERRAL_SIGNUP_BONUS } = require('../gameConfig');

const router = express.Router();

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex');
}

router.post('/', (req, res) => {
  const { id: telegramId, username } = req.tgUser;
  const { ref } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  if (existing) {
    return res.json({ user: existing, alreadyRegistered: true });
  }

  let referredBy = null;
  if (ref) {
    const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(ref);
    if (referrer && referrer.telegram_id !== telegramId) {
      referredBy = referrer.telegram_id;
    }
  }

  let referralCode = generateReferralCode();
  while (db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(referralCode)) {
    referralCode = generateReferralCode();
  }

  const now = Date.now();

  const insertUser = db.prepare(`
    INSERT INTO users (telegram_id, username, coins, level, last_farm_at, last_daily_at, daily_streak, referral_code, referred_by, has_farmed_once, created_at)
    VALUES (?, ?, 0, 'NPC', 0, 0, 0, ?, ?, 0, ?)
  `);

  const tx = db.transaction(() => {
    insertUser.run(telegramId, username, referralCode, referredBy, now);

    if (referredBy) {
      db.prepare('UPDATE users SET coins = coins + ? WHERE telegram_id = ?')
        .run(REFERRAL_SIGNUP_BONUS, referredBy);
      db.prepare(`
        INSERT INTO referrals (referrer_id, referred_id, signup_bonus_paid, active_bonus_paid, created_at)
        VALUES (?, ?, 1, 0, ?)
      `).run(referredBy, telegramId, now);
    }
  });
  tx();

  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  res.json({ user, alreadyRegistered: false });
});

module.exports = router;
