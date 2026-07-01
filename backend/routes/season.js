const express = require('express');
const router = express.Router();
const db = require('../db');
const { withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { SEASON_TOP_GEMS, SEASON_TROPHY_ICONS, SEASON_DURATION_TAPPER_MS } = require('../gameConfig');

async function getSeasonInfo() {
  const sR = await db.query("SELECT value FROM app_state WHERE key='tapper_season'");
  const eR = await db.query("SELECT value FROM app_state WHERE key='tapper_season_ends_at'");
  const seasonNum = sR.rows[0] ? Number(sR.rows[0].value) : 1;
  const endsAt    = eR.rows[0] ? Number(eR.rows[0].value) : Date.now() + SEASON_DURATION_TAPPER_MS;
  return { seasonNum, endsAt };
}

// GET /season
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { seasonNum, endsAt } = await getSeasonInfo();

  const top20 = await db.query(`
    SELECT u.username, tp.season_bp, tp.prestige
    FROM tapper_profiles tp
    JOIN users u ON u.telegram_id = tp.telegram_id
    WHERE tp.season_bp > 0
    ORDER BY tp.season_bp DESC LIMIT 20
  `);

  const myR = await db.query(`
    SELECT season_bp,
      (SELECT COUNT(*)+1 FROM tapper_profiles WHERE season_bp > tp.season_bp)::int AS rank
    FROM tapper_profiles tp WHERE telegram_id = $1
  `, [telegramId]);

  const trophyR = await db.query(
    'SELECT season_num, rank, bp_earned, trophy_icon FROM season_trophies WHERE telegram_id=$1 ORDER BY season_num DESC LIMIT 5',
    [telegramId]
  );

  res.json({
    seasonNum,
    endsAt,
    topPlayers: top20.rows.map((r, i) => ({
      rank:     i + 1,
      username: r.username || '???',
      seasonBp: Number(r.season_bp),
      prestige: r.prestige,
    })),
    mySeasonBp: myR.rows[0] ? Number(myR.rows[0].season_bp) : 0,
    myRank:     myR.rows[0] ? Number(myR.rows[0].rank) : null,
    prizes:     SEASON_TOP_GEMS,
    trophies:   trophyR.rows.map(r => ({ ...r, bpEarned: Number(r.bp_earned) })),
  });
}));

async function settleSeason() {
  const { seasonNum, endsAt } = await getSeasonInfo();
  if (Date.now() < endsAt) return;

  console.log(`Settling tapper season ${seasonNum}...`);
  await withTransaction(async (client) => {
    const top = await client.query(
      'SELECT telegram_id, season_bp FROM tapper_profiles WHERE season_bp > 0 ORDER BY season_bp DESC LIMIT 50'
    );
    const now = Date.now();
    for (let i = 0; i < top.rows.length; i++) {
      const gems  = SEASON_TOP_GEMS[i] ?? 10;
      const icon  = SEASON_TROPHY_ICONS[i + 1] || (i < 10 ? '🏆' : '🎖️');
      await client.query('UPDATE users SET gems = gems + $1 WHERE telegram_id = $2', [gems, top.rows[i].telegram_id]);
      await client.query(
        'INSERT INTO season_trophies (telegram_id, season_num, rank, bp_earned, trophy_icon, awarded_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [top.rows[i].telegram_id, seasonNum, i + 1, top.rows[i].season_bp, icon, now]
      );
    }
    const newSeason = seasonNum + 1;
    const newEndsAt = now + SEASON_DURATION_TAPPER_MS;
    await client.query('UPDATE tapper_profiles SET season_bp = 0, tapper_season = $1', [newSeason]);
    await client.query(`
      INSERT INTO app_state (key, value) VALUES ('tapper_season',$1),('tapper_season_ends_at',$2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [newSeason, newEndsAt]);
  });

  console.log(`Season ${seasonNum} settled.`);
}

module.exports = { router, settleSeason };
