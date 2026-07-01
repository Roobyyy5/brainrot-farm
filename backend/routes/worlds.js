const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { WORLD_ZONES } = require('../gameConfig');

const router = express.Router();

// GET /worlds — all zones + current state
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { rows } = await pool.query(
    'SELECT current_zone, total_taps FROM tapper_profiles WHERE telegram_id=$1',
    [tid]
  );
  const profile = rows[0] || { current_zone: 1, total_taps: 0 };
  const totalTaps = Number(profile.total_taps);
  const currentZone = profile.current_zone || 1;

  const zones = WORLD_ZONES.map(z => ({
    ...z,
    unlocked: totalTaps >= z.unlockTaps,
    current: z.zone === currentZone,
    canAdvance: z.zone === currentZone + 1 && totalTaps >= z.unlockTaps,
  }));

  res.json({ zones, currentZone, totalTaps });
}));

// POST /worlds/advance — move to next zone
router.post('/advance', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { rows } = await pool.query(
    'SELECT current_zone, total_taps FROM tapper_profiles WHERE telegram_id=$1',
    [tid]
  );
  if (!rows.length) return res.status(400).json({ error: 'No tapper profile' });

  const currentZone = rows[0].current_zone || 1;
  const totalTaps = Number(rows[0].total_taps);
  const next = WORLD_ZONES.find(z => z.zone === currentZone + 1);

  if (!next) return res.status(400).json({ error: 'Already in final zone' });
  if (totalTaps < next.unlockTaps) {
    return res.status(400).json({ error: `Need ${next.unlockTaps.toLocaleString()} taps` });
  }

  await pool.query(
    'UPDATE tapper_profiles SET current_zone=$1 WHERE telegram_id=$2',
    [next.zone, tid]
  );
  res.json({ zone: next });
}));

module.exports = router;
