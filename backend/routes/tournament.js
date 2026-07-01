const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TOURNAMENT_DURATION_MS, TOURNAMENT_PRIZE_SKINS, TOURNAMENT_TOP_GEMS } = require('../gameConfig');

const router = express.Router();

async function getOrCreateTournament(client) {
  const now = Date.now();
  const { rows } = await client.query(
    'SELECT * FROM tournaments WHERE ends_at > $1 AND settled = FALSE ORDER BY id DESC LIMIT 1',
    [now]
  );
  if (rows[0]) return rows[0];

  const skin = TOURNAMENT_PRIZE_SKINS[Math.floor(Math.random() * TOURNAMENT_PRIZE_SKINS.length)];
  const { rows: created } = await client.query(
    `INSERT INTO tournaments (name, starts_at, ends_at, prize_skin, created_at)
     VALUES ($1, $2, $3, $4, $2) RETURNING *`,
    [`Brain Tournament #${Math.floor(now / TOURNAMENT_DURATION_MS)}`, now, now + TOURNAMENT_DURATION_MS, skin]
  );
  return created[0];
}

// GET /tournament — current tournament + leaderboard
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();

  const tournament = await withTransaction(async (client) => getOrCreateTournament(client));

  const [boardRes, myRes] = await Promise.all([
    pool.query(
      `SELECT ts.telegram_id, u.username, ts.score
       FROM tournament_scores ts
       JOIN users u ON u.telegram_id = ts.telegram_id
       WHERE ts.tournament_id = $1
       ORDER BY ts.score DESC LIMIT 10`,
      [tournament.id]
    ),
    pool.query(
      'SELECT score FROM tournament_scores WHERE tournament_id=$1 AND telegram_id=$2',
      [tournament.id, tid]
    ),
  ]);

  const leaderboard = boardRes.rows.map((r, i) => ({
    rank: i + 1,
    telegramId: r.telegram_id,
    username: r.username || `User_${String(r.telegram_id).slice(-4)}`,
    score: Number(r.score),
    gemReward: TOURNAMENT_TOP_GEMS[i] || 0,
    isMe: r.telegram_id === tid,
  }));

  res.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      startsAt: Number(tournament.starts_at),
      endsAt: Number(tournament.ends_at),
      prizeSkin: tournament.prize_skin,
    },
    leaderboard,
    myScore: myRes.rows[0] ? Number(myRes.rows[0].score) : 0,
    topGems: TOURNAMENT_TOP_GEMS,
  });
}));

// Called from tapper.js after successful tap batch
async function addTournamentScore(telegramId, bp) {
  try {
    const now = Date.now();
    const { rows } = await pool.query(
      'SELECT id FROM tournaments WHERE ends_at > $1 AND settled = FALSE ORDER BY id DESC LIMIT 1',
      [now]
    );
    if (!rows[0]) return;
    await pool.query(
      `INSERT INTO tournament_scores (tournament_id, telegram_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (tournament_id, telegram_id)
       DO UPDATE SET score = tournament_scores.score + EXCLUDED.score`,
      [rows[0].id, telegramId, bp]
    );
  } catch {}
}

// Settle tournament (called from seasons scheduler)
async function settleTournament() {
  const now = Date.now();
  const { rows: expired } = await pool.query(
    'SELECT * FROM tournaments WHERE ends_at <= $1 AND settled = FALSE',
    [now]
  );
  for (const t of expired) {
    await withTransaction(async (client) => {
      const { rows: top } = await client.query(
        `SELECT telegram_id, score FROM tournament_scores
         WHERE tournament_id = $1 ORDER BY score DESC LIMIT 10`,
        [t.id]
      );
      for (let i = 0; i < top.rows.length; i++) {
        const gems = TOURNAMENT_TOP_GEMS[i] || 0;
        if (gems > 0) {
          await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [gems, top.rows[i].telegram_id]);
        }
        if (i === 0 && t.prize_skin) {
          await client.query(
            `UPDATE tapper_profiles SET skins_unlocked=array_append(skins_unlocked,$1)
             WHERE telegram_id=$2 AND NOT ($1=ANY(skins_unlocked))`,
            [t.prize_skin, top.rows[i].telegram_id]
          );
        }
      }
      await client.query('UPDATE tournaments SET settled=TRUE WHERE id=$1', [t.id]);
    });
  }
}

module.exports = { router, addTournamentScore, settleTournament };
