const { Bot, InlineKeyboard } = require('grammy');

function startBot() {
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is missing in .env');
  }
  if (!process.env.MINI_APP_URL) {
    throw new Error('MINI_APP_URL is missing in .env');
  }

  const bot = new Bot(process.env.BOT_TOKEN);

  bot.command('start', (ctx) => {
    // If the user reached the bot via a deep link (t.me/Bot?start=<code>),
    // grammY exposes the payload in ctx.match. We forward it as a query param
    // so the Mini App can still pick up a referral code if it wasn't opened
    // through the dedicated `?startapp=` link.
    const refPayload = ctx.match;
    const appUrl = refPayload ? `${process.env.MINI_APP_URL}?ref=${encodeURIComponent(refPayload)}` : process.env.MINI_APP_URL;

    const keyboard = new InlineKeyboard().webApp('🧠 Open Brainrot Farm', appUrl);

    ctx.reply(
      'Welcome to Brainrot Farm! Farm braincells, climb from NPC to Gigachad, and invite friends for bonus points.',
      { reply_markup: keyboard }
    );
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  bot.start();
  console.log('Brainrot Farm bot is polling for updates...');
  return bot;
}

if (require.main === module) {
  require('dotenv').config();
  startBot();
}

module.exports = { startBot };
