const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GUILD_WAR_TOP_REWARDS } = require('../gameConfig');

const router = express.Router();

function currentWarWeek() {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

// GET /guildwars — war leaderboard + my guild's current score
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const week = currentWarWeek();
  const endsAt = (week + 1) * 7 * 24 * 60 * 60 * 1000;

  const [boardRes, myGuildRes] = await Promise.all([
    pool.query(
      `SELECT gw.guild_id, gw.war_score, g.name, g.tag, g.level
       FROM guild_wars gw
       JOIN guilds g ON g.id = gw.guild_id
       WHERE gw.season_week = $1
       ORDER BY gw.war_score DESC
       LIMIT 10`,
      [week]
    ),
    pool.query(
      `SELECT gm.guild_id, gw.war_score, g.name, g.tag
       FROM guild_members gm
       JOIN guilds g ON g.id = gm.guild_id
       LEFT JOIN guild_wars gw ON gw.guild_id = gm.guild_id AND gw.season_week = $2
       WHERE gm.telegram_id = $1`,
      [tid, week]
    ),
  ]);

  const leaderboard = boardRes.rows.map((r, i) => ({
    rank: i + 1,
    guildId: r.guild_id,
    name: r.name,
    tag: r.tag,
    level: r.level,
    warScore: Number(r.war_score),
    gemReward: GUILD_WAR_TOP_REWARDS[i] || 0,
  }));

  const myGuild = myGuildRes.rows[0];
  res.json({
    leaderboard,
    myGuild: myGuild ? {
      guildId: myGuild.guild_id,
      name: myGuild.name,
      tag: myGuild.tag,
      warScore: Number(myGuild.war_score) || 0,
    } : null,
    endsAt,
    rewards: GUILD_WAR_TOP_REWARDS,
  });
}));

// Called internally from guilds.js boss tap — not a public endpoint
async function addWarScore(guildId, damage) {
  const week = currentWarWeek();
  await pool.query(
    `INSERT INTO guild_wars (season_week, guild_id, war_score)
     VALUES ($1, $2, $3)
     ON CONFLICT (season_week, guild_id)
     DO UPDATE SET war_score = guild_wars.war_score + EXCLUDED.war_score`,
    [week, guildId, damage]
  );
}

module.exports = { router, addWarScore };
