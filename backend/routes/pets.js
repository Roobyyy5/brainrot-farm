const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { PETS, PET_RARITY_COLOR } = require('../gameConfig');

const router = express.Router();

// GET /pets — full collection with owned/active flags
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const [profileRes, petsRes] = await Promise.all([
    pool.query('SELECT active_pet FROM tapper_profiles WHERE telegram_id=$1', [tid]),
    pool.query('SELECT pet_key FROM user_pets WHERE telegram_id=$1', [tid]),
  ]);
  const activePet = profileRes.rows[0]?.active_pet || '';
  const ownedKeys = new Set(petsRes.rows.map(r => r.pet_key));
  const pets = PETS.map(p => ({
    ...p,
    color: PET_RARITY_COLOR[p.rarity],
    owned: ownedKeys.has(p.key),
    active: p.key === activePet,
  }));
  res.json({ pets, activePet });
}));

// POST /pets/equip — equip or unequip (petKey = '' to unequip)
router.post('/equip', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { petKey } = req.body;
  if (petKey === undefined) return res.status(400).json({ error: 'petKey required' });

  if (petKey !== '') {
    const pet = PETS.find(p => p.key === petKey);
    if (!pet) return res.status(400).json({ error: 'Unknown pet' });
    const { rows } = await pool.query(
      'SELECT 1 FROM user_pets WHERE telegram_id=$1 AND pet_key=$2',
      [tid, petKey]
    );
    if (!rows.length) return res.status(400).json({ error: 'Pet not owned' });
  }

  await pool.query(
    'UPDATE tapper_profiles SET active_pet=$1 WHERE telegram_id=$2',
    [petKey, tid]
  );
  res.json({ activePet: petKey });
}));

module.exports = router;
