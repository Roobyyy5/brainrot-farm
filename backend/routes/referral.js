const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { id: telegramId } = req.tgUser;
    const userResult = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found. Call /register first.' });

    const referralsResult = await pool.query(
      `SELECT r.referred_id, u.username, u.coins, r.signup_bonus_paid, r.active_bonus_paid, r.created_at
       FROM referrals r
       JOIN users u ON u.telegram_id = r.referred_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [telegramId]
    );
    const referrals = referralsResult.rows;

    res.json({
      referralCode: user.referral_code,
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter((r) => r.active_bonus_paid).length,
      referrals,
    });
  })
);

module.exports = router;
