export const LANGS = {
  en: {
    // Tabs
    tab_home:  'Home',
    tab_tap:   'Tap',
    tab_cards: 'Cards',
    tab_boost: 'Boost',
    tab_club:  'Club',
    tab_board: 'Board',
    // Header
    header_sub: 'Farm. Flex. Recruit NPCs.',
    // Balance
    balance_label: 'Brainrot Points',
    balance_to:    'to',
    // TapGame
    loading:            'Loading...',
    tap_total:          'Total Taps',
    tap_power:          'Power',
    tap_prestige_label: 'Prestige',
    tap_prestige_btn:   '✨ PRESTIGE (reset upgrades, keep glory)',
    tap_prestige_confirm: 'Prestige resets all upgrades but keeps your glory. Continue?',
    tap_no_prestige:    'Cannot prestige yet',
    tap_passive:        '+{n} BP/hr passive',
    tap_talent_title:   '🌟 Choose Your Talent!',
    tap_talent_sub:     'Pick one permanent upgrade:',
    // Offline modal
    offline_title:  'Welcome Back!',
    offline_desc:   'Auto Brain worked while you were offline',
    offline_added:  'Already added to your balance!',
    offline_btn:    'Awesome!',
    // Rank up modal
    rank_up:     'RANK UP!',
    rank_up_sub: "You've reached a new rank!",
  },

  uk: {
    tab_home:  'Дім',
    tab_tap:   'Тап',
    tab_cards: 'Картки',
    tab_boost: 'Буст',
    tab_club:  'Клуб',
    tab_board: 'Борд',
    header_sub: 'Тапай. Флексуй. Рекрутуй NPCʼшок.',
    balance_label: 'Brainrot Points',
    balance_to:    'до',
    loading:            'Завантаження...',
    tap_total:          'Тапів всього',
    tap_power:          'Сила',
    tap_prestige_label: 'Престиж',
    tap_prestige_btn:   '✨ ПРЕСТИЖ (скидає апгрейди, слава залишається)',
    tap_prestige_confirm: 'Престиж скидає всі апгрейди, але слава залишається. Продовжити?',
    tap_no_prestige:    'Ще не можна зробити престиж',
    tap_passive:        '+{n} BP/год пасив',
    tap_talent_title:   '🌟 Вибери Талант!',
    tap_talent_sub:     'Обери один постійний апгрейд:',
    offline_title:  'З поверненням!',
    offline_desc:   'Авто-Мозок працював поки тебе не було',
    offline_added:  'Вже додано до твого балансу!',
    offline_btn:    'Вогонь! 🔥',
    rank_up:     'НОВИЙ РАНГ!',
    rank_up_sub: 'Ти досяг нового рангу!',
  },

  ru: {
    tab_home:  'Главная',
    tab_tap:   'Тап',
    tab_cards: 'Карточки',
    tab_boost: 'Буст',
    tab_club:  'Клуб',
    tab_board: 'Борд',
    header_sub: 'Тапай. Флексуй. Рекрутируй NPC.',
    balance_label: 'Brainrot Points',
    balance_to:    'до',
    loading:            'Загрузка...',
    tap_total:          'Всего тапов',
    tap_power:          'Сила',
    tap_prestige_label: 'Престиж',
    tap_prestige_btn:   '✨ ПРЕСТИЖ (сбросит апгрейды, слава останется)',
    tap_prestige_confirm: 'Престиж сбросит все апгрейды, но слава останется. Продолжить?',
    tap_no_prestige:    'Ещё нельзя сделать престиж',
    tap_passive:        '+{n} BP/ч пассив',
    tap_talent_title:   '🌟 Выбери Талант!',
    tap_talent_sub:     'Выбери одно постоянное улучшение:',
    offline_title:  'С возвращением!',
    offline_desc:   'Авто-Мозг работал пока тебя не было',
    offline_added:  'Уже добавлено к твоему балансу!',
    offline_btn:    'Огонь! 🔥',
    rank_up:     'НОВЫЙ РАНГ!',
    rank_up_sub: 'Ты достиг нового ранга!',
  },
};

export function getLang() {
  try {
    const sources = [
      window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code,
      navigator?.language,
      navigator?.userLanguage,
    ].filter(Boolean);
    for (const code of sources) {
      if (LANGS[code]) return code;
      const prefix = code.split(/[-_]/)[0];
      if (LANGS[prefix]) return prefix;
    }
  } catch {}
  return 'en';
}

export function t(lang, key, vars = {}) {
  const dict = LANGS[lang] || LANGS.en;
  let str = dict[key] ?? LANGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, String(v));
  }
  return str;
}
