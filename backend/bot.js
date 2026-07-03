const { Bot, InlineKeyboard } = require('grammy');

const BOT_MSGS = {
  en: {
    welcome: (name) => `🧠 Welcome to Brainrot Farm, ${name}!\n\nTap, farm, and flex your brain power!\n\n🏆 Earn Brainrot Points and climb the leaderboard.`,
    open_app: '🧠 Open Brainrot Farm',
    join_channel: '📢 Join Channel',
  },
  uk: {
    welcome: (name) => `🧠 Ласкаво просимо до Brainrot Farm, ${name}!\n\nТапай, фармай та демонструй силу свого мозку!\n\n🏆 Збирай Brainrot Points та підкорюй лідерборд.`,
    open_app: '🧠 Відкрити Brainrot Farm',
    join_channel: '📢 Приєднатись до каналу',
  },
  ru: {
    welcome: (name) => `🧠 Добро пожаловать в Brainrot Farm, ${name}!\n\nТапай, фармь и демонстрируй силу своего мозга!\n\n🏆 Зарабатывай Brainrot Points и покоряй таблицу лидеров.`,
    open_app: '🧠 Открыть Brainrot Farm',
    join_channel: '📢 Присоединиться к каналу',
  },
};

function getBotMsg(langCode) {
  const l = langCode?.split(/[-_]/)[0];
  return BOT_MSGS[l] || BOT_MSGS.en;
}

async function startBot() {
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is missing in .env');
  }
  if (!process.env.MINI_APP_URL) {
    throw new Error('MINI_APP_URL is missing in .env');
  }
  if (!process.env.MINI_APP_URL.startsWith('https://')) {
    throw new Error(`MINI_APP_URL must start with https:// (got "${process.env.MINI_APP_URL}") — Telegram rejects non-HTTPS web_app buttons`);
  }

  const bot = new Bot(process.env.BOT_TOKEN);

  bot.command('start', async (ctx) => {
    // If the user reached the bot via a deep link (t.me/Bot?start=<code>),
    // grammY exposes the payload in ctx.match. We forward it as a query param
    // so the Mini App can still pick up a referral code if it wasn't opened
    // through the dedicated `?startapp=` link.
    const refPayload = ctx.match;
    const appUrl = refPayload ? `${process.env.MINI_APP_URL}?ref=${encodeURIComponent(refPayload)}` : process.env.MINI_APP_URL;

    const channelUrl = process.env.CHANNEL_URL || 'https://t.me/figabrainnews';
    const msgs = getBotMsg(ctx.from?.language_code);
    const username = ctx.from?.first_name || ctx.from?.username || 'Brain';
    const keyboard = new InlineKeyboard()
      .webApp(msgs.open_app, appUrl)
      .row()
      .url(msgs.join_channel, channelUrl);

    await ctx.reply(msgs.welcome(username), { reply_markup: keyboard });
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  // bot.init() resolves once the token has been validated against the
  // Telegram API, so a bad token surfaces here instead of failing silently
  // inside the fire-and-forget polling loop started by bot.start().
  await bot.init();
  bot.start().catch((err) => console.error('Bot polling crashed:', err));
  console.log(`Brainrot Farm bot @${bot.botInfo.username} is polling for updates...`);
  return bot;
}

if (require.main === module) {
  require('dotenv').config();
  startBot().catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });
}

module.exports = { startBot };
