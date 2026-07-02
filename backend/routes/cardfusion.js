const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { CARD_FUSION } = require('../gameConfig');

const router = express.Router();

// GET /cardfusion — fusion slots + available cards
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const [fusionRes, cardsRes] = await Promise.all([
    pool.query('SELECT * FROM fusion_cards WHERE telegram_id=$1 ORDER BY slot', [telegramId]),
    pool.query('SELECT * FROM user_cards WHERE telegram_id=$1 ORDER BY key', [telegramId]),
  ]);

  // Group cards by key for fusion eligibility
  const cardCounts = {};
  for (const c of cardsRes.rows) {
    cardCounts[c.key] = (cardCounts[c.key] || 0) + 1;
  }

  // Card definitions from cards route — read from DB card config
  const { rows: cardDefs } = await pool.query('SELECT DISTINCT key, name, icon, base_income FROM cards_config LIMIT 100').catch(() => ({ rows: [] }));

  res.json({
    config: CARD_FUSION,
    fusionSlots: Array.from({ length: CARD_FUSION.maxFusionSlots }, (_, i) => {
      const fused = fusionRes.rows.find(r => r.slot === i + 1);
      return { slot: i + 1, card: fused || null };
    }),
    fusableCards: Object.entries(cardCounts)
      .filter(([, count]) => count >= CARD_FUSION.cardsRequiredToFuse)
      .map(([key, count]) => ({ key, count })),
    totalFused: fusionRes.rows.length,
    slotsUsed: fusionRes.rows.length,
  });
}));

// POST /cardfusion/fuse
router.post('/fuse', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { cardKey, slot } = req.body;
  if (!cardKey || !slot || slot < 1 || slot > CARD_FUSION.maxFusionSlots) {
    return res.status(400).json({ error: 'Invalid card or slot' });
  }

  return withTransaction(async (client) => {
    // Check slot is free
    const { rows: [existing] } = await client.query(
      'SELECT id FROM fusion_cards WHERE telegram_id=$1 AND slot=$2', [telegramId, slot]
    );
    if (existing) return res.status(400).json({ error: 'Slot already occupied' });

    // Check player has enough copies
    const { rows: ownedCards } = await client.query(
      'SELECT id FROM user_cards WHERE telegram_id=$1 AND key=$2 LIMIT $3',
      [telegramId, cardKey, CARD_FUSION.cardsRequiredToFuse]
    );
    if (ownedCards.length < CARD_FUSION.cardsRequiredToFuse) {
      return res.status(400).json({ error: `Need ${CARD_FUSION.cardsRequiredToFuse} copies to fuse` });
    }

    // Consume cards
    const idsToDelete = ownedCards.map(c => c.id);
    await client.query('DELETE FROM user_cards WHERE id=ANY($1)', [idsToDelete]);

    // Create fusion card
    await client.query(
      'INSERT INTO fusion_cards (telegram_id, card_key, slot, fused_at) VALUES ($1,$2,$3,$4)',
      [telegramId, cardKey, slot, Date.now()]
    );

    return res.json({ ok: true, slot, cardKey, multiplier: CARD_FUSION.fusionMultiplier });
  });
}));

// POST /cardfusion/destroy
router.post('/destroy', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { slot } = req.body;
  await pool.query('DELETE FROM fusion_cards WHERE telegram_id=$1 AND slot=$2', [telegramId, slot]);
  res.json({ ok: true });
}));

module.exports = router;
