const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const {
  CONSTELLATION_NODES, CONSTELLATION_UNLOCK_ASCENSION,
  CONSTELLATION_PRESTIGE_STARDUST, CONSTELLATION_ASCENSION_STARDUST,
} = require('../gameConfig');

const router = express.Router();

function computeEarned(prestige, ascension) {
  return prestige * CONSTELLATION_PRESTIGE_STARDUST + ascension * CONSTELLATION_ASCENSION_STARDUST;
}

// GET /constellation
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;

  const [profileRes, unlockedRes] = await Promise.all([
    pool.query('SELECT ascension_count, prestige FROM tapper_profiles WHERE telegram_id=$1', [telegramId]),
    pool.query('SELECT node_id FROM constellation_unlocks WHERE telegram_id=$1', [telegramId]),
  ]);

  const profile = profileRes.rows[0] || {};
  const ascension = Number(profile.ascension_count || 0);
  const prestige = Number(profile.prestige || 0);
  const unlocked = new Set(unlockedRes.rows.map(r => r.node_id));
  const constellationUnlocked = ascension >= CONSTELLATION_UNLOCK_ASCENSION;

  if (constellationUnlocked && !unlocked.has('cs_root')) {
    await pool.query(
      `INSERT INTO constellation_unlocks (telegram_id, node_id, unlocked_at) VALUES ($1,'cs_root',$2) ON CONFLICT DO NOTHING`,
      [telegramId, Date.now()]
    );
    unlocked.add('cs_root');
  }

  const totalEarned = computeEarned(prestige, ascension);
  const spent = CONSTELLATION_NODES
    .filter(n => unlocked.has(n.id))
    .reduce((s, n) => s + n.cost, 0);
  const available = totalEarned - spent;

  res.json({
    constellationUnlocked,
    requiredAscension: CONSTELLATION_UNLOCK_ASCENSION,
    totalEarned,
    available,
    spent,
    totalUnlocked: unlocked.size,
    nodes: CONSTELLATION_NODES.map(n => ({
      ...n,
      unlocked: unlocked.has(n.id),
      available: !unlocked.has(n.id) && n.requires.every(r => unlocked.has(r)) && available >= n.cost,
    })),
  });
}));

// POST /constellation/unlock
router.post('/unlock', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { nodeId } = req.body;
  const node = CONSTELLATION_NODES.find(n => n.id === nodeId);
  if (!node) return res.status(400).json({ error: 'Unknown node' });

  return withTransaction(async (client) => {
    const { rows: [profile] } = await client.query(
      'SELECT ascension_count, prestige FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
    );
    const ascension = Number(profile?.ascension_count || 0);
    const prestige = Number(profile?.prestige || 0);
    if (ascension < CONSTELLATION_UNLOCK_ASCENSION) {
      return res.status(403).json({ error: `Requires Ascension ${CONSTELLATION_UNLOCK_ASCENSION}` });
    }

    const { rows: owned } = await client.query(
      'SELECT node_id FROM constellation_unlocks WHERE telegram_id=$1', [telegramId]
    );
    const ownedSet = new Set(owned.map(r => r.node_id));

    if (ownedSet.has(nodeId)) return res.status(400).json({ error: 'Already unlocked' });
    for (const req of node.requires) {
      if (!ownedSet.has(req)) return res.status(400).json({ error: `Requires: ${req}` });
    }

    const totalEarned = computeEarned(prestige, ascension);
    const spent = CONSTELLATION_NODES.filter(n => ownedSet.has(n.id)).reduce((s, n) => s + n.cost, 0);
    if (totalEarned - spent < node.cost) return res.status(400).json({ error: 'Not enough Stardust' });

    await client.query(
      `INSERT INTO constellation_unlocks (telegram_id, node_id, unlocked_at) VALUES ($1,$2,$3)`,
      [telegramId, nodeId, Date.now()]
    );
    return res.json({ ok: true, nodeId, cost: node.cost, bonus: node.bonus });
  });
}));

module.exports = router;
