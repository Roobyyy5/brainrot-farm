const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { NEURAL_TREE_NODES, NEURAL_TREE_UNLOCK_ASCENSION } = require('../gameConfig');

const router = express.Router();

// GET /neuraltree
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const [unlockedRes, pointsRes, profileRes] = await Promise.all([
    pool.query('SELECT node_id FROM neural_tree WHERE telegram_id=$1', [telegramId]),
    pool.query('SELECT points FROM neural_points WHERE telegram_id=$1', [telegramId]),
    pool.query('SELECT ascension_count FROM tapper_profiles WHERE telegram_id=$1', [telegramId]),
  ]);

  const ascension = Number(profileRes.rows[0]?.ascension_count || 0);
  const unlocked = new Set(unlockedRes.rows.map(r => r.node_id));
  const points = Number(pointsRes.rows[0]?.points || 0);
  const treeUnlocked = ascension >= NEURAL_TREE_UNLOCK_ASCENSION;

  // Root node is always unlocked if tree is accessible
  if (treeUnlocked && !unlocked.has('root')) {
    await pool.query(
      `INSERT INTO neural_tree (telegram_id, node_id, unlocked_at) VALUES ($1,'root',$2) ON CONFLICT DO NOTHING`,
      [telegramId, Date.now()]
    );
    unlocked.add('root');
  }

  res.json({
    treeUnlocked,
    requiredAscension: NEURAL_TREE_UNLOCK_ASCENSION,
    points,
    nodes: NEURAL_TREE_NODES.map(n => ({
      ...n,
      unlocked: unlocked.has(n.id),
      available: !unlocked.has(n.id) && n.requires.every(r => unlocked.has(r)) && points >= n.cost,
      canAfford: points >= n.cost,
    })),
    totalUnlocked: unlocked.size,
  });
}));

// POST /neuraltree/unlock
router.post('/unlock', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { nodeId } = req.body;
  const node = NEURAL_TREE_NODES.find(n => n.id === nodeId);
  if (!node) return res.status(400).json({ error: 'Unknown node' });

  return withTransaction(async (client) => {
    const { rows: [profile] } = await client.query('SELECT ascension_count FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    if (Number(profile?.ascension_count || 0) < NEURAL_TREE_UNLOCK_ASCENSION) {
      return res.status(403).json({ error: `Requires Ascension ${NEURAL_TREE_UNLOCK_ASCENSION}` });
    }

    const existing = await client.query('SELECT 1 FROM neural_tree WHERE telegram_id=$1 AND node_id=$2', [telegramId, nodeId]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Already unlocked' });

    // Check requirements
    const { rows: ownedNodes } = await client.query('SELECT node_id FROM neural_tree WHERE telegram_id=$1', [telegramId]);
    const owned = new Set(ownedNodes.map(r => r.node_id));
    for (const req of node.requires) {
      if (!owned.has(req)) return res.status(400).json({ error: `Requires node: ${req}` });
    }

    // Check points
    let pointsRow = await client.query('SELECT points FROM neural_points WHERE telegram_id=$1 FOR UPDATE', [telegramId]);
    if (!pointsRow.rows[0]) {
      await client.query('INSERT INTO neural_points (telegram_id, points) VALUES ($1,0) ON CONFLICT DO NOTHING', [telegramId]);
      pointsRow = await client.query('SELECT points FROM neural_points WHERE telegram_id=$1 FOR UPDATE', [telegramId]);
    }
    const pts = Number(pointsRow.rows[0]?.points || 0);
    if (pts < node.cost) return res.status(400).json({ error: 'Not enough Neural Points' });

    await client.query('UPDATE neural_points SET points=points-$1 WHERE telegram_id=$2', [node.cost, telegramId]);
    await client.query('INSERT INTO neural_tree (telegram_id, node_id, unlocked_at) VALUES ($1,$2,$3)', [telegramId, nodeId, Date.now()]);

    return res.json({ ok: true, nodeId, cost: node.cost, bonus: node.bonus });
  });
}));

// Internal: grant Neural Points (on prestige/ascension)
async function grantNeuralPoints(telegramId, amount) {
  try {
    await pool.query(
      `INSERT INTO neural_points (telegram_id, points) VALUES ($1,$2)
       ON CONFLICT (telegram_id) DO UPDATE SET points=neural_points.points+$2`,
      [telegramId, amount]
    );
  } catch (_) {}
}

module.exports = { router, grantNeuralPoints };
