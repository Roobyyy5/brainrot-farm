const express = require('express');
const { pool } = require('../db');
const { ACHIEVEMENTS } = require('../gameConfig');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { id: telegramId } = req.tgUser;
    const unlocked = await pool.query('SELECT achievement_key, created_at FROM achievements WHERE telegram_id = $1', [
      telegramId,
    ]);
    const unlockedMap = new Map(unlocked.rows.map((r) => [r.achievement_key, r.created_at]));

    const list = ACHIEVEMENTS.map(({ key, name, emoji, reward }) => ({
      key,
      name,
      emoji,
      reward,
      unlocked: unlockedMap.has(key),
      unlockedAt: unlockedMap.get(key) || null,
    }));

    res.json({ achievements: list });
  })
);

module.exports = router;
