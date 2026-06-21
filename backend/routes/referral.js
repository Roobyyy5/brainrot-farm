const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { id: telegramId } = req.tgUser;
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  if (!user) return res.status(404).json({ error: 'User not found. Call /register first.' });

  const referrals = db.prepare(`
    SELECT r.referred_id, u.username, u.coins, r.signup_bonus_paid, r.active_bonus_paid, r.created_at
    FROM referrals r
    JOIN users u ON u.telegram_id = r.referred_id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `).all(telegramId);

  res.json({
    referralCode: user.referral_code,
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter((r) => r.active_bonus_paid).length,
    referrals,
  });
});

module.exports = router;
