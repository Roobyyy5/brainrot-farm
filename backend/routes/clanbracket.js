const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const MATCH_DURATION_MS = 48 * 60 * 60 * 1000; // 48h per match
const LEGENDARY_REWARD_GEMS = 200;
const FINALIST_REWARD_GEMS = 100;
const SEMIFINAL_REWARD_GEMS = 50;

function currentSeasonWeek() {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

async function getOrCreateBracket(client) {
  const week = currentSeasonWeek();
  const existing = await client.query('SELECT * FROM clan_brackets WHERE season_week=$1', [week]);
  if (existing.rows[0]) return existing.rows[0];
  const ins = await client.query(
    "INSERT INTO clan_brackets (season_week, status, started_at) VALUES ($1,'open',$2) RETURNING *",
    [week, Date.now()]
  );
  return ins.rows[0];
}

// GET /clanbracket — current bracket state
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const memberR = await pool.query('SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]);
  const myGuildId = memberR.rows[0]?.guild_id || null;

  const week = currentSeasonWeek();
  const bracketR = await pool.query('SELECT * FROM clan_brackets WHERE season_week=$1', [week]);
  if (!bracketR.rows[0]) {
    return res.json({ bracket: null, myGuildId, week });
  }
  const bracket = bracketR.rows[0];

  const entries = await pool.query(
    `SELECT cbe.*, g.name as guild_name FROM clan_bracket_entries cbe
     JOIN guilds g ON g.id = cbe.guild_id
     WHERE cbe.bracket_id=$1 ORDER BY cbe.seed ASC`,
    [bracket.id]
  );
  const matches = await pool.query(
    `SELECT cbm.*, ga.name as guild_a_name, gb.name as guild_b_name
     FROM clan_bracket_matches cbm
     JOIN guilds ga ON ga.id = cbm.guild_a_id
     LEFT JOIN guilds gb ON gb.id = cbm.guild_b_id
     WHERE cbm.bracket_id=$1 ORDER BY cbm.round ASC, cbm.id ASC`,
    [bracket.id]
  );

  res.json({
    bracket: {
      id: bracket.id,
      status: bracket.status,
      week: bracket.season_week,
    },
    entries: entries.rows,
    matches: matches.rows,
    myGuildId,
  });
}));

// POST /clanbracket/register — join current bracket
router.post('/register', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  await withTransaction(async (client) => {
    const memberR = await client.query('SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (!memberR.rows[0]) throw Object.assign(new Error('Not in a guild'), { status: 400 });
    const guildId = memberR.rows[0].guild_id;

    const bracket = await getOrCreateBracket(client);
    if (bracket.status !== 'open') throw Object.assign(new Error('Registration closed'), { status: 400 });

    const guildR = await client.query('SELECT name FROM guilds WHERE id=$1', [guildId]);
    const guildName = guildR.rows[0]?.name || 'Unknown';

    const entryCount = await client.query('SELECT COUNT(*) FROM clan_bracket_entries WHERE bracket_id=$1', [bracket.id]);
    const seed = Number(entryCount.rows[0].count) + 1;

    await client.query(
      `INSERT INTO clan_bracket_entries (bracket_id, guild_id, guild_name, seed)
       VALUES ($1,$2,$3,$4) ON CONFLICT (bracket_id, guild_id) DO NOTHING`,
      [bracket.id, guildId, guildName, seed]
    );
  });

  res.json({ ok: true });
}));

// POST /clanbracket/start — admin-like: start bracket with current entries (min 2)
router.post('/start', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  await withTransaction(async (client) => {
    const bracket = await getOrCreateBracket(client);
    if (bracket.status !== 'open') throw Object.assign(new Error('Already started'), { status: 400 });

    const entries = await client.query(
      'SELECT * FROM clan_bracket_entries WHERE bracket_id=$1 ORDER BY seed ASC',
      [bracket.id]
    );
    if (entries.rows.length < 2) throw Object.assign(new Error('Need at least 2 guilds'), { status: 400 });

    // Create round 1 matches: pair entries by seed
    const guilds = entries.rows;
    const now = Date.now();
    for (let i = 0; i < guilds.length - 1; i += 2) {
      await client.query(
        `INSERT INTO clan_bracket_matches (bracket_id, round, guild_a_id, guild_b_id, ends_at)
         VALUES ($1, 1, $2, $3, $4)`,
        [bracket.id, guilds[i].guild_id, guilds[i + 1].guild_id, now + MATCH_DURATION_MS]
      );
    }
    // Bye for odd guild
    if (guilds.length % 2 === 1) {
      const bye = guilds[guilds.length - 1];
      await client.query(
        `INSERT INTO clan_bracket_matches (bracket_id, round, guild_a_id, guild_b_id, winner_id, settled, ends_at)
         VALUES ($1, 1, $2, NULL, $2, TRUE, $3)`,
        [bracket.id, bye.guild_id, now]
      );
    }

    await client.query("UPDATE clan_brackets SET status='active' WHERE id=$1", [bracket.id]);
  });

  res.json({ ok: true });
}));

// POST /clanbracket/tap — contribute to active match (current guild's score)
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const taps = Math.min(Math.max(1, Math.floor(Number(req.body.count) || 1)), 500);
  const now = Date.now();

  await withTransaction(async (client) => {
    const memberR = await client.query('SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (!memberR.rows[0]) throw Object.assign(new Error('Not in a guild'), { status: 400 });
    const guildId = memberR.rows[0].guild_id;

    const week = currentSeasonWeek();
    const bracketR = await client.query("SELECT id FROM clan_brackets WHERE season_week=$1 AND status='active'", [week]);
    if (!bracketR.rows[0]) throw Object.assign(new Error('No active bracket'), { status: 404 });

    const matchR = await client.query(
      `SELECT * FROM clan_bracket_matches WHERE bracket_id=$1 AND settled=FALSE AND ends_at>$2
       AND (guild_a_id=$3 OR guild_b_id=$3) FOR UPDATE`,
      [bracketR.rows[0].id, now, guildId]
    );
    if (!matchR.rows[0]) throw Object.assign(new Error('No active match for your guild'), { status: 404 });
    const match = matchR.rows[0];

    const profR = await client.query('SELECT tap_power_level FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    const tapPower = (Number(profR.rows[0]?.tap_power_level) || 0) + 1;
    const bp = tapPower * taps;

    const col = match.guild_a_id === guildId ? 'score_a' : 'score_b';
    await client.query(`UPDATE clan_bracket_matches SET ${col}=${col}+$1 WHERE id=$2`, [bp, match.id]);
  });

  res.json({ ok: true });
}));

// POST /clanbracket/settle-match/:id — settle an ended match
router.post('/settle-match/:id', asyncHandler(async (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  const now = Date.now();

  await withTransaction(async (client) => {
    const matchR = await client.query(
      'SELECT * FROM clan_bracket_matches WHERE id=$1 AND settled=FALSE AND ends_at<=$2 FOR UPDATE',
      [matchId, now]
    );
    if (!matchR.rows[0]) throw Object.assign(new Error('Match not found or not ended'), { status: 404 });
    const match = matchR.rows[0];

    const winnerId = Number(match.score_a) >= Number(match.score_b) ? match.guild_a_id : match.guild_b_id;
    const loserId = winnerId === match.guild_a_id ? match.guild_b_id : match.guild_a_id;

    await client.query('UPDATE clan_bracket_matches SET settled=TRUE, winner_id=$1 WHERE id=$2', [winnerId, matchId]);
    if (loserId) {
      await client.query('UPDATE clan_bracket_entries SET eliminated=TRUE WHERE bracket_id=$1 AND guild_id=$2', [match.bracket_id, loserId]);
    }

    // Check if all matches in this round are settled → create next round
    const roundMatches = await client.query(
      'SELECT * FROM clan_bracket_matches WHERE bracket_id=$1 AND round=$2',
      [match.bracket_id, match.round]
    );
    const allSettled = roundMatches.rows.every(m => m.settled || m.id === matchId);
    if (allSettled) {
      const winners = roundMatches.rows.map(m => m.winner_id || (m.id === matchId ? winnerId : m.winner_id)).filter(Boolean);
      if (winners.length === 1) {
        // Tournament over — reward winner guild members
        const members = await client.query('SELECT telegram_id FROM guild_members WHERE guild_id=$1', [winners[0]]);
        for (const m of members.rows) {
          await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [LEGENDARY_REWARD_GEMS, m.telegram_id]);
        }
        await client.query("UPDATE clan_brackets SET status='completed', ended_at=$1 WHERE id=$2", [now, match.bracket_id]);
      } else if (winners.length > 1) {
        // Create next round
        const nextRound = match.round + 1;
        for (let i = 0; i < winners.length - 1; i += 2) {
          await client.query(
            'INSERT INTO clan_bracket_matches (bracket_id, round, guild_a_id, guild_b_id, ends_at) VALUES ($1,$2,$3,$4,$5)',
            [match.bracket_id, nextRound, winners[i], winners[i + 1], now + MATCH_DURATION_MS]
          );
        }
        if (winners.length % 2 === 1) {
          const bye = winners[winners.length - 1];
          await client.query(
            'INSERT INTO clan_bracket_matches (bracket_id, round, guild_a_id, guild_b_id, winner_id, settled, ends_at) VALUES ($1,$2,$3,NULL,$3,TRUE,$4)',
            [match.bracket_id, nextRound, bye, now]
          );
        }
      }
    }
  });

  res.json({ ok: true });
}));

module.exports = router;
