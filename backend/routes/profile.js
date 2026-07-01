const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { PETS, WORLD_ZONES, TAPPER_RANKS } = require('../gameConfig');

const router = express.Router();

function rankForTaps(taps) {
  let rank = TAPPER_RANKS[0];
  for (const r of TAPPER_RANKS) { if (taps >= r.minTaps) rank = r; }
  return rank;
}

// GET /profile/:telegramId — public profile
router.get('/:telegramId', asyncHandler(async (req, res) => {
  const targetId = req.params.telegramId;

  const [userRes, profileRes, petsRes, achieveRes, guildRes] = await Promise.all([
    pool.query('SELECT telegram_id, username FROM users WHERE telegram_id=$1', [targetId]),
    pool.query(
      'SELECT total_taps, prestige, active_pet, max_combo, max_combo_week, current_zone FROM tapper_profiles WHERE telegram_id=$1',
      [targetId]
    ),
    pool.query('SELECT pet_key FROM user_pets WHERE telegram_id=$1', [targetId]),
    pool.query('SELECT achievement_key FROM achievements WHERE telegram_id=$1', [targetId]),
    pool.query(
      `SELECT g.name, g.tag, g.level
       FROM guilds g JOIN guild_members gm ON gm.guild_id = g.id
       WHERE gm.telegram_id=$1 LIMIT 1`,
      [targetId]
    ),
  ]);

  if (!userRes.rows[0]) return res.status(404).json({ error: 'User not found' });

  const user = userRes.rows[0];
  const p = profileRes.rows[0] || {};
  const totalTaps = Number(p.total_taps) || 0;
  const activePetData = p.active_pet ? PETS.find(pet => pet.key === p.active_pet) || null : null;
  const zoneData = WORLD_ZONES.find(z => z.zone === (p.current_zone || 1)) || WORLD_ZONES[0];
  const weekKey = new Date().toISOString().slice(0, 7);

  res.json({
    telegramId: targetId,
    username: user.username || `User_${String(targetId).slice(-4)}`,
    totalTaps,
    prestige: p.prestige || 0,
    rank: rankForTaps(totalTaps),
    activePet: activePetData,
    petCount: petsRes.rows.length,
    maxCombo: p.max_combo_week === weekKey ? parseFloat(p.max_combo) || 1.0 : null,
    currentZone: zoneData,
    achievements: achieveRes.rows.map(r => r.achievement_key),
    guild: guildRes.rows[0] || null,
  });
}));

module.exports = router;
