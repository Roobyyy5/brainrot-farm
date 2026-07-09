const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();
const TOKEN_TOTAL = 10_000_000_000;
const TOKEN_BASE_RATE = 100;

// GET /wallet
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    'SELECT tokens, wallet_address FROM users WHERE telegram_id=$1',
    [telegramId]
  );
  const { rows: supply } = await pool.query(
    "SELECT value FROM app_state WHERE key='token_supply'"
  );
  const supplyRemaining = Number(supply[0]?.value || TOKEN_TOTAL);
  const rateNow = Math.floor(TOKEN_BASE_RATE * supplyRemaining / TOKEN_TOTAL);
  res.json({
    tokens: Number(rows[0]?.tokens || 0),
    walletAddress: rows[0]?.wallet_address || null,
    supplyRemaining,
    totalSupply: TOKEN_TOTAL,
    rateNow,
  });
}));

// POST /wallet/connect
router.post('/connect', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { address } = req.body;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Invalid address' });
  }
  const cleaned = address.trim();
  if (!/^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(cleaned) && !/^0:[0-9a-fA-F]{64}$/.test(cleaned)) {
    return res.status(400).json({ error: 'Invalid TON address' });
  }
  await pool.query('UPDATE users SET wallet_address=$1 WHERE telegram_id=$2', [cleaned, telegramId]);
  res.json({ success: true, walletAddress: cleaned });
}));

// POST /wallet/disconnect
router.post('/disconnect', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  await pool.query('UPDATE users SET wallet_address=NULL WHERE telegram_id=$1', [telegramId]);
  res.json({ success: true });
}));

module.exports = router;
