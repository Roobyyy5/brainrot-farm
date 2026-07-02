const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TAP_STREAK_CALENDAR } = require('../gameConfig');

const router = express.Router();

const todayKey = () => new Date().toISOString().slice(0, 10);

// GET /tapstreakcal — auto-advance streak on new day visits
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const today = todayKey();

  let { rows: [row] } = await pool.query(
    'SELECT * FROM tap_streak_cal WHERE telegram_id=$1', [telegramId]
  );
  if (!row) {
    await pool.query(
      `INSERT INTO tap_streak_cal (telegram_id) VALUES ($1) ON CONFLICT DO NOTHING`, [telegramId]
    );
    row = { current_streak: 0, longest_streak: 0, last_active_day: '', claimed_days: [] };
  }

  let streak = Number(row.current_streak);
  const lastDay = row.last_active_day;
  const claimedDays = Array.isArray(row.claimed_days) ? row.claimed_days : JSON.parse(row.claimed_days || '[]');

  // Auto-advance if visiting for the first time today
  if (lastDay !== today) {
    const prev = new Date();
    prev.setDate(prev.getDate() - 1);
    const yesterday = prev.toISOString().slice(0, 10);

    if (lastDay === yesterday || lastDay === '') {
      streak = Math.min(streak + 1, 30);
    } else {
      streak = 1;
    }

    await pool.query(
      `UPDATE tap_streak_cal
       SET current_streak=$1, longest_streak=GREATEST(longest_streak,$1), last_active_day=$2
       WHERE telegram_id=$3`,
      [streak, today, telegramId]
    );
  }

  res.json({
    streak,
    longestStreak: Number(row.longest_streak),
    lastActiveDay: today,
    claimedDays,
    calendar: TAP_STREAK_CALENDAR,
    currentDay: streak,
  });
}));

// POST /tapstreakcal/claim
router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { day } = req.body;
  const dayDef = TAP_STREAK_CALENDAR.find(d => d.day === day);
  if (!dayDef) return res.status(400).json({ error: 'Invalid day' });

  return withTransaction(async (client) => {
    const { rows: [row] } = await client.query(
      'SELECT * FROM tap_streak_cal WHERE telegram_id=$1 FOR UPDATE', [telegramId]
    );
    if (!row) return res.status(400).json({ error: 'No streak record' });

    if (day > Number(row.current_streak)) return res.status(400).json({ error: 'Day not reached' });

    const claimed = Array.isArray(row.claimed_days)
      ? row.claimed_days
      : JSON.parse(row.claimed_days || '[]');
    if (claimed.includes(day)) return res.status(400).json({ error: 'Already claimed' });

    claimed.push(day);
    await client.query(
      'UPDATE tap_streak_cal SET claimed_days=$1 WHERE telegram_id=$2',
      [JSON.stringify(claimed), telegramId]
    );

    if (dayDef.reward.gems > 0) {
      await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [dayDef.reward.gems, telegramId]);
    }

    return res.json({ ok: true, day, reward: dayDef.reward, claimed });
  });
}));

module.exports = router;
