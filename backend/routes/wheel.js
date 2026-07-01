const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { WHEEL_PRIZES, pickWheelPrize } = require('../gameConfig');

const router = express.Router();

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

// GET /wheel — check if user can spin today
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const key = todayKey();
  const { rows } = await pool.query(
    'SELECT * FROM wheel_spins WHERE telegram_id = $1 AND spun_at >= $2 ORDER BY spun_at DESC LIMIT 1',
    [telegramId, new Date(key).getTime()]
  );
  res.json({
    canSpin: rows.length === 0,
    lastSpin: rows[0] || null,
    prizes: WHEEL_PRIZES.map((p, i) => ({ ...p, index: i })),
  });
}));

// POST /wheel/spin — spend free daily spin
router.post('/spin', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const now = Date.now();
  const dayStart = new Date(todayKey()).getTime();

  const result = await withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM wheel_spins WHERE telegram_id = $1 AND spun_at >= $2',
      [telegramId, dayStart]
    );
    if (existing.rows.length > 0) return { error: 'Already spun today' };

    const prize = pickWheelPrize();

    await client.query(
      'INSERT INTO wheel_spins (telegram_id, spun_at, prize_type, prize_value, prize_index) VALUES ($1,$2,$3,$4,$5)',
      [telegramId, now, prize.type, prize.value, prize.index]
    );

    if (prize.type === 'coins') {
      await client.query(
        'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
        [prize.value, telegramId]
      );
    } else if (prize.type === 'gems') {
      await client.query(
        'UPDATE users SET gems = gems + $1 WHERE telegram_id = $2',
        [prize.value, telegramId]
      );
    } else if (prize.type === 'energy') {
      // Restore energy to max
      await client.query(
        `UPDATE tapper_profiles SET energy = (
           SELECT 1000 + energy_max_level * 1000 FROM tapper_profiles WHERE telegram_id = $1
         ) WHERE telegram_id = $1`,
        [telegramId]
      );
    }

    return { success: true, prize };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
