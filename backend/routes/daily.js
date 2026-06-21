const express = require('express');
const db = require('../db');
const {
  DAILY_COOLDOWN_MS,
  DAILY_STREAK_RESET_MS,
  DAILY_BASE_REWARD,
  DAILY_STREAK_STEP,
  DAILY_STREAK_MAX_BONUS,
  levelForCoins,
} = require('../gameConfig');

const router = express.Router();

router.post('/', (req, res) => {
  const { id: telegramId } = req.tgUser;
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
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

  db.prepare(`
    UPDATE users SET coins = ?, level = ?, last_daily_at = ?, daily_streak = ?
    WHERE telegram_id = ?
  `).run(newCoins, newLevel, now, newStreak, telegramId);

  const updated = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  res.json({ reward, streak: newStreak, user: updated });
});

module.exports = router;
