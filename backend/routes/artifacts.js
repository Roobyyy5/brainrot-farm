const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { ARTIFACT_DEFINITIONS, ARTIFACT_RARITIES, ARTIFACT_COMBINE_COUNT } = require('../gameConfig');

const SLOTS = ['weapon', 'armor', 'relic', 'charm'];

// GET /artifacts
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const { rows } = await pool.query(
    'SELECT id, artifact_key, rarity, equipped_slot, acquired_at FROM user_artifacts WHERE telegram_id=$1 ORDER BY acquired_at DESC',
    [telegramId]
  );

  const inventory = rows.map(r => ({
    id: r.id,
    key: r.artifact_key,
    rarity: r.rarity,
    equippedSlot: r.equipped_slot || null,
    ...ARTIFACT_DEFINITIONS[r.artifact_key],
    acquiredAt: Number(r.acquired_at),
  }));

  const equipped = {};
  for (const a of inventory) {
    if (a.equippedSlot) equipped[a.equippedSlot] = a;
  }

  res.json({ inventory, equipped, slots: SLOTS, definitions: ARTIFACT_DEFINITIONS });
}));

// POST /artifacts/equip
router.post('/equip', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { artifactId } = req.body;

  await withTransaction(async (client) => {
    const artR = await client.query(
      'SELECT * FROM user_artifacts WHERE id=$1 AND telegram_id=$2 FOR UPDATE',
      [artifactId, telegramId]
    );
    if (!artR.rows[0]) throw Object.assign(new Error('Artifact not found'), { status: 404 });
    const art = artR.rows[0];
    const def = ARTIFACT_DEFINITIONS[art.artifact_key];
    if (!def) throw Object.assign(new Error('Unknown artifact definition'), { status: 400 });

    // Unequip any current artifact in that slot
    await client.query(
      "UPDATE user_artifacts SET equipped_slot=NULL WHERE telegram_id=$1 AND equipped_slot=$2",
      [telegramId, def.slot]
    );
    await client.query(
      'UPDATE user_artifacts SET equipped_slot=$1 WHERE id=$2',
      [def.slot, artifactId]
    );
  });

  res.json({ ok: true });
}));

// POST /artifacts/unequip
router.post('/unequip', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { slot } = req.body;
  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });

  await pool.query(
    "UPDATE user_artifacts SET equipped_slot=NULL WHERE telegram_id=$1 AND equipped_slot=$2",
    [telegramId, slot]
  );
  res.json({ ok: true });
}));

// POST /artifacts/combine — 3 same key same rarity → upgrade rarity
router.post('/combine', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { artifactKey, rarity } = req.body;

  if (!ARTIFACT_DEFINITIONS[artifactKey]) return res.status(400).json({ error: 'Unknown artifact' });
  const rarityIdx = ARTIFACT_RARITIES.indexOf(rarity);
  if (rarityIdx === -1) return res.status(400).json({ error: 'Unknown rarity' });
  if (rarityIdx >= ARTIFACT_RARITIES.length - 1) return res.status(400).json({ error: 'Already max rarity' });

  await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT id FROM user_artifacts WHERE telegram_id=$1 AND artifact_key=$2 AND rarity=$3 AND equipped_slot IS NULL FOR UPDATE',
      [telegramId, artifactKey, rarity]
    );
    if (rows.length < ARTIFACT_COMBINE_COUNT) {
      throw Object.assign(
        new Error(`Need ${ARTIFACT_COMBINE_COUNT} unequipped ${rarity} ${artifactKey} to combine`),
        { status: 400 }
      );
    }

    // Delete 3, insert 1 upgraded
    const toDelete = rows.slice(0, ARTIFACT_COMBINE_COUNT).map(r => r.id);
    await client.query('DELETE FROM user_artifacts WHERE id = ANY($1)', [toDelete]);

    const newRarity = ARTIFACT_RARITIES[rarityIdx + 1];
    await client.query(
      'INSERT INTO user_artifacts (telegram_id, artifact_key, rarity, acquired_at) VALUES ($1,$2,$3,$4)',
      [telegramId, artifactKey, newRarity, Date.now()]
    );
  });

  res.json({ ok: true });
}));

// Helper: grant a random artifact (used by boss drops / loot boxes)
async function grantRandomArtifact(telegramId, options = {}) {
  const { minRarity = 'common', slot = null } = options;
  const rarityIdx = ARTIFACT_RARITIES.indexOf(minRarity);
  const pool2 = require('../db').pool;
  const candidates = Object.entries(ARTIFACT_DEFINITIONS).filter(([, def]) => {
    if (slot && def.slot !== slot) return false;
    return ARTIFACT_RARITIES.indexOf(def.rarity) >= rarityIdx;
  });
  if (candidates.length === 0) return null;
  const [key] = candidates[Math.floor(Math.random() * candidates.length)];
  const def = ARTIFACT_DEFINITIONS[key];
  await pool2.query(
    'INSERT INTO user_artifacts (telegram_id, artifact_key, rarity, acquired_at) VALUES ($1,$2,$3,$4)',
    [telegramId, key, def.rarity, Date.now()]
  );
  return { key, ...def };
}

module.exports = { router, grantRandomArtifact };
