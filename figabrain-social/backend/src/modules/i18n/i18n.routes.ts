import { Router } from "express";
import rateLimit from "express-rate-limit";
import { get as redisGet, setex as redisSetex } from "../../lib/redis.js";

export const i18nRouter = Router();

// Public endpoint — no auth — so apply a strict rate limit to prevent abuse
// of the Google Translate proxy (each uncached language costs ~50 API calls).
const i18nRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,                   // 60 language fetches per IP per hour is generous for normal use
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many translation requests, please try again later." },
});

// Static bundled translations — served directly, no API calls needed.
const STATIC: Record<string, unknown> = {
  en: {
    nav: { feed: "Feed", search: "Search", economy: "Brain Economy", messages: "Messages", wallet: "Wallet", leaderboard: "Leaderboard", notifications: "Notifications", profile: "Profile", settings: "Settings", rewards: "Rewards" },
    settings: { title: "Profile Settings", displayName: "Display name", bio: "Bio", avatarUrl: "Avatar URL", language: "Language", searchLanguage: "Search language...", noLanguages: "No languages found.", save: "Save changes", saving: "Saving...", saved: "Saved!", logout: "Log out", saveError: "Failed to save. Please try again." },
    feed: { placeholder: "What's on your brain?", post: "Post", posting: "Posting...", like: "Like", comment: "Comment", repost: "Repost", report: "Report", noMore: "No more posts.", empty: "No posts yet. Be the first!", filterAll: "All", filterFollowing: "Following", followingEmpty: "Follow some users to see their posts here.", loading: "Loading..." },
    postDetail: { back: "← Back", edit: "Edit", delete: "Delete", save: "Save", saving: "Saving...", share: "Share", report: "Report", reported: "Reported", commentPlaceholder: "Write a comment...", reply: "Reply", noComments: "No comments yet.", loadMore: "Load more", loadingMore: "Loading...", confirmDelete: "Delete this post?", reportPrompt: "Reason for report (optional):" },
    season: { noParticipants: "No participants yet.", showLess: "Show less", showAll: "Show all ({{count}})", ending: "Ending soon..." },
    search: { title: "Search users", placeholder: "@username or display name", searching: "...", search: "Search", notFound: "No users found.", hint: "Enter a name or keyword to search" },
    leaderboard: { loading: "Loading leaderboard...", empty: "No entries yet.", alltime: "All time", weekly: "This week", daily: "Today" },
    notifications: { empty: "No notifications yet." },
    economy: { activeBoosters: "Active boosters", lootboxes: "Loot Boxes", noLootboxes: "No unopened loot boxes. Earn XP to get new ones!", missions: "Missions", daily: "Daily", weekly: "Weekly", achievements: "Achievements", season: "Season", noSeason: "No active season right now.", seasonEnded: "Ended", yourScore: "Your score", claimReward: "🎁 Claim reward", claiming: "Claiming...", rewardClaimed: "✓ Reward claimed", timeLeft: "{{days}}d {{hours}}h left" },
    profile: { follow: "Follow", unfollow: "Unfollow", followers: "Followers", following: "Following", posts: "Posts", brainPoints: "Brain Points", loginStreak: "Login Streak", reputation: "Reputation", noBio: "No bio yet.", noPosts: "No posts yet.", loadMore: "Load more", repHistory: "Rep history", longestStreak: "Longest", toNextMilestone: "{{days}}d to next milestone" },
    rankCard: { multiplier: "x{{multiplier}} BP & XP multiplier" },
    rewards: { rules: "Reward Rules", history: "Your History", noHistory: "No reward history yet.", total: "Total" },
    wallet: { title: "Your FIGABRAIN Wallet", chain: "Internal {{chain}} wallet · private key encrypted at rest", convertTitle: "Convert BP → FGB", convertRate: "Rate: {{rate}} FGB per BP · Min: {{min}} BP", convert: "Convert", converting: "...", maxBtn: "MAX", recentConversions: "Recent conversions", tokenLaunch: "Token Launch", tokenLaunchDesc: "FGB token will be deployed on {{chain}}. Converted FGB is credited to your off-chain balance now and will be settled on-chain at launch.", onChainDisabled: "On-chain transfers not yet enabled.", airdrops: "Airdrops Available", claim: "Claim", claiming: "...", stakeTitle: "Stake FGB", selectPool: "Select pool...", stakeBtn: "Stake", yourPositions: "Your positions", collect: "Collect", locked: "Locked", nfts: "Your NFTs", referralTitle: "Referral Program", referralDesc: "Earn +50 BP for each friend who joins via your link.", buyBpTitle: "Buy Brain Points", buyBpDesc: "Send crypto to our wallet and submit your transaction hash — admin will verify and credit BP to your account within 24 hours.", buyBpSelect: "Select package", buyBpCurrency: "Pay with", buyBpAddress: "Send {{currency}} to this address:", buyBpTxHash: "Your transaction hash", buyBpSubmit: "Submit Payment", buyBpSubmitting: "Submitting...", buyBpSuccess: "Request submitted! BP will be credited after verification.", buyBpHistory: "Purchase History", buyBpPending: "Pending", buyBpSubmitted: "Submitted", buyBpApproved: "Approved ✓", buyBpRejected: "Rejected", buyLootboxTitle: "Loot Box Shop", buyLootboxDesc: "Spend BP to get loot boxes and win bonus points, XP, and boosters.", buy: "Buy", tgeTitle: "FGB Token Launch", tgeWaitlistDesc: "Join the waitlist to be the first notified when FGB goes on-chain.", tgeJoin: "Join TGE Waitlist", tgeJoined: "✓ You're on the waitlist" },
    messages: { title: "Messages", placeholder: "Message...", send: "Send", sending: "...", newConversation: "+ New message", usernamePlaceholder: "@username", to: "To:", noMessages: "No messages yet. Say hello!", recipientRequired: "Enter a recipient username", composeHint: "Type a message below to start", selectOrNew: "Select a conversation or start a new one", noConversations: "No conversations yet." },
    common: { loading: "Loading...", error: "Something went wrong.", retry: "Retry", cancel: "Cancel", close: "Close", back: "Back", loadMore: "Load more" },
  },
  uk: {
    nav: { feed: "Стрічка", search: "Пошук", economy: "Економіка", messages: "Повідомлення", wallet: "Гаманець", leaderboard: "Рейтинг", notifications: "Сповіщення", profile: "Профіль", settings: "Налаштування", rewards: "Нагороди" },
    settings: { title: "Налаштування профілю", displayName: "Відображуване ім'я", bio: "Про себе", avatarUrl: "URL аватара", language: "Мова", searchLanguage: "Пошук мови...", noLanguages: "Мов не знайдено.", save: "Зберегти", saving: "Збереження...", saved: "Збережено!", logout: "Вийти", saveError: "Помилка збереження. Спробуйте ще раз." },
    feed: { placeholder: "Що у тебе на думці?", post: "Опублікувати", posting: "Публікація...", like: "Лайк", comment: "Коментар", repost: "Репост", report: "Поскаржитись", noMore: "Більше дописів немає.", empty: "Ще немає дописів. Будь першим!", filterAll: "Всі", filterFollowing: "Підписки", followingEmpty: "Підпишись на користувачів, щоб бачити їхні дописи.", loading: "Завантаження..." },
    postDetail: { back: "← Назад", edit: "Редагувати", delete: "Видалити", save: "Зберегти", saving: "Збереження...", share: "Поділитись", report: "Поскаржитись", reported: "Скарга надіслана", commentPlaceholder: "Написати коментар...", reply: "Відповісти", noComments: "Коментарів ще немає.", loadMore: "Завантажити ще", loadingMore: "Завантаження...", confirmDelete: "Видалити цей допис?", reportPrompt: "Причина скарги (необов'язково):" },
    season: { noParticipants: "Поки немає учасників.", showLess: "Згорнути", showAll: "Показати всіх ({{count}})", ending: "Завершується..." },
    search: { title: "Пошук користувачів", placeholder: "@нікнейм або ім'я", searching: "...", search: "Знайти", notFound: "Користувачів не знайдено.", hint: "Введи імʼя або ключове слово для пошуку" },
    leaderboard: { loading: "Завантаження рейтингу...", empty: "Поки нікого немає.", alltime: "За весь час", weekly: "Цього тижня", daily: "Сьогодні" },
    notifications: { empty: "Поки немає сповіщень." },
    economy: { activeBoosters: "Активні бустери", lootboxes: "Лутбокси", noLootboxes: "Немає невідкритих лутбоксів. Заробляй XP, щоб отримати нові!", missions: "Місії", daily: "Щоденні", weekly: "Щотижневі", achievements: "Досягнення", season: "Сезон", noSeason: "Наразі немає активного сезону.", seasonEnded: "Завершено", yourScore: "Твій результат", claimReward: "🎁 Отримати нагороду", claiming: "Отримання...", rewardClaimed: "✓ Нагороду отримано", timeLeft: "{{days}}д {{hours}}г залишилось" },
    profile: { follow: "Стежити", unfollow: "Відписатись", followers: "Підписники", following: "Підписки", posts: "Пости", brainPoints: "Brain Points", loginStreak: "Серія входів", reputation: "Репутація", noBio: "Немає біо.", noPosts: "Постів ще немає.", loadMore: "Завантажити ще", repHistory: "Історія репутації", longestStreak: "Найдовша", toNextMilestone: "{{days}}д до наступного рубежу" },
    rankCard: { multiplier: "x{{multiplier}} BP та XP множник" },
    rewards: { rules: "Правила нагород", history: "Твоя історія", noHistory: "Історія нагород порожня.", total: "Всього" },
    wallet: { title: "Твій гаманець FIGABRAIN", chain: "Внутрішній {{chain}} гаманець · приватний ключ зашифровано", convertTitle: "Конвертувати BP → FGB", convertRate: "Курс: {{rate}} FGB за BP · Мін: {{min}} BP", convert: "Конвертувати", converting: "...", maxBtn: "МАКС", recentConversions: "Останні конвертації", tokenLaunch: "Запуск токена", tokenLaunchDesc: "Токен FGB буде задеплоєно на {{chain}}. Конвертований FGB зараховується на офф-чейн баланс і буде розподілено на чейн після запуску.", onChainDisabled: "Онлайн-трансфери ще не увімкнено.", airdrops: "Доступні аірдропи", claim: "Отримати", claiming: "...", stakeTitle: "Стейкінг FGB", selectPool: "Обери пул...", stakeBtn: "Застейкати", yourPositions: "Твої позиції", collect: "Зняти", locked: "Заблоковано", nfts: "Твої NFT", referralTitle: "Реферальна програма", referralDesc: "Отримуй +50 BP за кожного друга, який приєднається за твоїм посиланням.", buyBpTitle: "Купити Brain Points", buyBpDesc: "Надішли крипту на наш гаманець і вкажи хеш транзакції — адмін перевірить і нарахує BP протягом 24 годин.", buyBpSelect: "Обери пакет", buyBpCurrency: "Оплата", buyBpAddress: "Надішли {{currency}} на цю адресу:", buyBpTxHash: "Хеш твоєї транзакції", buyBpSubmit: "Підтвердити оплату", buyBpSubmitting: "Надсилання...", buyBpSuccess: "Запит надіслано! BP буде нараховано після перевірки.", buyBpHistory: "Історія покупок", buyBpPending: "Очікування", buyBpSubmitted: "Надіслано", buyBpApproved: "Підтверджено ✓", buyBpRejected: "Відхилено", buyLootboxTitle: "Магазин лутбоксів", buyLootboxDesc: "Витрачай BP на лутбокси та вигравай бонусні очки, XP і бустери.", buy: "Купити", tgeTitle: "Запуск токена FGB", tgeWaitlistDesc: "Приєднайся до списку очікування, щоб першим дізнатись про запуск FGB в мережі.", tgeJoin: "Вступити до TGE Waitlist", tgeJoined: "✓ Ти в списку очікування" },
    messages: { title: "Повідомлення", placeholder: "Повідомлення...", send: "Відправити", sending: "...", newConversation: "+ Нове повідомлення", usernamePlaceholder: "@нікнейм", to: "Кому:", noMessages: "Повідомлень ще немає. Привітайся!", recipientRequired: "Введи нікнейм отримувача", composeHint: "Напиши повідомлення нижче щоб розпочати", selectOrNew: "Обери розмову або розпочни нову", noConversations: "Розмов ще немає." },
    common: { loading: "Завантаження...", error: "Щось пішло не так.", retry: "Спробувати знову", cancel: "Скасувати", close: "Закрити", back: "Назад", loadMore: "Завантажити ще" },
  },
  ru: {
    nav: { feed: "Лента", search: "Поиск", economy: "Экономика", messages: "Сообщения", wallet: "Кошелёк", leaderboard: "Рейтинг", notifications: "Уведомления", profile: "Профиль", settings: "Настройки", rewards: "Награды" },
    settings: { title: "Настройки профиля", displayName: "Отображаемое имя", bio: "О себе", avatarUrl: "URL аватара", language: "Язык", searchLanguage: "Поиск языка...", noLanguages: "Языков не найдено.", save: "Сохранить", saving: "Сохранение...", saved: "Сохранено!", logout: "Выйти", saveError: "Ошибка сохранения. Попробуйте ещё раз." },
    feed: { placeholder: "Что у тебя на уме?", post: "Опубликовать", posting: "Публикация...", like: "Лайк", comment: "Комментарий", repost: "Репост", report: "Пожаловаться", noMore: "Больше постов нет.", empty: "Постов ещё нет. Будь первым!", filterAll: "Все", filterFollowing: "Подписки", followingEmpty: "Подпишись на пользователей, чтобы видеть их посты здесь.", loading: "Загрузка..." },
    postDetail: { back: "← Назад", edit: "Редактировать", delete: "Удалить", save: "Сохранить", saving: "Сохранение...", share: "Поделиться", report: "Пожаловаться", reported: "Жалоба отправлена", commentPlaceholder: "Написать комментарий...", reply: "Ответить", noComments: "Комментариев пока нет.", loadMore: "Загрузить ещё", loadingMore: "Загрузка...", confirmDelete: "Удалить этот пост?", reportPrompt: "Причина жалобы (необязательно):" },
    season: { noParticipants: "Участников пока нет.", showLess: "Свернуть", showAll: "Показать всех ({{count}})", ending: "Завершается..." },
    search: { title: "Поиск пользователей", placeholder: "@никнейм или имя", searching: "...", search: "Найти", notFound: "Пользователи не найдены.", hint: "Введи имя или ключевое слово для поиска" },
    leaderboard: { loading: "Загрузка рейтинга...", empty: "Пока никого нет.", alltime: "За всё время", weekly: "Эта неделя", daily: "Сегодня" },
    notifications: { empty: "Уведомлений пока нет." },
    economy: { activeBoosters: "Активные бустеры", lootboxes: "Лутбоксы", noLootboxes: "Нет неоткрытых лутбоксов. Зарабатывай XP, чтобы получить новые!", missions: "Миссии", daily: "Ежедневные", weekly: "Еженедельные", achievements: "Достижения", season: "Сезон", noSeason: "Сейчас нет активного сезона.", seasonEnded: "Завершён", yourScore: "Твой результат", claimReward: "🎁 Получить награду", claiming: "Получение...", rewardClaimed: "✓ Награда получена", timeLeft: "{{days}}д {{hours}}ч осталось" },
    profile: { follow: "Подписаться", unfollow: "Отписаться", followers: "Подписчики", following: "Подписки", posts: "Посты", brainPoints: "Brain Points", loginStreak: "Серия входов", reputation: "Репутация", noBio: "Биo не заполнено.", noPosts: "Постов пока нет.", loadMore: "Загрузить ещё", repHistory: "История репутации", longestStreak: "Наибольшая", toNextMilestone: "{{days}}д до следующей отметки" },
    rankCard: { multiplier: "x{{multiplier}} BP и XP множитель" },
    rewards: { rules: "Правила наград", history: "Твоя история", noHistory: "История наград пуста.", total: "Итого" },
    wallet: { title: "Твой кошелёк FIGABRAIN", chain: "Внутренний {{chain}} кошелёк · приватный ключ зашифрован", convertTitle: "Конвертировать BP → FGB", convertRate: "Курс: {{rate}} FGB за BP · Мин: {{min}} BP", convert: "Конвертировать", converting: "...", maxBtn: "МАКС", recentConversions: "Последние конвертации", tokenLaunch: "Запуск токена", tokenLaunchDesc: "Токен FGB будет задеплоен на {{chain}}. Конвертированный FGB зачисляется на офф-чейн баланс и будет распределён на чейн после запуска.", onChainDisabled: "Онлайн-переводы ещё не включены.", airdrops: "Доступные аирдропы", claim: "Получить", claiming: "...", stakeTitle: "Стейкинг FGB", selectPool: "Выбери пул...", stakeBtn: "Застейкать", yourPositions: "Твои позиции", collect: "Снять", locked: "Заблокировано", nfts: "Твои NFT", referralTitle: "Реферальная программа", referralDesc: "Получай +50 BP за каждого друга, который присоединится по твоей ссылке.", buyBpTitle: "Купить Brain Points", buyBpDesc: "Отправь крипту на наш кошелёк и укажи хеш транзакции — админ проверит и начислит BP в течение 24 часов.", buyBpSelect: "Выбери пакет", buyBpCurrency: "Оплата", buyBpAddress: "Отправь {{currency}} на этот адрес:", buyBpTxHash: "Хеш твоей транзакции", buyBpSubmit: "Подтвердить оплату", buyBpSubmitting: "Отправка...", buyBpSuccess: "Запрос отправлен! BP будет начислен после проверки.", buyBpHistory: "История покупок", buyBpPending: "Ожидание", buyBpSubmitted: "Отправлено", buyBpApproved: "Подтверждено ✓", buyBpRejected: "Отклонено", buyLootboxTitle: "Магазин лутбоксов", buyLootboxDesc: "Трать BP на лутбоксы и выигрывай бонусные очки, XP и бустеры.", buy: "Купить", tgeTitle: "Запуск токена FGB", tgeWaitlistDesc: "Вступи в список ожидания, чтобы первым узнать о запуске FGB в сети.", tgeJoin: "Вступить в TGE Waitlist", tgeJoined: "✓ Ты в списке ожидания" },
    messages: { title: "Сообщения", placeholder: "Сообщение...", send: "Отправить", sending: "...", newConversation: "+ Новое сообщение", usernamePlaceholder: "@никнейм", to: "Кому:", noMessages: "Сообщений пока нет. Поздоровайся!", recipientRequired: "Введи никнейм получателя", composeHint: "Напиши сообщение ниже чтобы начать", selectOrNew: "Выбери разговор или начни новый", noConversations: "Разговоров пока нет." },
    common: { loading: "Загрузка...", error: "Что-то пошло не так.", retry: "Попробовать снова", cancel: "Отмена", close: "Закрыть", back: "Назад", loadMore: "Загрузить ещё" },
  },
};

// Flatten nested object to key→value pairs, protecting {{placeholders}}.
function flatten(obj: unknown, prefix = ""): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push([key, v]);
    else out.push(...flatten(v, key));
  }
  return out;
}

// Rebuild nested object from flat key→value pairs.
function unflatten(pairs: [string, string][]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of pairs) {
    const parts = key.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = {};
      node = node[parts[i]] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}

// Replace {{placeholder}} tokens with stable ASCII markers before translation
// and restore them afterward so they aren't mangled by the translator.
function protectPlaceholders(text: string): { protected: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let i = 0;
  const protected_ = text.replace(/\{\{[^}]+\}\}/g, (match) => {
    const marker = `XPLACEHOLDERX${i++}X`;
    map.set(marker, match);
    return marker;
  });
  return { protected: protected_, map };
}

function restorePlaceholders(text: string, map: Map<string, string>): string {
  let result = text;
  for (const [marker, original] of map.entries()) {
    result = result.replaceAll(marker, original);
  }
  return result;
}

// Map i18n codes that differ from Google Translate codes.
const GT_LANG_MAP: Record<string, string> = {
  "zh": "zh-CN",
  "nb": "no",
  "nn": "no",
};
function toGoogleLang(code: string): string {
  return GT_LANG_MAP[code] ?? code;
}

async function googleTranslate(text: string, targetLang: string): Promise<string> {
  const lang = toGoogleLang(targetLang);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return text;
  const data = (await res.json()) as unknown[][];
  // Response: [ [[translatedSegment, original, ...], ...], ... ]
  const segments = data[0] as unknown[][];
  return segments.map((s) => (s as string[])[0]).join("");
}

const CACHE_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

// GET /api/i18n/:lang  →  returns i18next namespace JSON
i18nRouter.get("/:lang", i18nRateLimiter, async (req, res) => {
  const { lang } = req.params;

  // Serve static translations immediately.
  if (STATIC[lang]) {
    return res.json(STATIC[lang]);
  }

  // Check Redis cache.
  try {
    const cached = await redisGet(`i18n:trans:${lang}`);
    if (cached) return res.json(JSON.parse(cached));
  } catch { /* redis miss — continue */ }

  // Auto-translate from English using Google Translate.
  const en = STATIC["en"] as Record<string, unknown>;
  const pairs = flatten(en);

  const translated: [string, string][] = await Promise.all(
    pairs.map(async ([key, value]) => {
      const { protected: safe, map } = protectPlaceholders(value);
      try {
        const result = await googleTranslate(safe, lang);
        return [key, restorePlaceholders(result, map)] as [string, string];
      } catch {
        return [key, value] as [string, string]; // fallback to EN
      }
    })
  );

  const result = unflatten(translated);

  // Cache in Redis.
  try {
    await redisSetex(`i18n:trans:${lang}`, CACHE_TTL, JSON.stringify(result));
  } catch { /* ignore cache write failure */ }

  return res.json(result);
});
