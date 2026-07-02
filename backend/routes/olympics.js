const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { OLYMPICS_EVENTS, OLYMPICS_DURATION_DAYS, OLYMPICS_GUILD_REWARDS, olympicsMonthKey } = require('../gameConfig');

const router = express.Router();

async function getOrCreateSeason(client) {
  const q = client || pool;
  const monthKey = olympicsMonthKey();
  let { rows: [season] } = await q.query(
    'SELECT * FROM olympics_seasons WHERE month_key=$1', [monthKey]
  );
  if (!season) {
    const now = Date.now();
    const endsAt = now + OLYMPICS_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const { rows: [s] } = await q.query(
      `INSERT INTO olympics_seasons (month_key, starts_at, ends_at, status)
       VALUES ($1,$2,$3,'active') RETURNING *`,
      [monthKey, now, endsAt]
    );
    season = s;
  }
  return season;
}

// GET /olympics
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const season = await getOrCreateSeason();

  const { rows: [gm] } = await pool.query(
    'SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]
  );
  const myGuildId = gm?.guild_id || null;

  const { rows: myScores } = await pool.query(
    'SELECT event_key, score FROM olympics_scores WHERE season_id=$1 AND telegram_id=$2',
    [season.id, telegramId]
  );
  const myScoreMap = Object.fromEntries(myScores.map(r => [r.event_key, Number(r.score)]));

  const { rows: guildStandings } = await pool.query(
    `SELECT os.guild_id, g.name as guild_name, g.tag, SUM(os.score) as total_score
     FROM olympics_scores os
     JOIN guilds g ON g.id = os.guild_id
     WHERE os.season_id=$1 AND os.guild_id IS NOT NULL
     GROUP BY os.guild_id, g.name, g.tag
     ORDER BY total_score DESC LIMIT 20`,
    [season.id]
  );

  const eventTops = {};
  for (const ev of OLYMPICS_EVENTS) {
    const { rows } = await pool.query(
      `SELECT os.telegram_id, u.username, os.score
       FROM olympics_scores os
       JOIN users u ON u.telegram_id = os.telegram_id
       WHERE os.season_id=$1 AND os.event_key=$2
       ORDER BY os.score DESC LIMIT 5`,
      [season.id, ev.key]
    );
    eventTops[ev.key] = rows.map(r => ({
      username: r.username,
      score: Number(r.score),
      isMe: r.telegram_id === telegramId,
    }));
  }

  res.json({
    season: { monthKey: season.month_key, endsAt: Number(season.ends_at), status: season.status },
    events: OLYMPICS_EVENTS,
    myScores: myScoreMap,
    myGuildId,
    guildStandings: guildStandings.map((g, i) => ({
      rank: i + 1,
      guildName: g.guild_name,
      tag: g.tag,
      score: Number(g.total_score),
      isMe: Number(g.guild_id) === myGuildId,
    })),
    eventTops,
    rewards: OLYMPICS_GUILD_REWARDS,
  });
}));

// POST /olympics/submit — snapshot player's current stat for one event
router.post('/submit', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { eventKey } = req.body;
  if (!OLYMPICS_EVENTS.find(e => e.key === eventKey)) return res.status(400).json({ error: 'Unknown event' });

  return withTransaction(async (client) => {
    const season = await getOrCreateSeason(client);
    if (season.status !== 'active') return res.status(400).json({ error: 'Olympics not active' });

    const { rows: [gm] } = await client.query(
      'SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]
    );

    let score = 0;
    try {
      switch (eventKey) {
        case 'tap_marathon': {
          const { rows: [p] } = await client.query(
            'SELECT total_taps FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
          );
          score = Number(p?.total_taps || 0);
          break;
        }
        case 'combo_peak': {
          const { rows: [p] } = await client.query(
            'SELECT total_taps FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
          );
          score = Math.floor(Number(p?.total_taps || 0) / 100);
          break;
        }
        case 'gauntlet_run': {
          const { rows: [gr] } = await client.query(
            'SELECT COALESCE(MAX(waves),0) bw FROM gauntlet_runs WHERE telegram_id=$1', [telegramId]
          );
          score = Number(gr?.bw || 0);
          break;
        }
        case 'boss_slayer': {
          const { rows: [bh] } = await client.query(
            'SELECT COALESCE(SUM(damage),0) tot FROM world_boss_hits WHERE telegram_id=$1', [telegramId]
          );
          score = Number(bh?.tot || 0);
          break;
        }
        case 'alchemist': {
          const { rows: [ab] } = await client.query(
            'SELECT COUNT(*) cnt FROM alchemy_brews WHERE telegram_id=$1', [telegramId]
          );
          score = Number(ab?.cnt || 0);
          break;
        }
      }
    } catch (_) {}

    await client.query(
      `INSERT INTO olympics_scores (season_id, telegram_id, guild_id, event_key, score, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (season_id, telegram_id, event_key)
       DO UPDATE SET score=GREATEST(olympics_scores.score,EXCLUDED.score), submitted_at=$6`,
      [season.id, telegramId, gm?.guild_id || null, eventKey, score, Date.now()]
    );

    return res.json({ ok: true, eventKey, score });
  });
}));

module.exports = router;
