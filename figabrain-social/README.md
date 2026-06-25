# FIGABRAIN Social

Web3-native social network MVP, added inside `brainrot-farm/figabrain-social/`. Every account is a social profile **and** an internal crypto wallet. Engagement (likes, comments, reposts, daily login, referrals) earns **Brain Points** — an off-chain points system whose engine and database schema are architected for a future real token, airdrops, staking, and NFTs.

This module is independent from the existing `brainrot-farm` Telegram farming bot (`/backend`, `/frontend` at the repo root) — separate stack, separate `package.json`, separate deploy. Nothing in the original bot was modified.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, Telegram Login Widget
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router
- **Wallet**: ed25519 keypairs (TON/Solana-compatible), AES-256-GCM encryption at rest
- **Docs**: OpenAPI 3 served at `/docs` on the backend

## Local development

```bash
cp backend/.env.example backend/.env      # fill in real secrets
cp frontend/.env.example frontend/.env

docker compose up -d postgres
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev          # http://localhost:4100, docs at /docs

cd ../frontend
npm install
npm run dev           # http://localhost:5174
```

## Environment variables (backend)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥32 char secrets for access/refresh tokens |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes (e.g. `15m`, `30d`) |
| `TELEGRAM_BOT_TOKEN` | Bot token used to verify the Telegram Login Widget signature |
| `WALLET_ENCRYPTION_KEY` | 32-byte hex key (`openssl rand -hex 32`) encrypting wallet private keys at rest |
| `CORS_ORIGIN` | Allowed frontend origin |

## Security model

- Telegram Login Widget payloads are verified with HMAC-SHA256 against the bot token, per Telegram's spec, with a 24h freshness window.
- Wallet private keys are generated server-side and stored only as AES-256-GCM ciphertext (`encryptedPrivateKey` + `iv` + `authTag`); the API never returns them.
- Access tokens are short-lived JWTs; refresh tokens live in an `httpOnly`, `sameSite=strict` cookie.
- CSRF double-submit cookie middleware (`src/middleware/security.ts`) guards state-changing requests issued from cookie-based sessions.
- Anti-bot layer: per-route rate limiting, action cooldowns + daily reward caps (`RewardConfig`), duplicate-content hashing, device-fingerprint multi-account detection, and a shadow-ban system that returns `200 OK` without persisting the action.
- All admin actions and sensitive user-state changes write to `AuditLog`.

## Web3 readiness

`src/modules/web3/` contains real off-chain bookkeeping (`TokenEngine`, `AirdropEngine`, `StakingEngine`, `NftEngine`) plus a `ChainProvider` interface. No real blockchain transactions are performed yet — plugging in a `TonChainProvider` / `SolanaChainProvider` implementation is the only change needed to go live, since wallets are already ed25519 keypairs compatible with both chains.

## Backup strategy

- PostgreSQL: nightly `pg_dump` to encrypted object storage, retained 30 days; point-in-time recovery via WAL archiving in production (configure `archive_mode`/`archive_command` on the managed Postgres instance).
- Wallet encryption key (`WALLET_ENCRYPTION_KEY`) must be backed up independently of the database, in a secrets manager — losing it makes all wallet private keys unrecoverable.
- Run `npx prisma migrate deploy` (never `migrate dev`) against production.

## CI/CD

`.github/workflows/figabrain-social-ci.yml` (repo root) runs on changes under `figabrain-social/`: spins up Postgres, installs deps, type-checks, runs `prisma migrate deploy`, and builds both backend and frontend.
