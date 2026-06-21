# Brainrot Farm — Telegram Mini App MVP

Meme-farming Telegram Mini App: фарм поінтів, daily reward зі стріками, реферальна система, leaderboard. Готовий MVP-фундамент під майбутній мемкоїн.

## Структура проєкту

```
brainrot-farm/
  backend/
    server.js          — Express app, реєстрація роутів
    db.js               — SQLite (better-sqlite3) підключення + автозастосування schema.sql
    schema.sql          — таблиці users, referrals
    telegramAuth.js     — перевірка Telegram WebApp initData (HMAC)
    gameConfig.js       — баланс гри: кулдауни, нагороди, рівні
    bot.js              — bot-сервер (grammY): /start + кнопка відкриття Mini App
    routes/
      register.js       — POST /register
      farm.js            — POST /farm
      daily.js            — POST /daily
      leaderboard.js     — GET /leaderboard
      referral.js         — GET /referral
  frontend/
    src/
      App.jsx            — головний екран
      api.js              — клієнт до backend API
      telegram.js          — обгортка над window.Telegram.WebApp
      components/
        Balance.jsx
        FarmButton.jsx
        DailyReward.jsx
        Referral.jsx
        Leaderboard.jsx
```

## Game design

- Валюта: **Brainrot Points**
- Рівні: **NPC → Sigma (1000 pts) → Gigachad (10000 pts)**
- Дія фарму: **"Farm Braincells"**, кулдаун 5 хв, нагорода 10–30 pts
- Daily reward: база 50 pts + стрік-бонус (+10 pts/день, максимум +200), стрік рветься якщо пропустив >48 год
- Реферали: +100 pts реферреру за реєстрацію друга, +200 pts коли друг вперше зафармив (підтверджена активність)

## Запуск Backend

```bash
cd backend
npm install
cp .env.example .env
# відкрий .env і встав BOT_TOKEN свого бота (з @BotFather)
npm start
```

Backend піднімається на `http://localhost:4000`. SQLite-файл `brainrot.db` створюється автоматично при першому запуску.

Для локальної розробки без реального Telegram-клієнта виставте в `.env`:
```
SKIP_TELEGRAM_AUTH=true
```
Тоді можна тестувати ендпоінти через curl/Postman, передаючи `telegram_id` у тілі запиту.

## Запуск Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite піднімається на `http://localhost:5173`. Для продакшн-білда:

```bash
npm run build
```

Опціонально створи `frontend/.env`:
```
VITE_API_BASE=http://localhost:4000
VITE_BOT_USERNAME=YourBotUsername
```

## Підключення Telegram бота

1. Створи бота через [@BotFather](https://t.me/BotFather): `/newbot`
2. Збережи `BOT_TOKEN` у `backend/.env`
3. Задеплой фронтенд на HTTPS (для тестів — `ngrok http 5173`) і вкажи цей URL у `backend/.env` як `MINI_APP_URL`
4. Запусти bot-сервер:
   ```bash
   cd backend
   npm install
   npm run bot
   ```
   Це окремий процес (long polling), що відповідає на `/start` повідомленням з кнопкою **"Open Brainrot Farm"**, яка відкриває Mini App.
5. (Опційно, додатково до бота) У BotFather через `/mybots → Bot Settings → Menu Button → Configure Menu Button` можна так само прив'язати той самий `MINI_APP_URL` до постійної кнопки меню чату.

`server.js` (API) і `bot.js` (Telegram-бот) — два незалежні процеси, обидва запускаються окремо і обидва читають той самий `backend/.env`.

### Реферальні посилання
Основний формат (рекомендований): `https://t.me/<BotUsername>?startapp=<referral_code>` — Telegram передає код у `initDataUnsafe.start_param`, фронтенд (`App.jsx`) читає його автоматично.

Резервний формат: класичний deep link `https://t.me/<BotUsername>?start=<referral_code>` — бот (`bot.js`) приймає такий `/start <code>` і відкриває Mini App з `?ref=<code>` у URL; фронтенд (`telegram.js`) підхоплює це як fallback, якщо `start_param` відсутній.

## API Endpoints

| Метод | Шлях            | Auth      | Опис |
|-------|-----------------|-----------|------|
| POST  | /register       | Telegram  | Реєстрація користувача, опційно `{ ref: "<code>" }` |
| POST  | /farm            | Telegram  | Фарм поінтів з server-side кулдауном |
| POST  | /daily           | Telegram  | Daily reward зі стріком |
| GET   | /leaderboard      | публічний | Топ-50 по coins |
| GET   | /referral          | Telegram  | Реферальний код + список друзів |

Auth-заголовок: `x-telegram-init-data: <raw initData from Telegram WebApp>`

---

## HOW TO SCALE TO TOKEN

**1. Pump.fun / TON інтеграція**
- Pump.fun (Solana): задеплой SPL-токен через Pump.fun bonding curve UI, отримай contract address (CA)
- TON: створи Jetton через `@ton-community/contracts` або TON Minter, задеплой у TON mainnet
- У backend додай таблицю `token_balances` або поле `on_chain_address` (wallet) до `users`, та сервіс інтеграції з RPC (web3.js для Solana, `ton` SDK для TON) для читання балансів і запуску трансферів

**2. Airdrop користувачам**
- Експортуй snapshot з таблиці `users`: `SELECT telegram_id, coins FROM users` — це і є точки розподілу
- Конвертуй `coins` у токени за фіксованим коефіцієнтом (наприклад 1000 brainrot points = 1 токен)
- Користувач прив'язує гаманець (TON Connect для TON, Phantom/Solflare deep link для Solana) — додай поле `wallet_address` в `users` і ендпоінт `POST /wallet/connect`
- Запусти batch-транзакцію (Solana: `@solana/spl-token` `transferChecked` у циклі або через Merkle-airdrop контракт; TON: масові Jetton-трансфери через `highload-wallet`)

**3. Прив'язка токена до балансу в грі**
- Тримай ігровий баланс (`coins`) і on-chain баланс окремо до запуску токена — це дозволяє коригувати економіку без ризику для реальних активів
- Після launch токена: додай ендпоінт `POST /claim` який списує `coins` (з лімітом на період, анти-фрод) і ставить транзакцію в черзку (`pending_claims` таблиця) для воркера, що виконує on-chain transfer
- Воркер (окремий Node-процес або cron): бере з `pending_claims` записи зі статусом `pending`, виконує transfer, оновлює статус на `completed`/`failed`, ретраїть при помилках RPC
