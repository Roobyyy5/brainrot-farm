require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const { telegramAuthMiddleware } = require('./telegramAuth');
const registerRoute = require('./routes/register');
const farmRoute = require('./routes/farm');
const dailyRoute = require('./routes/daily');
const boostRoute = require('./routes/boost');
const leaderboardRoute = require('./routes/leaderboard');
const referralRoute = require('./routes/referral');
const adminRoute = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

// Anti-cheat: server-side cooldowns are the main defense, this is a backstop
// against scripted abuse hammering the API faster than any human could.
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(['/register', '/farm', '/daily', '/boost', '/referral'], actionLimiter);

const botStatus = { configured: false, started: false, error: null };

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/bot-status', (req, res) => res.json(botStatus));

app.use('/leaderboard', leaderboardRoute); // public, no auth
app.use('/admin', adminRoute); // protected by its own x-admin-key check

app.use('/register', telegramAuthMiddleware, registerRoute);
app.use('/farm', telegramAuthMiddleware, farmRoute);
app.use('/daily', telegramAuthMiddleware, dailyRoute);
app.use('/boost', telegramAuthMiddleware, boostRoute);
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
      .then((bot) => {
        botStatus.started = true;
        const { startReminders } = require('./reminders');
        startReminders(bot);
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
