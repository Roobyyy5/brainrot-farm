const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TERRITORIES, TERRITORY_CAPTURE_TAPS } = require('../gameConfig');

const router = express.Router();

function territoryWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// GET /territories
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const weekKey = territoryWeekKey();

  const { rows: [guildRow] } = await pool.query('SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]);
  const myGuildId = guildRow?.guild_id || null;

  const { rows: controls } = await pool.query(
    `SELECT tc.territory_id, tc.guild_id, tc.tap_counts, tc.captured_at, g.name AS guild_name, g.tag AS guild_tag
     FROM territory_control tc
     LEFT JOIN guilds g ON g.id = tc.guild_id
     WHERE tc.week_key = $1`,
    [weekKey]
  );

  const controlMap = {};
  for (const c of controls) controlMap[c.territory_id] = c;

  const myTaps = {};
  if (myGuildId) {
    for (const c of controls) {
      const counts = c.tap_counts || {};
      myTaps[c.territory_id] = Number(counts[myGuildId] || 0);
    }
  }

  res.json({
    weekKey,
    myGuildId,
    captureThreshold: TERRITORY_CAPTURE_TAPS,
    territories: TERRITORIES.map(t => {
      const ctrl = controlMap[t.id];
      const guildTaps = ctrl ? (ctrl.tap_counts || {}) : {};
      const topGuildId = ctrl?.guild_id;
      return {
        ...t,
        controlledBy: topGuildId ? { guildId: topGuildId, name: ctrl?.guild_name, tag: ctrl?.guild_tag } : null,
        capturedAt: ctrl?.captured_at || null,
        myGuildTaps: myGuildId ? Number(guildTaps[myGuildId] || 0) : 0,
        totalTaps: Object.values(guildTaps).reduce((a, b) => a + Number(b), 0),
        isMyGuild: topGuildId === myGuildId,
      };
    }),
  });
}));

// POST /territories/tap — guild taps on a territory
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { territoryId, count } = req.body;
  if (!TERRITORIES.find(t => t.id === territoryId)) return res.status(400).json({ error: 'Unknown territory' });
  const taps = Math.min(Math.max(1, Number(count) || 1), 1000);

  return withTransaction(async (client) => {
    const { rows: [guildRow] } = await client.query('SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (!guildRow?.guild_id) return res.status(400).json({ error: 'Not in a guild' });
    const guildId = guildRow.guild_id;
    const weekKey = territoryWeekKey();

    await client.query(
      `INSERT INTO territory_control (territory_id, week_key, guild_id, tap_counts, captured_at)
       VALUES ($1,$2,$3, jsonb_build_object($3::text, $4::bigint), $5)
       ON CONFLICT (territory_id, week_key) DO UPDATE
       SET tap_counts = territory_control.tap_counts || jsonb_build_object(
         $3::text,
         COALESCE((territory_control.tap_counts->$3::text)::bigint, 0) + $4
       )`,
      [territoryId, weekKey, String(guildId), taps, Date.now()]
    );

    // Check if this guild now leads and capture threshold met
    const { rows: [ctrl] } = await client.query(
      'SELECT tap_counts, guild_id FROM territory_control WHERE territory_id=$1 AND week_key=$2',
      [territoryId, weekKey]
    );
    const counts = ctrl.tap_counts || {};
    const topEntry = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    if (topEntry && Number(topEntry[1]) >= TERRITORY_CAPTURE_TAPS) {
      const newOwner = Number(topEntry[0]);
      await client.query(
        'UPDATE territory_control SET guild_id=$1, captured_at=$2 WHERE territory_id=$3 AND week_key=$4',
        [newOwner, Date.now(), territoryId, weekKey]
      );
    }

    return res.json({ ok: true, taps, guildId });
  });
}));

module.exports = router;
