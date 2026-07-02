const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { broadcast } = require('../wsManager');
const {
  ELO_START, ELO_MATCHMAKING_RANGE, RANKED_DUEL_DURATION_MS, RANKED_DUEL_SEASON,
  ELO_LEAGUES, getLeagueForElo, computeEloChange,
} = require('../gameConfig');

async function getOrCreateElo(client, telegramId) {
  const r = await client.query(
    'SELECT * FROM player_elo WHERE telegram_id=$1 AND season=$2',
    [telegramId, RANKED_DUEL_SEASON]
  );
  if (r.rows[0]) return r.rows[0];
  const ins = await client.query(
    "INSERT INTO player_elo (telegram_id, elo, league, season) VALUES ($1,$2,'Rookie',$3) RETURNING *",
    [telegramId, ELO_START, RANKED_DUEL_SEASON]
  );
  return ins.rows[0];
}

// GET /rankedduels/me
router.get('/me', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const eloR = await pool.query(
    'SELECT * FROM player_elo WHERE telegram_id=$1 AND season=$2',
    [telegramId, RANKED_DUEL_SEASON]
  );
  const eloData = eloR.rows[0] || { elo: ELO_START, league: 'Rookie', wins: 0, losses: 0 };

  const activeDuel = await pool.query(
    `SELECT * FROM ranked_duels WHERE (challenger_id=$1 OR opponent_id=$1)
     AND status IN ('pending','active') ORDER BY created_at DESC LIMIT 1`,
    [telegramId]
  );

  res.json({
    elo: Number(eloData.elo),
    league: eloData.league,
    wins: Number(eloData.wins),
    losses: Number(eloData.losses),
    leagues: ELO_LEAGUES,
    season: RANKED_DUEL_SEASON,
    activeDuel: activeDuel.rows[0] || null,
  });
}));

// POST /rankedduels/find — find match & create duel
router.post('/find', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const now = Date.now();

  const result = await withTransaction(async (client) => {
    const myEloRow = await getOrCreateElo(client, telegramId);
    const myElo = Number(myEloRow.elo);

    // Check no active duel
    const existingR = await client.query(
      `SELECT id FROM ranked_duels WHERE (challenger_id=$1 OR opponent_id=$1)
       AND status IN ('pending','active')`,
      [telegramId]
    );
    if (existingR.rows[0]) throw Object.assign(new Error('Already in a duel'), { status: 400 });

    // Find waiting opponent within ELO range
    const opponentR = await client.query(
      `SELECT rd.id, rd.challenger_id, pe.elo FROM ranked_duels rd
       JOIN player_elo pe ON pe.telegram_id=rd.challenger_id AND pe.season=$1
       WHERE rd.status='pending' AND rd.opponent_id IS NULL
         AND rd.challenger_id != $2
         AND ABS(pe.elo - $3) <= $4
       ORDER BY rd.created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [RANKED_DUEL_SEASON, telegramId, myElo, ELO_MATCHMAKING_RANGE]
    );

    if (opponentR.rows[0]) {
      // Join existing duel
      const duel = opponentR.rows[0];
      const startsAt = now;
      const endsAt = now + RANKED_DUEL_DURATION_MS;
      await client.query(
        `UPDATE ranked_duels SET opponent_id=$1, status='active', starts_at=$2, ends_at=$3 WHERE id=$4`,
        [telegramId, startsAt, endsAt, duel.id]
      );
      return { duelId: duel.id, status: 'active', startsAt, endsAt };
    }

    // Create waiting duel
    const ins = await client.query(
      `INSERT INTO ranked_duels (challenger_id, season, status, created_at)
       VALUES ($1,$2,'pending',$3) RETURNING id`,
      [telegramId, RANKED_DUEL_SEASON, now]
    );
    return { duelId: ins.rows[0].id, status: 'pending' };
  });

  res.json(result);
}));

// POST /rankedduels/tap — record taps during active duel
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const taps = Math.min(Math.max(1, Math.floor(Number(req.body.count) || 1)), 500);
  const now = Date.now();

  await withTransaction(async (client) => {
    const duelR = await client.query(
      `SELECT * FROM ranked_duels WHERE (challenger_id=$1 OR opponent_id=$1)
       AND status='active' AND ends_at > $2 LIMIT 1 FOR UPDATE`,
      [telegramId, now]
    );
    if (!duelR.rows[0]) throw Object.assign(new Error('No active ranked duel'), { status: 404 });
    const duel = duelR.rows[0];

    const profR = await client.query('SELECT tap_power_level FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    const tapPower = (Number(profR.rows[0]?.tap_power_level) || 0) + 1;
    const bp = tapPower * taps;

    const isChallenger = duel.challenger_id === telegramId;
    const col = isChallenger ? 'challenger_bp' : 'opponent_bp';
    await client.query(`UPDATE ranked_duels SET ${col}=${col}+$1 WHERE id=$2`, [bp, duel.id]);

    // Broadcast score update to both duel participants
    const updated = await client.query('SELECT challenger_bp, opponent_bp FROM ranked_duels WHERE id=$1', [duel.id]);
    const scores = updated.rows[0];
    broadcast(`duel:${duel.id}`, {
      type: 'duel_score',
      duelId: duel.id,
      challengerBP: Number(scores.challenger_bp),
      opponentBP: Number(scores.opponent_bp),
      myBP: isChallenger ? Number(scores.challenger_bp) : Number(scores.opponent_bp),
      opBP: isChallenger ? Number(scores.opponent_bp) : Number(scores.challenger_bp),
    });
  });

  res.json({ ok: true });
}));

// POST /rankedduels/settle/:id — called when duel ends (client or server can trigger)
router.post('/settle/:id', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const duelId = parseInt(req.params.id, 10);
  const now = Date.now();

  await withTransaction(async (client) => {
    const duelR = await client.query(
      `SELECT * FROM ranked_duels WHERE id=$1 AND status='active' AND (challenger_id=$2 OR opponent_id=$2) FOR UPDATE`,
      [duelId, telegramId]
    );
    if (!duelR.rows[0]) throw Object.assign(new Error('Duel not found or not ended'), { status: 404 });
    const duel = duelR.rows[0];
    if (Number(duel.ends_at) > now) throw Object.assign(new Error('Duel still running'), { status: 400 });

    const cBP = Number(duel.challenger_bp);
    const oBP = Number(duel.opponent_bp);
    const winnerId = cBP >= oBP ? duel.challenger_id : duel.opponent_id;
    const loserId = winnerId === duel.challenger_id ? duel.opponent_id : duel.challenger_id;

    await client.query(
      'UPDATE ranked_duels SET status=$1, winner_id=$2 WHERE id=$3',
      ['completed', winnerId, duelId]
    );

    // ELO updates
    const wEloR = await getOrCreateElo(client, winnerId);
    const lEloR = await getOrCreateElo(client, loserId);
    const { gain, loss } = computeEloChange(Number(wEloR.elo), Number(lEloR.elo));

    const newWElo = Number(wEloR.elo) + gain;
    const newLElo = Math.max(0, Number(lEloR.elo) - loss);
    const wLeague = getLeagueForElo(newWElo).name;
    const lLeague = getLeagueForElo(newLElo).name;

    await client.query(
      'UPDATE player_elo SET elo=$1, league=$2, wins=wins+1 WHERE telegram_id=$3 AND season=$4',
      [newWElo, wLeague, winnerId, RANKED_DUEL_SEASON]
    );
    await client.query(
      'UPDATE player_elo SET elo=$1, league=$2, losses=losses+1 WHERE telegram_id=$3 AND season=$4',
      [newLElo, lLeague, loserId, RANKED_DUEL_SEASON]
    );
  });

  res.json({ ok: true });
}));

// GET /rankedduels/leaderboard
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.username, pe.elo, pe.league, pe.wins, pe.losses
    FROM player_elo pe
    JOIN users u ON u.telegram_id = pe.telegram_id
    WHERE pe.season=$1
    ORDER BY pe.elo DESC
    LIMIT 20
  `, [RANKED_DUEL_SEASON]);

  res.json({
    leaderboard: rows.map((r, i) => ({
      rank: i + 1,
      username: r.username || '???',
      elo: Number(r.elo),
      league: r.league,
      wins: Number(r.wins),
      losses: Number(r.losses),
    })),
    leagues: ELO_LEAGUES,
  });
}));

module.exports = router;
