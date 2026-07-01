const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();
const DUEL_DURATION_MS = 30 * 1000;
const ACCEPT_WINDOW_MS = 5 * 60 * 1000;
const MIN_STAKE = 3;
const MAX_STAKE = 50;

router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    `SELECT d.*, uc.username AS challenger_name, uo.username AS opponent_name
     FROM tap_duels d
     JOIN users uc ON uc.telegram_id=d.challenger_id
     JOIN users uo ON uo.telegram_id=d.opponent_id
     WHERE (d.challenger_id=$1 OR d.opponent_id=$1)
       AND d.status IN ('pending','active','finished')
     ORDER BY d.created_at DESC LIMIT 10`,
    [telegramId]
  );
  res.json({ duels: rows, telegramId });
}));

router.post('/challenge', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { username, stakeGems } = req.body;
  const stake = Math.min(MAX_STAKE, Math.max(MIN_STAKE, parseInt(stakeGems, 10) || 5));

  const result = await withTransaction(async (client) => {
    const { rows: op } = await client.query("SELECT telegram_id FROM users WHERE username=$1", [username]);
    if (!op[0]) return { error: 'User not found' };
    if (op[0].telegram_id === telegramId) return { error: 'Cannot duel yourself' };

    const { rows: u } = await client.query('SELECT gems FROM users WHERE telegram_id=$1', [telegramId]);
    if (!u[0] || u[0].gems < stake) return { error: `Need ${stake} gems` };

    await client.query('UPDATE users SET gems=gems-$1 WHERE telegram_id=$2', [stake, telegramId]);
    const { rows: d } = await client.query(
      "INSERT INTO tap_duels (challenger_id,opponent_id,stake_gems,status,created_at) VALUES($1,$2,$3,'pending',$4) RETURNING id",
      [telegramId, op[0].telegram_id, stake, Date.now()]
    );
    return { success: true, duelId: d[0].id };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/accept', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const duelId = parseInt(req.body.duelId, 10);
  const result = await withTransaction(async (client) => {
    const { rows: d } = await client.query('SELECT * FROM tap_duels WHERE id=$1 FOR UPDATE', [duelId]);
    if (!d[0] || d[0].opponent_id !== telegramId) return { error: 'Duel not found' };
    if (d[0].status !== 'pending') return { error: 'Duel not pending' };
    if (Date.now() - Number(d[0].created_at) > ACCEPT_WINDOW_MS) {
      await client.query("UPDATE tap_duels SET status='expired' WHERE id=$1", [duelId]);
      await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [d[0].stake_gems, d[0].challenger_id]);
      return { error: 'Challenge expired' };
    }
    const { rows: u } = await client.query('SELECT gems FROM users WHERE telegram_id=$1', [telegramId]);
    if (!u[0] || u[0].gems < d[0].stake_gems) return { error: `Need ${d[0].stake_gems} gems` };
    await client.query('UPDATE users SET gems=gems-$1 WHERE telegram_id=$2', [d[0].stake_gems, telegramId]);
    const now = Date.now();
    await client.query(
      "UPDATE tap_duels SET status='active', starts_at=$1, ends_at=$2 WHERE id=$3",
      [now, now + DUEL_DURATION_MS, duelId]
    );
    return { success: true, endsAt: now + DUEL_DURATION_MS };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/decline', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const duelId = parseInt(req.body.duelId, 10);
  const result = await withTransaction(async (client) => {
    const { rows: d } = await client.query('SELECT * FROM tap_duels WHERE id=$1 FOR UPDATE', [duelId]);
    if (!d[0] || d[0].opponent_id !== telegramId) return { error: 'Not found' };
    if (d[0].status !== 'pending') return { error: 'Not pending' };
    await client.query("UPDATE tap_duels SET status='declined' WHERE id=$1", [duelId]);
    await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [d[0].stake_gems, d[0].challenger_id]);
    return { success: true };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const duelId = parseInt(req.body.duelId, 10);
  const bp = Math.max(0, parseInt(req.body.bp, 10) || 0);
  if (!duelId) return res.status(400).json({ error: 'Invalid params' });

  const result = await withTransaction(async (client) => {
    const { rows: d } = await client.query('SELECT * FROM tap_duels WHERE id=$1 FOR UPDATE', [duelId]);
    if (!d[0] || d[0].status !== 'active') return { error: 'Not active' };
    if (Date.now() > Number(d[0].ends_at)) {
      await resolveDuel(client, d[0]);
      return { finished: true };
    }
    const isChallenger = d[0].challenger_id === telegramId;
    const isOpponent = d[0].opponent_id === telegramId;
    if (!isChallenger && !isOpponent) return { error: 'Not a participant' };
    const col = isChallenger ? 'challenger_bp' : 'opponent_bp';
    await client.query(`UPDATE tap_duels SET ${col}=${col}+$1 WHERE id=$2`, [bp, duelId]);
    return { success: true };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/resolve', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const duelId = parseInt(req.body.duelId, 10);
  const result = await withTransaction(async (client) => {
    const { rows: d } = await client.query('SELECT * FROM tap_duels WHERE id=$1 FOR UPDATE', [duelId]);
    if (!d[0]) return { error: 'Not found' };
    if (d[0].challenger_id !== telegramId && d[0].opponent_id !== telegramId) return { error: 'Not a participant' };
    if (d[0].status !== 'active') return { error: 'Not active' };
    if (Date.now() < Number(d[0].ends_at)) return { error: 'Duel still ongoing' };
    const winnerId = await resolveDuel(client, d[0]);
    return { success: true, winnerId, challengerBp: d[0].challenger_bp, opponentBp: d[0].opponent_bp };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

async function resolveDuel(client, duel) {
  const cBp = Number(duel.challenger_bp);
  const oBp = Number(duel.opponent_bp);
  let winnerId = null;
  if (cBp > oBp) winnerId = duel.challenger_id;
  else if (oBp > cBp) winnerId = duel.opponent_id;
  const total = duel.stake_gems * 2;
  if (winnerId) {
    await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [total, winnerId]);
  } else {
    await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [duel.stake_gems, duel.challenger_id]);
    await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [duel.stake_gems, duel.opponent_id]);
  }
  await client.query("UPDATE tap_duels SET status='finished', winner_id=$1 WHERE id=$2", [winnerId, duel.id]);
  return winnerId;
}

module.exports = router;
