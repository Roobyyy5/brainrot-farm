const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { REFERRAL_TOP_GEMS } = require('../gameConfig');

// GET /referralboard
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const top = await db.query(`
    SELECT u.username, COUNT(r.id)::int AS ref_count
    FROM referrals r
    JOIN users u ON u.telegram_id = r.referrer_id
    WHERE r.created_at >= $1
    GROUP BY r.referrer_id, u.username
    ORDER BY ref_count DESC
    LIMIT 10
  `, [monthStart]);

  const myR = await db.query(
    'SELECT COUNT(id)::int AS ref_count FROM referrals WHERE referrer_id=$1 AND created_at>=$2',
    [telegramId, monthStart]
  );

  const myRankR = await db.query(`
    SELECT (SELECT COUNT(*)+1 FROM (
      SELECT referrer_id, COUNT(id) AS cnt FROM referrals WHERE created_at>=$2 GROUP BY referrer_id
    ) sub WHERE cnt > (SELECT COUNT(id) FROM referrals WHERE referrer_id=$1 AND created_at>=$2))::int AS rank
  `, [telegramId, monthStart]);

  res.json({
    leaderboard: top.rows.map((r, i) => ({
      rank:      i + 1,
      username:  r.username || '???',
      refCount:  r.ref_count,
      prizeGems: REFERRAL_TOP_GEMS[i] ?? 0,
    })),
    myRefCount: myR.rows[0] ? myR.rows[0].ref_count : 0,
    myRank:     myRankR.rows[0] ? myRankR.rows[0].rank : null,
    prizes:     REFERRAL_TOP_GEMS,
    monthStart,
  });
}));

module.exports = router;
