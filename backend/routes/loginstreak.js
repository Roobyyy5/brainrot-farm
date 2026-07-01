const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { LOGIN_STREAK_REWARDS, TAPPER_UPGRADES } = require('../gameConfig');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    'SELECT login_streak, last_login_date FROM users WHERE telegram_id=$1', [telegramId]
  );
  const today = new Date().toISOString().slice(0, 10);
  const streak = rows[0]?.login_streak || 0;
  const canClaim = (rows[0]?.last_login_date || '') !== today;
  const rewardIndex = streak % LOGIN_STREAK_REWARDS.length;
  res.json({
    streak,
    canClaim,
    reward: LOGIN_STREAK_REWARDS[rewardIndex],
    allRewards: LOGIN_STREAK_REWARDS,
  });
}));

router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT login_streak, last_login_date FROM users WHERE telegram_id=$1 FOR UPDATE', [telegramId]
    );
    if (!rows[0]) return { error: 'User not found' };
    const { login_streak: streak, last_login_date: lastDate } = rows[0];
    if (lastDate === today) return { error: 'Already claimed today' };

    const newStreak = lastDate === yesterday ? streak + 1 : 1;
    const reward = LOGIN_STREAK_REWARDS[(newStreak - 1) % LOGIN_STREAK_REWARDS.length];
    await client.query(
      'UPDATE users SET login_streak=$1, last_login_date=$2 WHERE telegram_id=$3',
      [newStreak, today, telegramId]
    );
    const now = Date.now();
    if (reward.type === 'coins') {
      await client.query('UPDATE users SET coins=coins+$1, weekly_coins=weekly_coins+$1 WHERE telegram_id=$2', [reward.amount, telegramId]);
    } else if (reward.type === 'gems') {
      await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [reward.amount, telegramId]);
    } else if (reward.type === 'energy_refill') {
      const { rows: tp } = await client.query('SELECT energy_max_level FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
      const max = TAPPER_UPGRADES.ENERGY_MAX.getEffect(tp[0]?.energy_max_level || 0);
      await client.query('UPDATE tapper_profiles SET energy=$1, last_energy_at=$2 WHERE telegram_id=$3', [max, now, telegramId]);
    }
    return { success: true, streak: newStreak, reward };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
