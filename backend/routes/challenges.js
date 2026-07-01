const express = require('express');
const router = express.Router();
const db = require('../db');
const { withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey() {
  const d = new Date();
  const day = d.getDay() || 7;
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMondayMs(weekKey) {
  const [year, wn] = weekKey.split('-W');
  const jan4 = new Date(Number(year), 0, 4);
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
  const monday = new Date(week1Mon);
  monday.setDate(week1Mon.getDate() + (Number(wn) - 1) * 7);
  return monday.getTime();
}

const DAILY_CHALLENGES = [
  {
    key: 'tap_500_daily', label: 'Tap 500 times today', icon: '👆', reward: { gems: 3 }, type: 'daily',
    async check(client, telegramId, periodKey) {
      const r = await client.query(
        "SELECT COALESCE(SUM(tap_count),0) AS t FROM tap_batches WHERE telegram_id=$1 AND to_char(to_timestamp(created_at/1000),'YYYY-MM-DD')=$2",
        [telegramId, periodKey]
      );
      return Number(r.rows[0].t) >= 500;
    },
  },
  {
    key: 'earn_1k_bp_daily', label: 'Earn 1,000 BP from taps today', icon: '💰', reward: { gems: 2 }, type: 'daily',
    async check(client, telegramId, periodKey) {
      const r = await client.query(
        "SELECT COALESCE(SUM(bp_earned),0) AS t FROM tap_batches WHERE telegram_id=$1 AND to_char(to_timestamp(created_at/1000),'YYYY-MM-DD')=$2",
        [telegramId, periodKey]
      );
      return Number(r.rows[0].t) >= 1000;
    },
  },
  {
    key: 'open_loot_daily', label: 'Open a Loot Box today', icon: '🎁', reward: { bp: 500 }, type: 'daily',
    async check(client, telegramId, periodKey) {
      const r = await client.query(
        "SELECT 1 FROM daily_shop_purchases WHERE telegram_id=$1 AND date_key=$2 LIMIT 1",
        [telegramId, periodKey]
      );
      return r.rows.length > 0;
    },
  },
];

const WEEKLY_CHALLENGES = [
  {
    key: 'tap_10k_week', label: 'Tap 10,000 times this week', icon: '🔥', reward: { gems: 20 }, type: 'weekly',
    async check(client, telegramId, periodKey) {
      const monday = getMondayMs(periodKey);
      const r = await client.query(
        'SELECT COALESCE(SUM(tap_count),0) AS t FROM tap_batches WHERE telegram_id=$1 AND created_at>=$2',
        [telegramId, monday]
      );
      return Number(r.rows[0].t) >= 10000;
    },
  },
  {
    key: 'win_duel_week', label: 'Win a Duel this week', icon: '⚔️', reward: { gems: 15 }, type: 'weekly',
    async check(client, telegramId, periodKey) {
      const monday = getMondayMs(periodKey);
      const r = await client.query(
        'SELECT COUNT(*) AS cnt FROM tap_duels WHERE winner_id=$1 AND ends_at>=$2',
        [telegramId, monday]
      );
      return Number(r.rows[0].cnt) >= 1;
    },
  },
  {
    key: 'guild_boss_week', label: 'Hit the Guild Boss this week', icon: '🏰', reward: { gems: 10 }, type: 'weekly',
    async check(client, telegramId, periodKey) {
      const monday = getMondayMs(periodKey);
      const r = await client.query(
        'SELECT 1 FROM guild_boss_hits gbh JOIN guild_boss_fights gbf ON gbf.id=gbh.fight_id WHERE gbh.telegram_id=$1 AND gbf.created_at>=$2 LIMIT 1',
        [telegramId, monday]
      );
      return r.rows.length > 0;
    },
  },
  {
    key: 'world_boss_week', label: 'Hit the World Boss this week', icon: '🌍', reward: { gems: 10 }, type: 'weekly',
    async check(client, telegramId, periodKey) {
      const monday = getMondayMs(periodKey);
      const r = await client.query(
        'SELECT 1 FROM world_boss_hits wbh JOIN world_boss wb ON wb.id=wbh.boss_id WHERE wbh.telegram_id=$1 AND wb.starts_at>=$2 LIMIT 1',
        [telegramId, monday]
      );
      return r.rows.length > 0;
    },
  },
];

const ALL_CHALLENGES = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES];

// GET /challenges
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const dayKey  = getDayKey();
  const weekKey = getWeekKey();

  const claimed = await db.query(
    'SELECT challenge_key, period_key FROM challenge_claims WHERE telegram_id = $1 AND period_key IN ($2, $3)',
    [telegramId, dayKey, weekKey]
  );
  const claimedSet = new Set(claimed.rows.map(r => `${r.challenge_key}:${r.period_key}`));

  const result = ALL_CHALLENGES.map(c => {
    const pk = c.type === 'daily' ? dayKey : weekKey;
    return {
      key:     c.key,
      label:   c.label,
      icon:    c.icon,
      reward:  c.reward,
      type:    c.type,
      claimed: claimedSet.has(`${c.key}:${pk}`),
    };
  });

  res.json({ daily: result.filter(c => c.type === 'daily'), weekly: result.filter(c => c.type === 'weekly') });
}));

// POST /challenges/claim
router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { challengeKey } = req.body;

  const challenge = ALL_CHALLENGES.find(c => c.key === challengeKey);
  if (!challenge) return res.status(400).json({ error: 'Unknown challenge' });

  const periodKey = challenge.type === 'daily' ? getDayKey() : getWeekKey();

  const claimedR = await db.query(
    'SELECT 1 FROM challenge_claims WHERE telegram_id=$1 AND challenge_key=$2 AND period_key=$3',
    [telegramId, challengeKey, periodKey]
  );
  if (claimedR.rows[0]) return res.status(400).json({ error: 'Already claimed' });

  await withTransaction(async (client) => {
    const completed = await challenge.check(client, telegramId, periodKey);
    if (!completed) throw Object.assign(new Error('Challenge not completed yet'), { status: 400 });

    await client.query(
      'INSERT INTO challenge_claims (telegram_id, challenge_key, period_key, claimed_at) VALUES ($1,$2,$3,$4)',
      [telegramId, challengeKey, periodKey, Date.now()]
    );
    if (challenge.reward.gems) {
      await client.query('UPDATE users SET gems = gems + $1 WHERE telegram_id = $2', [challenge.reward.gems, telegramId]);
    }
    if (challenge.reward.bp) {
      await client.query('UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2', [challenge.reward.bp, telegramId]);
    }
  });

  res.json({ ok: true, reward: challenge.reward });
}));

module.exports = router;
