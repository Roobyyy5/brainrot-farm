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
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
  const { id: telegramId } = req.tgUser;
  const now = Date.now();

  // The streak/reward math has to happen atomically against the row's
  // pre-update state (same lost-update hazard as /farm — see comment there).
  // `daily_streak` and `last_daily_at` on the right-hand side of SET refer to
  // the row's value before this statement, so the CASE expressions are safe
  // to evaluate against a concurrently-arriving second request: Postgres
  // serializes via the row lock and the WHERE re-check fails for the loser.
  const updateResult = await pool.query(
    `UPDATE users SET
       daily_streak = CASE WHEN $1 - last_daily_at > $2 THEN 1 ELSE daily_streak + 1 END,
       last_daily_at = $1,
       daily_reminder_sent = FALSE
     WHERE telegram_id = $3 AND $1 - last_daily_at >= $4
     RETURNING *`,
    [now, DAILY_STREAK_RESET_MS, telegramId, DAILY_COOLDOWN_MS]
  );

  if (!updateResult.rows[0]) {
    const existing = await pool.query('SELECT last_daily_at FROM users WHERE telegram_id = $1', [telegramId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'User not found. Call /register first.' });
    const elapsed = now - existing.rows[0].last_daily_at;
    return res.status(429).json({
      error: 'Daily reward already claimed',
      retryAfterMs: DAILY_COOLDOWN_MS - elapsed,
    });
  }

  let user = updateResult.rows[0];
  const newStreak = user.daily_streak;
  const streakBonus = Math.min((newStreak - 1) * DAILY_STREAK_STEP, DAILY_STREAK_MAX_BONUS);
  const reward = DAILY_BASE_REWARD + streakBonus;

  const rewarded = await pool.query(
    'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2 RETURNING *',
    [reward, telegramId]
  );
  user = rewarded.rows[0];

  const newLevel = levelForCoins(user.coins);
  if (newLevel !== user.level) {
    const leveled = await pool.query('UPDATE users SET level = $1 WHERE telegram_id = $2 RETURNING *', [
      newLevel,
      telegramId,
    ]);
    user = leveled.rows[0];
  }

  logEvent(telegramId, 'daily');

  const unlockedAchievements = await checkAndGrantAchievements(telegramId, user);
  if (unlockedAchievements.length) {
    const final = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    user = final.rows[0];
  }

    res.json({ reward, streak: newStreak, user, unlockedAchievements });
  })
);

module.exports = router;
