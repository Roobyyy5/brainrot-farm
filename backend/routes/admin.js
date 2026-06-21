const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

function requireAdminKey(req, res, next) {
  if (!process.env.ADMIN_KEY) return res.status(503).json({ error: 'ADMIN_KEY not configured' });
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.get(
  '/stats',
  requireAdminKey,
  asyncHandler(async (req, res) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const [totalUsers, newUsersToday, dau, totalReferrals, activeReferrals, eventCounts] = await Promise.all([
      pool.query('SELECT count(*) FROM users'),
      pool.query('SELECT count(*) FROM users WHERE created_at >= $1', [oneDayAgo]),
      pool.query(
        'SELECT count(DISTINCT telegram_id) FROM events WHERE event_type IN ($1, $2) AND created_at >= $3',
        ['farm', 'daily', oneDayAgo]
      ),
      pool.query('SELECT count(*) FROM referrals'),
      pool.query('SELECT count(*) FROM referrals WHERE active_bonus_paid = TRUE'),
      pool.query('SELECT event_type, count(*) FROM events GROUP BY event_type ORDER BY count(*) DESC'),
    ]);

    const total = parseInt(totalReferrals.rows[0].count, 10);
    const active = parseInt(activeReferrals.rows[0].count, 10);

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count, 10),
      newUsersLast24h: parseInt(newUsersToday.rows[0].count, 10),
      dau: parseInt(dau.rows[0].count, 10),
      totalReferrals: total,
      activeReferrals: active,
      referralConversionRate: total > 0 ? Math.round((active / total) * 100) : 0,
      eventCounts: eventCounts.rows,
    });
  })
);

module.exports = router;
