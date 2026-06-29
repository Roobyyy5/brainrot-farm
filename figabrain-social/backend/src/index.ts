import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { env } from "./lib/env.js";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import { requireNotBanned } from "./middleware/antibot.js";
import * as redis from "./lib/redis.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { postsRouter } from "./modules/posts/posts.routes.js";
import { commentsRouter } from "./modules/posts/comments.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { messagesRouter } from "./modules/messages/messages.routes.js";
import { walletRouter } from "./modules/wallet/wallet.routes.js";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.routes.js";
import { rewardsRouter } from "./modules/rewards/rewards.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { web3Router } from "./modules/web3/web3.routes.js";
import { missionsRouter } from "./modules/missions/missions.routes.js";
import { achievementsRouter } from "./modules/achievements/achievements.routes.js";
import { boostersRouter } from "./modules/boosters/boosters.routes.js";
import { lootboxesRouter } from "./modules/lootboxes/lootboxes.routes.js";
import { streaksRouter } from "./modules/streaks/streaks.routes.js";
import { reputationRouter } from "./modules/reputation/reputation.routes.js";
import { seasonsRouter } from "./modules/seasons/seasons.routes.js";
import { tokenConversionRouter } from "./modules/web3/tokenConversion.routes.js";
import { i18nRouter } from "./modules/i18n/i18n.routes.js";
import { bpPurchaseRouter } from "./modules/web3/bpPurchase.routes.js";
import { tokenomicsRouter } from "./modules/web3/tokenomics.routes.js";
import { telegramWebhookRouter } from "./modules/telegram/telegram.webhook.routes.js";
import { setWebhook } from "./modules/telegram/telegram.service.js";
import { storiesRouter } from "./modules/stories/stories.routes.js";
import { governanceRouter } from "./modules/governance/governance.routes.js";
import { supportRouter } from "./modules/support/support.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Trust Render's reverse proxy so req.ip reflects the real client IP
app.set("trust proxy", 1);

app.use(helmet());
const allowedOrigins = new Set(
  env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin) || origin.endsWith(".onrender.com")) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(globalRateLimiter);
app.use(requireNotBanned);

app.get("/health", async (_req, res) => {
  const checks: Record<string, boolean> = { db: false, redis: false };

  try {
    await prisma.$executeRaw`SELECT 1`;
    checks.db = true;
  } catch { /* db unreachable */ }

  try {
    await redis.setex("health:ping", 5, "1");
    checks.redis = true;
  } catch { /* redis unreachable */ }

  // DB is required; Redis is fail-open so we only degrade on DB failure.
  const ok = checks.db;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    service: "figabrain-social-backend",
    checks,
    time: new Date().toISOString(),
  });
});

try {
  const openapiDocument = YAML.load(path.join(__dirname, "../src/docs/openapi.yaml"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
} catch {
  // OpenAPI spec is optional at runtime; the API still works without /docs.
}

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/posts", postsRouter);
app.use("/api/posts/:id/comments", commentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/rewards", rewardsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/web3", web3Router);
app.use("/api/missions", missionsRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/boosters", boostersRouter);
app.use("/api/lootboxes", lootboxesRouter);
app.use("/api/streaks", streaksRouter);
app.use("/api/reputation", reputationRouter);
app.use("/api/seasons", seasonsRouter);
app.use("/api/token-conversion", tokenConversionRouter);
app.use("/api/i18n", i18nRouter);
app.use("/api/bp-purchase", bpPurchaseRouter);
app.use("/api/tokenomics", tokenomicsRouter);
app.use("/api/stories", storiesRouter);
app.use("/api/governance", governanceRouter);
app.use("/api/support", supportRouter);

// Telegram webhook — no auth/rate-limit middleware (verified by secret header)
app.use("/webhook/telegram", telegramWebhookRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`FIGABRAIN Social backend listening on port ${env.PORT}`);
  if (env.APP_URL && env.TELEGRAM_WEBHOOK_SECRET) {
    setWebhook(`${env.APP_URL}/webhook/telegram`, env.TELEGRAM_WEBHOOK_SECRET).catch(console.error);
  }
});
