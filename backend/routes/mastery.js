const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TAPPER_UPGRADES, MASTERY_LEVEL_XP, MASTERY_MAX_LEVEL, MASTERY_MILESTONES, getMasteryBonus } = require('../gameConfig');

// GET /mastery
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const { rows } = await pool.query(
    'SELECT upgrade_key, mastery_xp, mastery_level FROM upgrade_mastery WHERE telegram_id=$1',
    [telegramId]
  );
  const masteryMap = {};
  for (const r of rows) masteryMap[r.upgrade_key] = { xp: Number(r.mastery_xp), level: Number(r.mastery_level) };

  const upgrades = Object.entries(TAPPER_UPGRADES).map(([key]) => {
    const k = key.toLowerCase();
    const m = masteryMap[k] || { xp: 0, level: 0 };
    const xpToNext = m.level < MASTERY_MAX_LEVEL ? MASTERY_LEVEL_XP - (m.xp % MASTERY_LEVEL_XP) : 0;
    const bonusPct = getMasteryBonus(m.level);
    return {
      key: k,
      label: TAPPER_UPGRADES[key].label,
      icon: TAPPER_UPGRADES[key].icon,
      masteryXp: m.xp,
      masteryLevel: m.level,
      masteryMax: MASTERY_MAX_LEVEL,
      xpToNext: m.level >= MASTERY_MAX_LEVEL ? 0 : xpToNext,
      bonusPct,
      milestones: MASTERY_MILESTONES,
    };
  });

  res.json({ upgrades });
}));

// GET /mastery/bonuses — returns effective bonus% per upgrade (used in tapper GET)
async function getMasteryBonusMap(telegramId) {
  const { rows } = await pool.query(
    'SELECT upgrade_key, mastery_level FROM upgrade_mastery WHERE telegram_id=$1',
    [telegramId]
  );
  const map = {};
  for (const r of rows) map[r.upgrade_key] = getMasteryBonus(Number(r.mastery_level));
  return map;
}

module.exports = { router, getMasteryBonusMap };
