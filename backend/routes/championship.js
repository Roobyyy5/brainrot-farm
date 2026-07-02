const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { CHAMPIONSHIP } = require('../gameConfig');

const router = express.Router();

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getOrCreateSeason(client) {
  const mk = monthKey();
  const { rows: [s] } = await client.query('SELECT * FROM championship_seasons WHERE month_key=$1', [mk]);
  if (s) return s;
  const { rows: [ns] } = await client.query(
    `INSERT INTO championship_seasons (month_key, status, bracket) VALUES ($1,'qualifying','{}') RETURNING *`,
    [mk]
  );
  return ns;
}

// GET /championship
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const season = await getOrCreateSeason(client);

    // Upsert entry with current season score
    const { rows: [profile] } = await client.query(
      'SELECT total_taps FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
    );
    const { rows: [user] } = await client.query('SELECT username FROM users WHERE telegram_id=$1', [telegramId]);
    const score = Number(profile?.total_taps || 0);

    if (season.status === 'qualifying') {
      await client.query(
        `INSERT INTO championship_entries (season_id, telegram_id, username, qualify_score)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (season_id, telegram_id) DO UPDATE SET qualify_score=$4, username=$3`,
        [season.id, telegramId, user?.username || 'Unknown', score]
      );
    }

    const { rows: myEntry } = await client.query(
      'SELECT * FROM championship_entries WHERE season_id=$1 AND telegram_id=$2',
      [season.id, telegramId]
    );

    const { rows: top } = await client.query(
      `SELECT ce.telegram_id, ce.username, ce.qualify_score, ce.seed, ce.placement,
              ROW_NUMBER() OVER (ORDER BY ce.qualify_score DESC) AS rank
       FROM championship_entries ce WHERE ce.season_id=$1
       ORDER BY ce.qualify_score DESC LIMIT 50`,
      [season.id]
    );

    res.json({
      monthKey: season.month_key,
      status: season.status,
      bracket: season.bracket || {},
      me: myEntry[0] ? {
        qualified: true,
        score: Number(myEntry[0].qualify_score),
        seed: myEntry[0].seed,
        placement: myEntry[0].placement,
      } : { qualified: false, score },
      topPlayers: top.map(r => ({
        rank: Number(r.rank),
        username: r.username,
        score: Number(r.qualify_score),
        isMe: r.telegram_id === telegramId,
        qualified: Number(r.rank) <= CHAMPIONSHIP.bracketSize,
      })),
      bracketSize: CHAMPIONSHIP.bracketSize,
      prizes: CHAMPIONSHIP.prizes,
      topNRewards: CHAMPIONSHIP.topNRewards,
    });
  } finally { client.release(); }
}));

// POST /championship/match-result — submit match tap score
router.post('/match-result', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { matchId, taps } = req.body;
  if (typeof taps !== 'number') return res.status(400).json({ error: 'Invalid taps' });

  const client = await pool.connect();
  try {
    const season = await getOrCreateSeason(client);
    if (season.status !== 'bracket') return res.status(400).json({ error: 'Not in bracket phase' });

    const bracket = season.bracket || {};
    if (!bracket.matches) return res.status(400).json({ error: 'Bracket not set' });

    const match = bracket.matches?.find(m => m.id === matchId);
    if (!match) return res.status(400).json({ error: 'Match not found' });
    if (match.p1 !== telegramId && match.p2 !== telegramId) return res.status(403).json({ error: 'Not in this match' });

    const side = match.p1 === telegramId ? 'score1' : 'score2';
    match[side] = taps;

    await client.query('UPDATE championship_seasons SET bracket=$1 WHERE id=$2', [JSON.stringify(bracket), season.id]);
    return res.json({ ok: true, taps });
  } finally { client.release(); }
}));

// Internal: seed bracket (called by scheduler after qualifying ends)
async function seedBracket() {
  const client = await pool.connect();
  try {
    const mk = monthKey();
    const { rows: [season] } = await client.query('SELECT * FROM championship_seasons WHERE month_key=$1', [mk]);
    if (!season || season.status !== 'qualifying') return;

    const { rows: top } = await client.query(
      `SELECT telegram_id, username, qualify_score FROM championship_entries
       WHERE season_id=$1 ORDER BY qualify_score DESC LIMIT $2`,
      [season.id, CHAMPIONSHIP.bracketSize]
    );

    // Seed: 1 vs 32, 2 vs 31, etc.
    const matches = [];
    for (let i = 0; i < top.length / 2; i++) {
      const opp = top.length - 1 - i;
      if (top[opp]) {
        matches.push({ id: i + 1, p1: top[i].telegram_id, p2: top[opp].telegram_id, score1: null, score2: null, winner: null });
      }
    }

    await client.query(
      `UPDATE championship_seasons SET status='bracket', bracket=$1, started_at=$2 WHERE id=$3`,
      [JSON.stringify({ round: 1, matches }), Date.now(), season.id]
    );

    for (let i = 0; i < top.length; i++) {
      await client.query('UPDATE championship_entries SET seed=$1 WHERE season_id=$2 AND telegram_id=$3', [i + 1, season.id, top[i].telegram_id]);
    }
  } finally { client.release(); }
}

module.exports = { router, seedBracket };
