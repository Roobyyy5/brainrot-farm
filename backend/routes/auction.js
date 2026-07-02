const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { AUCTION_DURATION_MS, AUCTION_COMMISSION_PCT, AUCTION_MAX_ACTIVE_PER_USER, ALCHEMY_INGREDIENTS } = require('../gameConfig');

const router = express.Router();

// Ingredient column names in alchemy_ingredients table
const ING_COLS = { tap_shard: true, energy_crystal: true, combo_dust: true, prestige_essence: true };

// GET /auction
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;

  await pool.query(
    `UPDATE auctions SET status='expired' WHERE status='active' AND expires_at < $1`, [Date.now()]
  );

  const [auctRes, myGemRes, myListRes, cntRes, ingRes] = await Promise.all([
    pool.query(
      `SELECT a.id, a.seller_id, u.username as seller_name, a.item_type, a.quantity, a.price_gems, a.expires_at
       FROM auctions a JOIN users u ON u.telegram_id = a.seller_id
       WHERE a.status='active' ORDER BY a.created_at DESC LIMIT 50`
    ),
    pool.query('SELECT gems FROM users WHERE telegram_id=$1', [telegramId]),
    pool.query(
      `SELECT a.id, a.item_type, a.quantity, a.price_gems, a.status, ub.username as buyer_name
       FROM auctions a LEFT JOIN users ub ON ub.telegram_id = a.buyer_id
       WHERE a.seller_id=$1 ORDER BY a.created_at DESC LIMIT 20`,
      [telegramId]
    ),
    pool.query(`SELECT count(*) c FROM auctions WHERE seller_id=$1 AND status='active'`, [telegramId]),
    pool.query(
      `SELECT tap_shard, energy_crystal, combo_dust, prestige_essence
       FROM alchemy_ingredients WHERE telegram_id=$1`,
      [telegramId]
    ),
  ]);

  const ing = ingRes.rows[0] || { tap_shard: 0, energy_crystal: 0, combo_dust: 0, prestige_essence: 0 };

  res.json({
    auctions: auctRes.rows.map(r => ({
      id: r.id,
      sellerName: r.seller_name,
      isMe: r.seller_id === telegramId,
      itemType: r.item_type,
      quantity: r.quantity,
      priceGems: Number(r.price_gems),
      expiresAt: Number(r.expires_at),
    })),
    myListings: myListRes.rows,
    myGems: Number(myGemRes.rows[0]?.gems || 0),
    myIngredients: ing,
    canList: Number(cntRes.rows[0].c) < AUCTION_MAX_ACTIVE_PER_USER,
    activeCount: Number(cntRes.rows[0].c),
    maxActive: AUCTION_MAX_ACTIVE_PER_USER,
    itemTypes: Object.entries(ALCHEMY_INGREDIENTS).map(([k, v]) => ({ key: k, ...v })),
  });
}));

// POST /auction/list — create a listing
router.post('/list', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { itemType, quantity, priceGems } = req.body;
  if (!ING_COLS[itemType]) return res.status(400).json({ error: 'Unknown item type' });
  const qty = parseInt(quantity, 10);
  const price = parseInt(priceGems, 10);
  if (!qty || qty < 1 || qty > 1000) return res.status(400).json({ error: 'Invalid quantity' });
  if (!price || price < 1 || price > 10000) return res.status(400).json({ error: 'Price must be 1–10000' });

  return withTransaction(async (client) => {
    const { rows: [cnt] } = await client.query(
      `SELECT count(*) c FROM auctions WHERE seller_id=$1 AND status='active'`, [telegramId]
    );
    if (Number(cnt.c) >= AUCTION_MAX_ACTIVE_PER_USER) {
      return res.status(400).json({ error: `Max ${AUCTION_MAX_ACTIVE_PER_USER} active listings` });
    }

    const col = itemType;
    const { rows: [ing] } = await client.query(
      `SELECT ${col} as amount FROM alchemy_ingredients WHERE telegram_id=$1 FOR UPDATE`,
      [telegramId]
    );
    if (Number(ing?.amount || 0) < qty) {
      return res.status(400).json({ error: `Not enough ${itemType}` });
    }

    await client.query(
      `UPDATE alchemy_ingredients SET ${col}=${col}-$1 WHERE telegram_id=$2`,
      [qty, telegramId]
    );

    const now = Date.now();
    const { rows: [auction] } = await client.query(
      `INSERT INTO auctions (seller_id, item_type, quantity, price_gems, status, created_at, expires_at)
       VALUES ($1,$2,$3,$4,'active',$5,$6) RETURNING id`,
      [telegramId, itemType, qty, price, now, now + AUCTION_DURATION_MS]
    );
    return res.json({ ok: true, auctionId: auction.id });
  });
}));

// POST /auction/buy — buy a listing instantly
router.post('/buy', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { auctionId } = req.body;

  return withTransaction(async (client) => {
    const { rows: [auction] } = await client.query(
      `SELECT * FROM auctions WHERE id=$1 AND status='active' FOR UPDATE`, [auctionId]
    );
    if (!auction) return res.status(404).json({ error: 'Auction not found or expired' });
    if (auction.seller_id === telegramId) return res.status(400).json({ error: 'Cannot buy own listing' });
    if (auction.expires_at < Date.now()) return res.status(400).json({ error: 'Auction expired' });

    const { rows: [buyer] } = await client.query(
      `SELECT gems FROM users WHERE telegram_id=$1 FOR UPDATE`, [telegramId]
    );
    if (Number(buyer?.gems || 0) < auction.price_gems) {
      return res.status(400).json({ error: 'Not enough gems' });
    }

    const commission = Math.floor(auction.price_gems * AUCTION_COMMISSION_PCT);
    const sellerGets = auction.price_gems - commission;

    await client.query('UPDATE users SET gems=gems-$1 WHERE telegram_id=$2', [auction.price_gems, telegramId]);
    await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [sellerGets, auction.seller_id]);

    const col = auction.item_type;
    await client.query(
      `INSERT INTO alchemy_ingredients (telegram_id, ${col}) VALUES ($1,$2)
       ON CONFLICT (telegram_id) DO UPDATE SET ${col}=alchemy_ingredients.${col}+$2`,
      [telegramId, auction.quantity]
    );

    await client.query(
      `UPDATE auctions SET status='sold', buyer_id=$1, settled_at=$2 WHERE id=$3`,
      [telegramId, Date.now(), auctionId]
    );

    return res.json({ ok: true, itemType: auction.item_type, quantity: auction.quantity, gemsSpent: auction.price_gems });
  });
}));

// POST /auction/cancel — cancel own listing
router.post('/cancel', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { auctionId } = req.body;

  return withTransaction(async (client) => {
    const { rows: [auction] } = await client.query(
      `SELECT * FROM auctions WHERE id=$1 AND seller_id=$2 AND status='active' FOR UPDATE`,
      [auctionId, telegramId]
    );
    if (!auction) return res.status(404).json({ error: 'Listing not found' });

    await client.query(
      `UPDATE auctions SET status='cancelled', settled_at=$1 WHERE id=$2`, [Date.now(), auctionId]
    );
    const col = auction.item_type;
    await client.query(
      `INSERT INTO alchemy_ingredients (telegram_id, ${col}) VALUES ($1,$2)
       ON CONFLICT (telegram_id) DO UPDATE SET ${col}=alchemy_ingredients.${col}+$2`,
      [telegramId, auction.quantity]
    );
    return res.json({ ok: true });
  });
}));

module.exports = router;
