const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

// GET /buildpresets
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    'SELECT slot, name, data, saved_at FROM build_presets WHERE telegram_id=$1 ORDER BY slot',
    [telegramId]
  );
  res.json({ presets: rows.map(r => ({ slot: r.slot, name: r.name, data: r.data, savedAt: Number(r.saved_at) })) });
}));

// POST /buildpresets/save — snapshot current tapper config into a slot
router.post('/save', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const slot = parseInt(req.body.slot);
  const name = String(req.body.name || `Preset ${slot}`).slice(0, 32);
  if (![1, 2, 3].includes(slot)) return res.status(400).json({ error: 'Slot must be 1, 2 or 3' });

  const result = await withTransaction(async (client) => {
    // Snapshot profile + equipped artifacts + active skills
    const { rows: [profile] } = await client.query(
      `SELECT tap_power_level, energy_max_level, regen_rate_level, multi_tap_level, auto_brain_level,
              active_pet, active_skin, talents_chosen
       FROM tapper_profiles WHERE telegram_id=$1`,
      [telegramId]
    );
    const { rows: equipped } = await client.query(
      'SELECT artifact_key, equipped_slot FROM user_artifacts WHERE telegram_id=$1 AND equipped_slot IS NOT NULL',
      [telegramId]
    );
    const { rows: skills } = await client.query(
      'SELECT skill_key, level FROM user_skills WHERE telegram_id=$1',
      [telegramId]
    );

    const data = {
      upgrades: {
        tapPower:  profile?.tap_power_level  || 0,
        energyMax: profile?.energy_max_level || 0,
        regenRate: profile?.regen_rate_level || 0,
        multiTap:  profile?.multi_tap_level  || 0,
        autoBrain: profile?.auto_brain_level || 0,
      },
      pet:      profile?.active_pet   || null,
      skin:     profile?.active_skin  || 'default',
      talents:  profile?.talents_chosen || [],
      artifacts: Object.fromEntries(equipped.map(e => [e.equipped_slot, e.artifact_key])),
      skills:   Object.fromEntries(skills.map(s => [s.skill_key, s.level])),
    };

    await client.query(
      `INSERT INTO build_presets (telegram_id, slot, name, data, saved_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (telegram_id, slot) DO UPDATE SET name=$3, data=$4, saved_at=$5`,
      [telegramId, slot, name, JSON.stringify(data), Date.now()]
    );

    return { slot, name, data };
  });

  res.json(result);
}));

// POST /buildpresets/delete
router.post('/delete', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const slot = parseInt(req.body.slot);
  if (![1, 2, 3].includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  await pool.query('DELETE FROM build_presets WHERE telegram_id=$1 AND slot=$2', [telegramId, slot]);
  res.json({ ok: true });
}));

module.exports = router;
