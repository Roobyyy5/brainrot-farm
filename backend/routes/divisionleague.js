const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { DIVISION_SIZE, DIVISION_TIERS, divisionWeekKey } = require('../gameConfig');

const router = express.Router();

async function ensureMembership(client, telegramId) {
  const weekKey = divisionWeekKey();
  const { rows: [existing] } = await client.query(
    'SELECT * FROM division_members WHERE telegram_id=$1 AND week_key=$2',
    [telegramId, weekKey]
  );
  if (existing) return existing;

  // Assign to a division (find one with room, or create new)
  const tier = 'Iron';
  const { rows: [openDiv] } = await client.query(
    `SELECT division_id FROM division_members
     WHERE week_key=$1 AND tier=$2
     GROUP BY division_id HAVING COUNT(*) < $3
     ORDER BY division_id LIMIT 1`,
    [weekKey, tier, DIVISION_SIZE]
  );
  const divisionId = openDiv ? openDiv.division_id : (await getNextDivisionId(client, weekKey, tier));

  const { rows: [created] } = await client.query(
    `INSERT INTO division_members (telegram_id, week_key, division_id, tier, tap_score, rank, settled)
     VALUES ($1,$2,$3,$4,0,0,FALSE) RETURNING *`,
    [telegramId, weekKey, divisionId, tier]
  );
  return created;
}

async function getNextDivisionId(client, weekKey, tier) {
  const { rows: [r] } = await client.query(
    'SELECT COALESCE(MAX(division_id),0)+1 AS next FROM division_members WHERE week_key=$1 AND tier=$2',
    [weekKey, tier]
  );
  return r.next;
}

// GET /divisionleague
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const weekKey = divisionWeekKey();
  const client = await pool.connect();
  try {
    const me = await ensureMembership(client, telegramId);
    const tierDef = DIVISION_TIERS.find(t => t.name === me.tier) || DIVISION_TIERS[0];

    const { rows: division } = await client.query(
      `SELECT dm.telegram_id, dm.tap_score, dm.tier, u.username,
              ROW_NUMBER() OVER (ORDER BY dm.tap_score DESC) AS rank
       FROM division_members dm
       JOIN users u ON u.telegram_id = dm.telegram_id
       WHERE dm.week_key=$1 AND dm.division_id=$2
       ORDER BY dm.tap_score DESC`,
      [weekKey, me.division_id]
    );

    const myEntry = division.find(r => r.telegram_id === telegramId);
    const timeUntilEnd = (Math.ceil(Date.now() / (7 * 24 * 60 * 60 * 1000)) * 7 * 24 * 60 * 60 * 1000) - Date.now();

    res.json({
      me: {
        tier: me.tier,
        divisionId: me.division_id,
        tapScore: Number(me.tap_score),
        rank: myEntry ? Number(myEntry.rank) : 0,
        settled: me.settled,
      },
      tierDef,
      division: division.map(r => ({
        rank: Number(r.rank),
        username: r.username,
        tapScore: Number(r.tap_score),
        isMe: r.telegram_id === telegramId,
      })),
      tiers: DIVISION_TIERS,
      weekKey,
      timeUntilEndMs: timeUntilEnd,
    });
  } finally {
    client.release();
  }
}));

// Internal: add tap score to division
async function addDivisionScore(telegramId, score) {
  try {
    const weekKey = divisionWeekKey();
    await pool.query(
      `INSERT INTO division_members (telegram_id, week_key, division_id, tier, tap_score, rank, settled)
       VALUES ($1,$2,1,'Iron',$3,0,FALSE)
       ON CONFLICT (telegram_id, week_key) DO UPDATE SET tap_score = division_members.tap_score + $3`,
      [telegramId, weekKey, score]
    );
  } catch { /* fire-and-forget */ }
}

// Internal: weekly settle — promote/relegate + reward
async function settleDivisions() {
  const weekKey = divisionWeekKey();
  const { rows: divisions } = await pool.query(
    `SELECT DISTINCT division_id, tier FROM division_members WHERE week_key=$1 AND settled=FALSE`,
    [weekKey]
  );

  for (const div of divisions) {
    const { rows: members } = await pool.query(
      `SELECT telegram_id, tap_score, ROW_NUMBER() OVER (ORDER BY tap_score DESC) AS rank
       FROM division_members WHERE week_key=$1 AND division_id=$2`,
      [weekKey, div.division_id]
    );
    const tierDef = DIVISION_TIERS.find(t => t.name === div.tier) || DIVISION_TIERS[0];
    const tierIdx = DIVISION_TIERS.indexOf(tierDef);

    for (const m of members) {
      const rank = Number(m.rank);
      const promote = rank <= tierDef.promote && tierIdx < DIVISION_TIERS.length - 1;
      const relegate = tierDef.relegate > 0 && rank > (members.length - tierDef.relegate) && tierIdx > 0;
      const gems = rank <= 3 ? Math.floor(tierDef.gemReward / rank) : 0;

      if (gems > 0) await pool.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [gems, m.telegram_id]);

      const newTier = promote ? DIVISION_TIERS[tierIdx + 1].name : relegate ? DIVISION_TIERS[tierIdx - 1].name : div.tier;
      await pool.query('UPDATE division_members SET settled=TRUE, rank=$1 WHERE telegram_id=$2 AND week_key=$3', [rank, m.telegram_id, weekKey]);

      // Carry over tier for next week
      const nextWeek = divisionWeekKey();
      if (nextWeek !== weekKey) {
        await pool.query(
          `INSERT INTO division_members (telegram_id, week_key, division_id, tier, tap_score, rank, settled)
           VALUES ($1,$2,$3,$4,0,0,FALSE) ON CONFLICT DO NOTHING`,
          [m.telegram_id, nextWeek, div.division_id, newTier]
        ).catch(() => {});
      }
    }
  }
  console.log(`[Division] Settled ${divisions.length} divisions`);
}

module.exports = { router, addDivisionScore, settleDivisions };
