import type { MissionAction, MissionPeriod } from "@prisma/client";
import type { RewardAction } from "../../config/rewardConfig.js";

/** Maps a Brain Points reward action to the mission-progress bucket it counts toward. */
export const MISSION_ACTION_BY_REWARD_ACTION: Partial<Record<RewardAction, MissionAction>> = {
  LIKE: "LIKE",
  COMMENT: "COMMENT",
  REPOST: "REPOST",
  POST_CREATED: "POST",
  REFERRAL: "REFERRAL",
  DAILY_LOGIN: "LOGIN",
};

export interface MissionSeed {
  key: string;
  period: MissionPeriod;
  action: MissionAction;
  title: string;
  description: string;
  targetCount: number;
  xpReward: number;
  pointsReward: number;
}

/** Seed catalog for `npm run prisma:seed`. New missions can be added via the admin API at runtime. */
export const MISSION_CATALOG: MissionSeed[] = [
  { key: "daily_like_5", period: "DAILY", action: "LIKE", title: "Лайкни 5 постів", description: "Постав 5 лайків іншим користувачам", targetCount: 5, xpReward: 10, pointsReward: 3 },
  { key: "daily_comment_3", period: "DAILY", action: "COMMENT", title: "Напиши 3 коментарі", description: "Залиш 3 коментарі під будь-якими постами", targetCount: 3, xpReward: 15, pointsReward: 5 },
  { key: "daily_post_1", period: "DAILY", action: "POST", title: "Створи 1 пост", description: "Опублікуй хоча б один пост", targetCount: 1, xpReward: 10, pointsReward: 4 },
  { key: "daily_login", period: "DAILY", action: "LOGIN", title: "Зайди щодня", description: "Відвідай FIGABRAIN сьогодні", targetCount: 1, xpReward: 5, pointsReward: 2 },
  { key: "weekly_comment_50", period: "WEEKLY", action: "COMMENT", title: "50 коментарів за тиждень", description: "Будь активним учасником дискусій", targetCount: 50, xpReward: 150, pointsReward: 60 },
  { key: "weekly_post_20", period: "WEEKLY", action: "POST", title: "20 постів за тиждень", description: "Публікуй контент щодня", targetCount: 20, xpReward: 200, pointsReward: 80 },
  { key: "weekly_referral_10", period: "WEEKLY", action: "REFERRAL", title: "Запроси 10 друзів", description: "Розбудовуй спільноту FIGABRAIN", targetCount: 10, xpReward: 400, pointsReward: 200 },
  { key: "daily_tap_500", period: "DAILY", action: "TAP", title: "500 тапів за день", description: "Тапай мозок і заробляй Brain Points", targetCount: 500, xpReward: 20, pointsReward: 10 },
  { key: "weekly_tap_5000", period: "WEEKLY", action: "TAP", title: "5000 тапів за тиждень", description: "Будь найактивнішим тапером тижня", targetCount: 5000, xpReward: 200, pointsReward: 100 },
];

export function periodKeyFor(period: MissionPeriod, date: Date = new Date()): string {
  if (period === "DAILY") {
    return date.toISOString().slice(0, 10);
  }
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(utc.getUTCFullYear(), 0, 4));
  const weekNumber = 1 + Math.round(((utc.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
