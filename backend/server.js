require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db');
const { telegramAuthMiddleware } = require('./telegramAuth');
const registerRoute = require('./routes/register');
const farmRoute = require('./routes/farm');
const dailyRoute = require('./routes/daily');
const leaderboardRoute = require('./routes/leaderboard');
const referralRoute = require('./routes/referral');

const app = express();
app.use(cors());
app.use(express.json());

const botStatus = { configured: false, started: false, error: null };

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/bot-status', (req, res) => res.json(botStatus));

// TEMPORARY — identifies exactly which Postgres instance this deploy is
// talking to, to debug a local-vs-prod data mismatch. Remove after.
app.get('/debug/db', async (req, res) => {
  try {
    const result = await db.pool.query(
      "SELECT current_database() as db, inet_server_addr()::text as addr, inet_server_port() as port, (SELECT count(*) FROM users) as user_count"
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/leaderboard', leaderboardRoute); // public, no auth

app.use('/register', telegramAuthMiddleware, registerRoute);
app.use('/farm', telegramAuthMiddleware, farmRoute);
app.use('/daily', telegramAuthMiddleware, dailyRoute);
app.use('/referral', telegramAuthMiddleware, referralRoute);

async function main() {
  await db.init();

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Brainrot Farm backend running on http://localhost:${PORT}`);
  });

  // On free hosting tiers (e.g. Render) only a single Web Service is free —
  // background workers are a paid add-on. Running the bot's long-polling loop
  // inside the same process keeps the whole stack on one free service.
  if (process.env.BOT_TOKEN && process.env.MINI_APP_URL) {
    botStatus.configured = true;
    const { startBot } = require('./bot');
    startBot()
      .then(() => {
        botStatus.started = true;
      })
      .catch((err) => {
        botStatus.error = err.message;
        console.error('Failed to start bot:', err);
      });
  } else {
    botStatus.error = 'BOT_TOKEN/MINI_APP_URL not set';
    console.log('BOT_TOKEN/MINI_APP_URL not set — skipping in-process bot startup.');
  }
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
