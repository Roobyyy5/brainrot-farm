import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { createNotification } from "../../utils/createNotification.js";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { computeRank, nextLevelTier } from "./rank.js";

export const usersRouter = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  language: z.string().min(2).max(10).optional(),
});

const followListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const searchQuerySchema = z.object({
  q: z.string().min(1).max(50),
});

// GET /users/me/referral — must be before /:username
usersRouter.get(
  "/me/referral",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { username: true, _count: { select: { referrals: true } } },
    });
    // Referral link uses Telegram bot deep link: t.me/botname?start=ref_USERNAME
    const { env } = await import("../../lib/env.js");
    const botUsername = env.TELEGRAM_BOT_USERNAME;
    res.json({
      data: {
        referralLink: `https://t.me/${botUsername}?start=ref_${user?.username}`,
        referralCount: user?._count.referrals ?? 0,
      },
    });
  })
);

// GET /users/search must be defined before GET /users/:username to avoid
// "search" being interpreted as a username.
usersRouter.get(
  "/search",
  validateQuery(searchQuerySchema),
  asyncHandler(async (req, res) => {
    const { q } = req.query as { q: string };
    const results = await prisma.user.findMany({
      where: {
        isBanned: false,
        isShadowBanned: false,
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { username: true, displayName: true, avatarUrl: true, rank: true },
    });
    res.json({ data: results });
  })
);

usersRouter.get(
  "/:username",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        language: true,
        rank: true,
        brainPoints: true,
        xp: true,
        reputation: true,
        loginStreak: true,
        longestStreak: true,
        createdAt: true,
        _count: { select: { posts: true, followers: true, following: true } },
        wallet: { select: { address: true, tokenBalance: true } },
        // Single query for follow status instead of a second round-trip.
        followers: req.user
          ? { where: { followerId: req.user.id }, select: { followerId: true }, take: 1 }
          : false,
      },
    });

    if (!user) {
      throw new HttpError(404, "User not found", "USER_NOT_FOUND");
    }

    const isFollowedByMe = Array.isArray(user.followers) && user.followers.length > 0;

    res.json({
      data: {
        ...user,
        brainPoints: Number(user.brainPoints),
        nextLevelTier: nextLevelTier(user.xp),
        walletBalance: Number(user.wallet?.tokenBalance ?? 0),
        walletAddress: user.wallet?.address ?? null,
        postsCount: user._count.posts,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        isFollowedByMe,
      },
    });
  })
);

usersRouter.patch(
  "/me",
  requireAuth,
  writeActionRateLimiter,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
    });
    res.json({ data: { ...updated, brainPoints: Number(updated.brainPoints) } });
  })
);

usersRouter.post(
  "/:username/follow",
  requireAuth,
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
    if (target.id === req.user!.id) throw new HttpError(400, "Cannot follow yourself", "INVALID_OPERATION");

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.user!.id, followingId: target.id } },
      create: { followerId: req.user!.id, followingId: target.id },
      update: {},
    });

    await createNotification({
      recipient: { connect: { id: target.id } },
      actor: { connect: { id: req.user!.id } },
      type: "FOLLOW",
      message: `@${req.user!.username} started following you`,
    });

    res.json({ data: { following: true } });
  })
);

usersRouter.delete(
  "/:username/follow",
  requireAuth,
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

    await prisma.follow.deleteMany({
      where: { followerId: req.user!.id, followingId: target.id },
    });

    res.json({ data: { following: false } });
  })
);

usersRouter.get(
  "/:username/followers",
  validateQuery(followListQuerySchema),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

    const follows = await prisma.follow.findMany({
      where: { followingId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { follower: { select: { username: true, displayName: true, avatarUrl: true, rank: true } } },
    });

    res.json({
      data: follows.map((f) => f.follower),
      nextCursor: follows.length === limit ? follows[follows.length - 1]?.id : null,
    });
  })
);

usersRouter.get(
  "/:username/following",
  validateQuery(followListQuerySchema),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

    const follows = await prisma.follow.findMany({
      where: { followerId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { following: { select: { username: true, displayName: true, avatarUrl: true, rank: true } } },
    });

    res.json({
      data: follows.map((f) => f.following),
      nextCursor: follows.length === limit ? follows[follows.length - 1]?.id : null,
    });
  })
);

const userPostsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

usersRouter.get(
  "/:username/posts",
  optionalAuth,
  validateQuery(userPostsQuerySchema),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

    const posts = await prisma.post.findMany({
      where: { authorId: user.id, moderation: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: req.user ? { where: { userId: req.user.id }, select: { userId: true } } : false,
      },
    });

    res.json({
      data: posts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrls: p.imageUrls,
        linkUrl: p.linkUrl,
        gifUrl: p.gifUrl,
        createdAt: p.createdAt,
        author: p.author,
        likesCount: p._count.likes,
        commentsCount: p._count.comments,
        repostsCount: p._count.reposts,
        likedByMe: req.user ? ((p as { likes?: { userId: string }[] }).likes?.some((l) => l.userId === req.user!.id) ?? false) : false,
      })),
      nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null,
    });
  })
);

export { computeRank };
