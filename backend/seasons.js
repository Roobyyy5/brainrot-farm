const { pool, withTransaction } = require('./db');
const { SEASON_DURATION_MS } = require('./gameConfig');

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function ensureSeasonRow() {
  const existing = await pool.query("SELECT value FROM app_state WHERE key = 'season_reset_at'");
  if (existing.rows[0]) return parseInt(existing.rows[0].value, 10);

  const resetAt = Date.now() + SEASON_DURATION_MS;
  await pool.query(
    "INSERT INTO app_state (key, value) VALUES ('season_reset_at', $1) ON CONFLICT (key) DO NOTHING",
    [resetAt]
  );
  return resetAt;
}

async function checkSeasonReset() {
  const resetAt = await ensureSeasonRow();
  if (Date.now() < resetAt) return;

  await withTransaction(async (client) => {
    const top = await client.query(
      'SELECT telegram_id, username, weekly_coins FROM users ORDER BY weekly_coins DESC LIMIT 10'
    );
    await client.query('INSERT INTO season_history (ended_at, top_users) VALUES ($1, $2)', [
      Date.now(),
      JSON.stringify(top.rows),
    ]);
    await client.query('UPDATE users SET weekly_coins = 0');
    await client.query(
      "UPDATE app_state SET value = $1 WHERE key = 'season_reset_at'",
      [Date.now() + SEASON_DURATION_MS]
    );
  });
  console.log('Weekly season reset complete.');
}

function startSeasonScheduler() {
  checkSeasonReset().catch((err) => console.error('Season check failed:', err.message));
  setInterval(() => {
    checkSeasonReset().catch((err) => console.error('Season check failed:', err.message));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startSeasonScheduler };
