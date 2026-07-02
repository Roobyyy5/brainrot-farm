const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { getSeasonNarrative, SEASON_NARRATIVES } = require('../gameConfig');

// GET /seasonnarrative — current season story + upcoming
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const profR = await pool.query(
    'SELECT tapper_season, season_bp FROM tapper_profiles WHERE telegram_id=$1',
    [telegramId]
  );
  const seasonNum = Number(profR.rows[0]?.tapper_season || 1);
  const seasonBP = Number(profR.rows[0]?.season_bp || 0);

  const current = getSeasonNarrative(seasonNum);
  const next = getSeasonNarrative(seasonNum + 1);

  // Global season leaderboard snapshot (top 5)
  const lb = await pool.query(`
    SELECT u.username, tp.season_bp
    FROM tapper_profiles tp
    JOIN users u ON u.telegram_id = tp.telegram_id
    WHERE tp.tapper_season=$1 AND tp.season_bp > 0
    ORDER BY tp.season_bp DESC LIMIT 5
  `, [seasonNum]);

  res.json({
    seasonNum,
    current,
    next,
    mySeasonBP: seasonBP,
    topPlayers: lb.rows.map((r, i) => ({ rank: i + 1, username: r.username || '???', bp: Number(r.season_bp) })),
    allNarratives: SEASON_NARRATIVES,
  });
}));

module.exports = router;
