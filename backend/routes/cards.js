const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { PASSIVE_CARDS, TAPPER_MAX_OFFLINE_HOURS } = require('../gameConfig');

const router = express.Router();

// Seed passive_cards table on first request
async function ensureCardsCatalog(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM passive_cards');
  if (rows[0].n > 0) return;
  for (const c of PASSIVE_CARDS) {
    await client.query(
      `INSERT INTO passive_cards (key, name, category, icon, description, base_income, income_step, costs, max_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (key) DO NOTHING`,
      [c.key, c.name, c.category, c.icon, c.description, c.baseIncome, c.incomeStep, c.costs, c.costs.length - 1]
    );
  }
}

function cardIncomePerHour(card) {
  return card.base_income + (card.level - 1) * card.income_step;
}

// GET /cards — list all cards with user's levels and card income per hour
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;

  await withTransaction(async (client) => {
    await ensureCardsCatalog(client);

    const [catalog, owned, refs] = await Promise.all([
      client.query('SELECT * FROM passive_cards ORDER BY category, base_income'),
      client.query('SELECT * FROM user_cards WHERE telegram_id = $1', [telegramId]),
      client.query(
        `SELECT COUNT(*)::int AS count FROM referrals r
         JOIN users u ON u.telegram_id = r.referred_id
         WHERE r.referrer_id = $1 AND u.has_farmed_once = TRUE`,
        [telegramId]
      ),
    ]);

    const ownedMap = {};
    let totalPerHour = 0;
    for (const uc of owned.rows) {
      ownedMap[uc.card_key] = uc.level;
      const cfg = PASSIVE_CARDS.find((c) => c.key === uc.card_key);
      if (cfg) totalPerHour += cfg.baseIncome + (uc.level - 1) * cfg.incomeStep;
    }

    const referralBoostPct = refs.rows[0].count * 2;

    const cards = catalog.rows.map((card) => {
      const level = ownedMap[card.key] || 0;
      const isMaxed = level >= card.max_level;
      return {
        key: card.key,
        name: card.name,
        category: card.category,
        icon: card.icon,
        description: card.description,
        level,
        maxLevel: card.max_level,
        incomePerHour: level > 0 ? cardIncomePerHour({ ...card, level }) : 0,
        nextIncomePerHour: isMaxed ? null : cardIncomePerHour({ ...card, level: level + 1 }),
        cost: isMaxed ? null : card.costs[level + 1],
        isOwned: level > 0,
        isMaxed,
      };
    });

    res.json({
      cards,
      totalPerHour: Math.floor(totalPerHour * (1 + referralBoostPct / 100)),
      referralBoostPct,
    });
  });
}));

// POST /cards/buy — buy (level 1) or upgrade existing card
router.post('/buy', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { key } = req.body;

  const cfg = PASSIVE_CARDS.find((c) => c.key === key);
  if (!cfg) return res.status(400).json({ error: 'Unknown card' });

  const result = await withTransaction(async (client) => {
    await ensureCardsCatalog(client);

    const existing = await client.query(
      'SELECT * FROM user_cards WHERE telegram_id = $1 AND card_key = $2',
      [telegramId, key]
    );

    const currentLevel = existing.rows[0]?.level || 0;
    if (currentLevel >= cfg.costs.length - 1) return { error: 'Card at max level' };

    const cost = cfg.costs[currentLevel + 1];
    const user = await client.query('SELECT coins FROM users WHERE telegram_id = $1', [telegramId]);
    if (user.rows[0].coins < cost) return { error: 'Not enough coins' };

    await client.query('UPDATE users SET coins = coins - $1 WHERE telegram_id = $2', [cost, telegramId]);

    if (existing.rows[0]) {
      await client.query(
        'UPDATE user_cards SET level = level + 1 WHERE telegram_id = $1 AND card_key = $2',
        [telegramId, key]
      );
    } else {
      await client.query(
        'INSERT INTO user_cards (telegram_id, card_key, level, bought_at) VALUES ($1,$2,1,$3)',
        [telegramId, key, Date.now()]
      );
    }

    return { success: true, newLevel: currentLevel + 1, cost };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// Utility used by tapper GET /me to credit card offline income
async function computeCardOfflineIncome(client, telegramId, lastSeenAt) {
  const { rows } = await client.query(
    `SELECT uc.level, pc.base_income, pc.income_step
     FROM user_cards uc
     JOIN passive_cards pc ON pc.key = uc.card_key
     WHERE uc.telegram_id = $1`,
    [telegramId]
  );
  if (rows.length === 0) return { income: 0, perHour: 0 };

  const perHour = rows.reduce((s, c) => s + c.base_income + (c.level - 1) * c.income_step, 0);
  const elapsedHours = Math.min((Date.now() - lastSeenAt) / 3_600_000, TAPPER_MAX_OFFLINE_HOURS);
  if (elapsedHours < 1 / 60) return { income: 0, perHour };

  return { income: Math.floor(perHour * elapsedHours), perHour };
}

module.exports = router;
module.exports.computeCardOfflineIncome = computeCardOfflineIncome;
