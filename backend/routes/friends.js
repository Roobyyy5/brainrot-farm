const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TAPPER_RANKS, WORLD_ZONES } = require('../gameConfig');

const router = express.Router();

function rankForTaps(taps) {
  let rank = TAPPER_RANKS[0];
  for (const r of TAPPER_RANKS) { if (taps >= r.minTaps) rank = r; }
  return rank;
}

async function buildFriendProfile(telegramId) {
  const [userRes, profRes, guildRes] = await Promise.all([
    pool.query('SELECT username FROM users WHERE telegram_id=$1', [telegramId]),
    pool.query('SELECT total_taps, prestige, active_pet, current_zone FROM tapper_profiles WHERE telegram_id=$1', [telegramId]),
    pool.query(
      `SELECT g.name, g.tag FROM guilds g JOIN guild_members gm ON gm.guild_id=g.id WHERE gm.telegram_id=$1 LIMIT 1`,
      [telegramId]
    ),
  ]);
  const u = userRes.rows[0];
  const p = profRes.rows[0] || {};
  const totalTaps = Number(p.total_taps) || 0;
  const zone = WORLD_ZONES.find(z => z.zone === (p.current_zone || 1)) || WORLD_ZONES[0];
  return {
    telegramId,
    username: u?.username || `User_${String(telegramId).slice(-4)}`,
    rank: rankForTaps(totalTaps),
    prestige: p.prestige || 0,
    totalTaps,
    zone: `${zone.icon} ${zone.name}`,
    guild: guildRes.rows[0] ? `[${guildRes.rows[0].tag}] ${guildRes.rows[0].name}` : null,
  };
}

// GET /friends
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { rows } = await pool.query(
    `SELECT f.friend_id, f.status, u.username
     FROM friends f
     JOIN users u ON u.telegram_id = f.friend_id
     WHERE f.user_id = $1
     UNION
     SELECT f.user_id AS friend_id, f.status, u.username
     FROM friends f
     JOIN users u ON u.telegram_id = f.user_id
     WHERE f.friend_id = $1 AND f.status = 'accepted'`,
    [tid]
  );

  // Incoming pending requests
  const { rows: incoming } = await pool.query(
    `SELECT f.user_id AS friend_id, u.username
     FROM friends f JOIN users u ON u.telegram_id = f.user_id
     WHERE f.friend_id = $1 AND f.status = 'pending'`,
    [tid]
  );

  res.json({
    friends: rows.map(r => ({ telegramId: r.friend_id, username: r.username, status: r.status })),
    incoming: incoming.map(r => ({ telegramId: r.friend_id, username: r.username })),
  });
}));

// GET /friends/:telegramId — profile of a friend
router.get('/:telegramId', asyncHandler(async (req, res) => {
  const profile = await buildFriendProfile(req.params.telegramId);
  res.json(profile);
}));

// POST /friends/add
router.post('/add', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { friendId } = req.body;
  if (!friendId || friendId === tid) return res.status(400).json({ error: 'Invalid friend ID' });

  const result = await withTransaction(async (client) => {
    const { rows: u } = await client.query('SELECT telegram_id FROM users WHERE telegram_id=$1', [friendId]);
    if (!u[0]) return { error: 'User not found' };
    const { rows: ex } = await client.query(
      'SELECT id FROM friends WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)',
      [tid, friendId]
    );
    if (ex[0]) return { error: 'Already friends or pending' };
    await client.query(
      'INSERT INTO friends (user_id, friend_id, status, created_at) VALUES ($1, $2, $3, $4)',
      [tid, friendId, 'pending', Date.now()]
    );
    return { success: true };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// POST /friends/accept
router.post('/accept', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { friendId } = req.body;
  const { rowCount } = await pool.query(
    "UPDATE friends SET status='accepted' WHERE user_id=$1 AND friend_id=$2 AND status='pending'",
    [friendId, tid]
  );
  if (!rowCount) return res.status(400).json({ error: 'No pending request found' });
  res.json({ success: true });
}));

// POST /friends/remove
router.post('/remove', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { friendId } = req.body;
  await pool.query(
    'DELETE FROM friends WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)',
    [tid, friendId]
  );
  res.json({ success: true });
}));

module.exports = router;
