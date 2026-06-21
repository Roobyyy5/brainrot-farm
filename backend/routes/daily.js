const express = require('express');
const { pool } = require('../db');
const {
  DAILY_COOLDOWN_MS,
  DAILY_STREAK_RESET_MS,
  DAILY_BASE_REWARD,
  DAILY_STREAK_STEP,
  DAILY_STREAK_MAX_BONUS,
  levelForCoins,
} = require('../gameConfig');
const { logEvent } = require('../events');
const { checkAndGrantAchievements } = require('../achievements');

const router = express.Router();

router.post('/', async (req, res) => {
  const { id: telegramId } = req.tgUser;
  const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found. Call /register first.' });

  const now = Date.now();
  const elapsed = now - user.last_daily_at;

  if (elapsed < DAILY_COOLDOWN_MS) {
    return res.status(429).json({
      error: 'Daily reward already claimed',
      retryAfterMs: DAILY_COOLDOWN_MS - elapsed,
    });
  }

  const streakBroken = elapsed > DAILY_STREAK_RESET_MS;
  const newStreak = streakBroken ? 1 : user.daily_streak + 1;
  const streakBonus = Math.min((newStreak - 1) * DAILY_STREAK_STEP, DAILY_STREAK_MAX_BONUS);
  const reward = DAILY_BASE_REWARD + streakBonus;
  const newCoins = user.coins + reward;
  const newLevel = levelForCoins(newCoins);

  await pool.query(
    `UPDATE users SET coins = $1, weekly_coins = weekly_coins + $2, level = $3, last_daily_at = $4,
            daily_streak = $5, daily_reminder_sent = FALSE
     WHERE telegram_id = $6`,
    [newCoins, reward, newLevel, now, newStreak, telegramId]
  );

  logEvent(telegramId, 'daily');

  const updated = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  const unlockedAchievements = await checkAndGrantAchievements(telegramId, updated.rows[0]);

  const final = unlockedAchievements.length
    ? await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId])
    : updated;

  res.json({ reward, streak: newStreak, user: final.rows[0], unlockedAchievements });
});

module.exports = router;
