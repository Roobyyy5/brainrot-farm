const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { BRAIN_SKINS } = require('../gameConfig');

// GET /wardrobe
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const r = await db.query(
    'SELECT skins_unlocked, selected_skin, prestige FROM tapper_profiles WHERE telegram_id = $1',
    [telegramId]
  );
  if (!r.rows[0]) return res.json({ skins: [], selected: 'default' });

  const { skins_unlocked, selected_skin, prestige } = r.rows[0];
  const ownedSet = new Set(skins_unlocked || []);

  for (const [key, skin] of Object.entries(BRAIN_SKINS)) {
    if (skin.unlock === 'prestige' && skin.auto && prestige >= (skin.minPrestige || 0)) {
      ownedSet.add(key);
    }
  }

  const skins = Object.entries(BRAIN_SKINS).map(([key, skin]) => ({
    key,
    name:   skin.name,
    emoji:  skin.emoji,
    unlock: skin.unlock,
    owned:  key === 'default' || ownedSet.has(key),
    active: key === (selected_skin || 'default'),
  }));

  res.json({ skins, selected: selected_skin || 'default' });
}));

// POST /wardrobe/equip
router.post('/equip', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { skinKey } = req.body;
  if (!skinKey || !BRAIN_SKINS[skinKey]) return res.status(400).json({ error: 'Invalid skin' });

  const r = await db.query('SELECT skins_unlocked, prestige FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Profile not found' });

  const { skins_unlocked, prestige } = r.rows[0];
  const skin = BRAIN_SKINS[skinKey];
  const owned = skinKey === 'default'
    || (skins_unlocked || []).includes(skinKey)
    || (skin.unlock === 'prestige' && skin.auto && prestige >= (skin.minPrestige || 0));

  if (!owned) return res.status(403).json({ error: 'Skin not owned' });

  await db.query('UPDATE tapper_profiles SET selected_skin = $1 WHERE telegram_id = $2', [skinKey, telegramId]);
  res.json({ ok: true, selected: skinKey });
}));

module.exports = router;
