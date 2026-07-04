# Brainrot Farm — Global Launch Audit
**Дата:** 2026-07-04  
**Аудитор:** Claude Sonnet 4.6  
**Охоплення:** frontend/src, backend/*.js, render.yaml  

---

## BLOCKER (критичні — блокують лонч)

### B1 — EN locale: oracle_waiting містить УКРАЇНСЬКУ рядок
**Файл:** `frontend/src/i18n.js:527`  
```js
oracle_waiting: 'Oracle чекає на тебе',  // ← EN locale, але текст — Ukrainian!
```
EN-користувачі бачать `oracle_waiting` українською. Всі локалі, де ключ відсутній, fallback на EN → теж Ukrainian. Тобто ES/FR/DE/PT/ZH/AR/HI/JA/KO бачать Ukrainian у Tap Oracle.  
**Фікс:** `'Oracle awaits you'`

### B2 — Referral link broken на Render: BOT_USERNAME не в render.yaml
**Файл:** `render.yaml`  
`BOT_USERNAME` env var відсутній у `brainrot-farm-bot` envVars.  
`register.js` повертає `process.env.BOT_USERNAME || ''` → App.jsx → Referral.jsx fallback: `'YourBotUsername'`.  
Результат: всі реферальні посилання на проді виглядають як `https://t.me/YourBotUsername?startapp=...` — повністю зламано.  
**Фікс:** додати `BOT_USERNAME` в render.yaml envVars і .env.example.

### B3 — reminders.js: всі push-повідомлення hardcoded ENGLISH
**Файл:** `backend/reminders.js`  
5 типів нотифікацій (ферма готова, daily reward, energy full, boss alert, duel challenge) надсилаються ЛИШЕ англійською незалежно від мови гравця.  
На глобальному ринку 60%+ гравців (UK/RU + інші) отримують незрозумілий текст.  
**Фікс:** додати `language_code` до queries, використати словник перекладів.

### B4 — UK locale: ~15 рядків залишились ENGLISH
**Файл:** `frontend/src/i18n.js`  
Неповні переклади в українській локалі:
- `gauntlet_header: '⚔️ Tap Gauntlet'` (EN назва)
- `gauntlet_lb_title: '🏅 Leaderboard'` (English)
- `gauntlet_start_btn: '⚔️ Почати Gauntlet'` (mixed)
- `gauntlet_result_ms: '✅ {n}+ milestone досягнуто!'` (mixed)
- `fusion_header: '✨ Card Fusion'`; `fusion_available: 'Доступні для fusion:'`; `fusion_btn_fusing: '✨ Fusion...'`; `fusion_btn_fuse: '✨ Fuse {card} → Слот {slot}'`; `fusion_empty: '...для fusion...'`
- `forge_header: '⚒️ Guild Forge'`
- `oracle_header: '🔮 Tap Oracle'`; `oracle_coins: '🪙 {n} Oracle Coins'`; `oracle_claim_alert: '+{n} 🪙 Oracle Coins!'`
- `auction_header: '🏪 Auction House'`
- `champ_header: '🏆 Monthly Championship'`; `champ_my_score_label: 'Мій season score'`; `champ_status_bracket: '🏆 Bracket'`; `champ_top_n: 'Top {n} для участі'`
- `neural_header: '🧠 Neural Prestige Tree'`; `neural_points: '... Neural Points ...'`; `neural_cost: '... Neural Points'`; `neural_unlock_btn: '... ({n} pts)'`; `neural_hint: '...Neural Points... prestige/ascension'`
- `const_header: '🌌 Prestige Constellation'`; `const_locked: '...після Ascension {n}'`; `const_stardust: '...Stardust...'`; `const_earned: '...(prestige×10 + ascension×80)'`; `const_hint: '...Stardust...prestige...ascension'`
- `tscal_header: '🔥 Streak Calendar'`; `tscal_day_streak: 'day streak'`
- `olympics_header: '🏅 Guild Olympics'`; `olympics_submit_btn: '📊 Submit'`; `olympics_empty: '... Submit свій...'`
- `rival_shards: '🔮 {n} shards'`; `rival_shards_gained: '+{n} 🔮 shards'`

### B5 — RU locale: ті самі ~20 рядків ENGLISH/MIXED
**Файл:** `frontend/src/i18n.js`  
Дзеркало B4 для RU локалі. Зокрема:
- `gauntlet_header`, `gauntlet_lb_title`, `gauntlet_start_btn`, `gauntlet_result_ms` — English
- `fusion_header`, `fusion_available`, `fusion_btn_fusing`, `fusion_btn_fuse`, `fusion_empty` — mixed
- `forge_header`, `oracle_header`, `oracle_coins`, `oracle_claim_alert`, `auction_header` — English
- `champ_header`, `champ_my_score_label`, `champ_status_bracket`, `champ_top_n` — mixed
- `neural_header`, `neural_points`, `neural_cost`, `neural_unlock_btn`, `neural_hint` — mixed
- `const_header`, `const_locked`, `const_stardust`, `const_earned`, `const_hint` — mixed
- `tscal_header`, `tscal_day_streak`, `olympics_header`, `olympics_submit_btn` — English/mixed

---

## HIGH (серйозні — треба виправити до лонча)

### H1 — App.jsx: error screen hardcoded English "Error:"
**Файл:** `frontend/src/App.jsx:130`  
```jsx
if (error) return <div className="error-screen">Error: {error}</div>;
```
Всі локалі бачать "Error:" на startup failure. Потрібен i18n ключ або хоча б нейтральний символ.

### H2 — TapGame.jsx: streak badge hardcoded `d` (days)
**Файл:** `frontend/src/components/TapGame.jsx:244`  
```jsx
🔥 {streak}d {streakBonus > 0 && <span>+{streakBonus}%</span>}
```
Hardcoded `d` (англійський скорочення дня) — нелокалізовано. Є ключ `time_d` у всіх локалях.

### H3 — abilities_active: дублікат ключа в i18n
**Файл:** `frontend/src/i18n.js:519,627`  
```js
abilities_active: 'Active',    // line ~519 — btn state
// ...600 рядків пізніше...
abilities_active: '✅ ACTIVE', // line ~627 — badge — перезаписує перший!
```
JS об'єкт зберігає останнє значення → обидва використання одного ключа дають `'✅ ACTIVE'`. Перший контекст (кнопка стану) отримує неправильний текст.

### H4 — .env.example не містить BOT_USERNAME
**Файл:** `backend/.env.example`  
`BOT_USERNAME` відсутній у .env.example — новий девелопер не знатиме, що треба встановити цю змінну, і посилання будуть зламані локально.

### H5 — render.yaml відсутні змінні: ADMIN_KEY, PGSSL
**Файл:** `render.yaml`  
`ADMIN_KEY` і `PGSSL` не вказані в envVars сервісу `brainrot-farm-bot`. Без ADMIN_KEY адмін-маршрут доступний з дефолтним значенням; без PGSSL може падати SSL з'єднання з Supabase.

### H6 — Локалі ES/FR/DE/PT/ZH/AR/HI/JA/KO: відсутні нові ключі
**Файл:** `frontend/src/i18n/es.js` та ін.  
Всі 9 зовнішніх мовних файлів не мають нових ключів, доданих за останні тижні (gauntlet, fusion, forge, oracle, championship, neural, constellation, streak calendar, olympics, relics, синергії, артефакти тощо).  
Fallback на EN — прийнятно, але ці мови отримають English UI для більшості нових фіч.

---

## MEDIUM (бажано виправити)

### M1 — t() використовує .replace() замість .replaceAll()
**Файл:** `frontend/src/i18n.js:3565`  
```js
str = str.replace(`{${k}}`, String(v));
```
Якщо одна змінна з'являється двічі в рядку, другий випадок залишиться як `{k}`. Наразі жоден рядок не має дублікатів, але це потенційна пастка.

### M2 — UK: залишкові English слова в кількох рядках
- `tscal_hint`: `'...miss a day — streak resets.'` — частково English
- `gst_contribute_desc`, `gst_contribute_btn`: містять 'Guild XP' — OK як термін бренду
- `neural_locked`, `neural_locked_sub`: використовують 'Ascension' і 'Neural Points'

### M3 — RU: залишкові English слова
- `auction_price_label: 'Цена (gems)'` — 'gems' англійською
- `olympics_empty`: правильно перекладено (вже OK)

### M4 — Leaderboard stats: перевірити чи відображаються реальні дані
Не верифіковано в браузері. TapLeaderboard/Leaderboard можуть показувати порожні дані якщо API недоступне.

### M5 — Interpolation strings: {n} vs явне число
Декілька рядків у UK/RU де `wins_text` або `duel_score` показують сиру змінну якщо не передано значення. Потрібне defensive rendering в компонентах.

---

## LOW (покращення)

### L1 — .env файл з реальними секретами
**Файл:** `backend/.env`  
Містить реальний BOT_TOKEN, DATABASE_URL з паролем. Файл GITIGNORED (перевірено — в git history відсутній). Але бажано ротувати секрети якщо файл коли-небудь передавали.

### L2 — MINI_APP_URL у .env вказує на brainrot-farm.vercel.app
За memory: MINI_APP_URL має бути `https://brainrot-farm-app.onrender.com`. Перевірити відповідність Render dashboard.

### L3 — Кілька терміну "Gauntlet", "Fusion", "Forge" — ці МОЖНА залишити English як назви фіч (аналог "Hearthstone", "Pokémon"). Не критично.

### L4 — render.yaml: TELEGRAM_BOT_TOKEN і BOT_TOKEN обидва вказані — може бути дублікат. Перевірити що bot.js використовує BOT_TOKEN (підтверджено — так).

---

## Зведена таблиця

| # | Тип | Опис | Файл |
|---|-----|------|------|
| B1 | Blocker | EN oracle_waiting — Ukrainian текст | i18n.js:527 |
| B2 | Blocker | BOT_USERNAME відсутній у render.yaml → зламані рефлінки | render.yaml |
| B3 | Blocker | reminders.js — всі notifications English-only | reminders.js |
| B4 | Blocker | UK locale ~15 English/mixed рядків | i18n.js |
| B5 | Blocker | RU locale ~20 English/mixed рядків | i18n.js |
| H1 | High | App.jsx error screen hardcoded "Error:" | App.jsx:130 |
| H2 | High | TapGame streak badge hardcoded `d` | TapGame.jsx:244 |
| H3 | High | abilities_active дублікат ключа | i18n.js:519,627 |
| H4 | High | .env.example відсутній BOT_USERNAME | .env.example |
| H5 | High | render.yaml відсутні ADMIN_KEY, PGSSL | render.yaml |
| H6 | High | 9 зовнішніх локалей без нових ключів | i18n/es,fr,de,... |
| M1 | Medium | t() replace замість replaceAll | i18n.js:3565 |
| M2 | Medium | UK залишкові English слова в hints | i18n.js |
| M3 | Medium | RU auction_price_label: 'gems' | i18n.js |
| L1 | Low | .env реальні секрети на диску (gitignored) | backend/.env |
| L2 | Low | MINI_APP_URL vercel vs render | backend/.env |
