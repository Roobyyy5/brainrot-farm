import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const connectionLimit = env.NODE_ENV === "production" ? 10 : 5;

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  datasources: {
    db: {
      url: `${env.DATABASE_URL}${env.DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=${connectionLimit}&pool_timeout=20`,
    },
  },
});
