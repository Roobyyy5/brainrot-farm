import { Router } from "express";
import { get as redisGet, setex as redisSetex } from "../../lib/redis.js";

export const i18nRouter = Router();

// Static bundled translations — served directly, no API calls needed.
const STATIC: Record<string, unknown> = {
  en: {
    nav: { feed: "Feed", search: "Search", economy: "Brain Economy", messages: "Messages", wallet: "Wallet", leaderboard: "Leaderboard", notifications: "Notifications", profile: "Profile", settings: "Settings", rewards: "Rewards" },
    settings: { title: "Profile Settings", displayName: "Display name", bio: "Bio", language: "Language", searchLanguage: "Search language...", noLanguages: "No languages found.", save: "Save changes", saving: "Saving...", saved: "Saved!", logout: "Log out", saveError: "Failed to save. Please try again." },
    feed: { placeholder: "What's on your brain?", post: "Post", posting: "Posting...", like: "Like", comment: "Comment", repost: "Repost", report: "Report", noMore: "No more posts.", empty: "No posts yet. Be the first!" },
    search: { title: "Search users", placeholder: "@username or display name", searching: "...", search: "Search", notFound: "No users found." },
    leaderboard: { loading: "Loading leaderboard..." },
    notifications: { empty: "No notifications yet." },
    economy: { activeBoosters: "Active boosters", lootboxes: "Loot Boxes", noLootboxes: "No unopened loot boxes. Earn XP to get new ones!", missions: "Missions", daily: "Daily", weekly: "Weekly", achievements: "Achievements", season: "Season", noSeason: "No active season right now.", seasonEnded: "Ended", yourScore: "Your score", claimReward: "🎁 Claim reward", claiming: "Claiming...", rewardClaimed: "✓ Reward claimed", timeLeft: "{{days}}d {{hours}}h left" },
    profile: { follow: "Follow", unfollow: "Unfollow", followers: "Followers", following: "Following", posts: "Posts", brainPoints: "Brain Points", loginStreak: "Login Streak", reputation: "Reputation" },
    messages: { title: "Messages", placeholder: "Message...", send: "Send", sending: "...", newConversation: "Start new conversation", usernamePlaceholder: "@username" },
    common: { loading: "Loading...", error: "Something went wrong.", retry: "Retry", cancel: "Cancel", close: "Close", back: "Back" },
  },
  uk: {
    nav: { feed: "Стрічка", search: "Пошук", economy: "Економіка", messages: "Повідомлення", wallet: "Гаманець", leaderboard: "Рейтинг", notifications: "Сповіщення", profile: "Профіль", settings: "Налаштування", rewards: "Нагороди" },
    settings: { title: "Налаштування профілю", displayName: "Відображуване ім'я", bio: "Про себе", language: "Мова", searchLanguage: "Пошук мови...", noLanguages: "Мов не знайдено.", save: "Зберегти", saving: "Збереження...", saved: "Збережено!", logout: "Вийти", saveError: "Помилка збереження. Спробуйте ще раз." },
    feed: { placeholder: "Що у тебе на думці?", post: "Опублікувати", posting: "Публікація...", like: "Лайк", comment: "Коментар", repost: "Репост", report: "Поскаржитись", noMore: "Більше дописів немає.", empty: "Ще немає дописів. Будь першим!" },
    search: { title: "Пошук користувачів", placeholder: "@нікнейм або ім'я", searching: "...", search: "Знайти", notFound: "Користувачів не знайдено." },
    leaderboard: { loading: "Завантаження рейтингу..." },
    notifications: { empty: "Поки немає сповіщень." },
    economy: { activeBoosters: "Активні бустери", lootboxes: "Лутбокси", noLootboxes: "Немає невідкритих лутбоксів. Заробляй XP, щоб отримати нові!", missions: "Місії", daily: "Щоденні", weekly: "Щотижневі", achievements: "Досягнення", season: "Сезон", noSeason: "Наразі немає активного сезону.", seasonEnded: "Завершено", yourScore: "Твій результат", claimReward: "🎁 Отримати нагороду", claiming: "Отримання...", rewardClaimed: "✓ Нагороду отримано", timeLeft: "{{days}}д {{hours}}г залишилось" },
    profile: { follow: "Стежити", unfollow: "Відписатись", followers: "Підписники", following: "Підписки", posts: "Пости", brainPoints: "Brain Points", loginStreak: "Серія входів", reputation: "Репутація" },
    messages: { title: "Повідомлення", placeholder: "Повідомлення...", send: "Відправити", sending: "...", newConversation: "Нова розмова", usernamePlaceholder: "@нікнейм" },
    common: { loading: "Завантаження...", error: "Щось пішло не так.", retry: "Спробувати знову", cancel: "Скасувати", close: "Закрити", back: "Назад" },
  },
  ru: {
    nav: { feed: "Лента", search: "Поиск", economy: "Экономика", messages: "Сообщения", wallet: "Кошелёк", leaderboard: "Рейтинг", notifications: "Уведомления", profile: "Профиль", settings: "Настройки", rewards: "Награды" },
    settings: { title: "Настройки профиля", displayName: "Отображаемое имя", bio: "О себе", language: "Язык", searchLanguage: "Поиск языка...", noLanguages: "Языков не найдено.", save: "Сохранить", saving: "Сохранение...", saved: "Сохранено!", logout: "Выйти", saveError: "Ошибка сохранения. Попробуйте ещё раз." },
    feed: { placeholder: "Что у тебя на уме?", post: "Опубликовать", posting: "Публикация...", like: "Лайк", comment: "Комментарий", repost: "Репост", report: "Пожаловаться", noMore: "Больше постов нет.", empty: "Постов ещё нет. Будь первым!" },
    search: { title: "Поиск пользователей", placeholder: "@никнейм или имя", searching: "...", search: "Найти", notFound: "Пользователи не найдены." },
    leaderboard: { loading: "Загрузка рейтинга..." },
    notifications: { empty: "Уведомлений пока нет." },
    economy: { activeBoosters: "Активные бустеры", lootboxes: "Лутбоксы", noLootboxes: "Нет неоткрытых лутбоксов. Зарабатывай XP, чтобы получить новые!", missions: "Миссии", daily: "Ежедневные", weekly: "Еженедельные", achievements: "Достижения", season: "Сезон", noSeason: "Сейчас нет активного сезона.", seasonEnded: "Завершён", yourScore: "Твой результат", claimReward: "🎁 Получить награду", claiming: "Получение...", rewardClaimed: "✓ Награда получена", timeLeft: "{{days}}д {{hours}}ч осталось" },
    profile: { follow: "Подписаться", unfollow: "Отписаться", followers: "Подписчики", following: "Подписки", posts: "Посты", brainPoints: "Brain Points", loginStreak: "Серия входов", reputation: "Репутация" },
    messages: { title: "Сообщения", placeholder: "Сообщение...", send: "Отправить", sending: "...", newConversation: "Новый разговор", usernamePlaceholder: "@никнейм" },
    common: { loading: "Загрузка...", error: "Что-то пошло не так.", retry: "Попробовать снова", cancel: "Отмена", close: "Закрыть", back: "Назад" },
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
i18nRouter.get("/:lang", async (req, res) => {
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
