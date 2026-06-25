import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { shadowBanGate } from "../../middleware/antibot.js";
import { hashPostContent, isDuplicatePost } from "../antibot/antibot.service.js";
import { grantReward } from "../rewards/rewards.service.js";
import { adjustReputation } from "../reputation/reputation.service.js";

export const postsRouter = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  imageUrls: z.array(z.string().url()).max(4).default([]),
  linkUrl: z.string().url().optional(),
  gifUrl: z.string().url().optional(),
});

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

function serializePost(post: any, viewerId?: string) {
  return {
    id: post.id,
    content: post.content,
    imageUrls: post.imageUrls,
    linkUrl: post.linkUrl,
    gifUrl: post.gifUrl,
    createdAt: post.createdAt,
    author: post.author,
    likesCount: post._count?.likes ?? 0,
    commentsCount: post._count?.comments ?? 0,
    repostsCount: post._count?.reposts ?? 0,
    likedByMe: viewerId ? post.likes?.some((l: { userId: string }) => l.userId === viewerId) : false,
  };
}

const postAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  rank: true,
} as const;

postsRouter.get(
  "/feed",
  optionalAuth,
  validateQuery(feedQuerySchema),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };

    const posts = await prisma.post.findMany({
      where: { moderation: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: postAuthorSelect },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: req.user ? { where: { userId: req.user.id }, select: { userId: true } } : false,
      },
    });

    res.json({
      data: posts.map((p) => serializePost(p, req.user?.id)),
      nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null,
    });
  })
);

postsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: postAuthorSelect },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: req.user ? { where: { userId: req.user.id }, select: { userId: true } } : false,
      },
    });
    if (!post || post.moderation !== "ACTIVE") {
      throw new HttpError(404, "Post not found", "POST_NOT_FOUND");
    }
    res.json({ data: serializePost(post, req.user?.id) });
  })
);

postsRouter.post(
  "/",
  requireAuth,
  shadowBanGate,
  writeActionRateLimiter,
  validateBody(createPostSchema),
  asyncHandler(async (req, res) => {
    const { content, imageUrls, linkUrl, gifUrl } = req.body;

    if (await isDuplicatePost(req.user!.id, content)) {
      throw new HttpError(409, "Duplicate post detected, please wait before reposting the same text", "DUPLICATE_CONTENT");
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.user!.id,
        content,
        imageUrls,
        linkUrl,
        gifUrl,
        contentHash: hashPostContent(content),
      },
      include: { author: { select: postAuthorSelect } },
    });

    const reward = await grantReward(req.user!.id, "POST_CREATED", post.id);

    res.status(201).json({ data: serializePost({ ...post, _count: { likes: 0, comments: 0, reposts: 0 } }), reward });
  })
);

postsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found", "POST_NOT_FOUND");
    if (post.authorId !== req.user!.id && !req.user!.isAdmin) {
      throw new HttpError(403, "Not allowed to delete this post", "FORBIDDEN");
    }

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ data: { deleted: true } });
  })
);

postsRouter.post(
  "/:id/like",
  requireAuth,
  shadowBanGate,
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found", "POST_NOT_FOUND");

    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId: post.id, userId: req.user!.id } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      res.json({ data: { liked: false } });
      return;
    }

    await prisma.like.create({ data: { postId: post.id, userId: req.user!.id } });

    if (post.authorId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: req.user!.id,
          type: "LIKE",
          postId: post.id,
          message: `@${req.user!.username} liked your post`,
        },
      });
      await adjustReputation(post.authorId, 1, "LIKE_RECEIVED");
    }

    const reward = await grantReward(req.user!.id, "LIKE", post.id);
    res.json({ data: { liked: true }, reward });
  })
);

postsRouter.post(
  "/:id/repost",
  requireAuth,
  shadowBanGate,
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found", "POST_NOT_FOUND");

    const existing = await prisma.repost.findUnique({
      where: { postId_userId: { postId: post.id, userId: req.user!.id } },
    });
    if (existing) {
      throw new HttpError(409, "Already reposted", "ALREADY_REPOSTED");
    }

    await prisma.$transaction([
      prisma.repost.create({ data: { postId: post.id, userId: req.user!.id } }),
      prisma.post.create({
        data: {
          authorId: req.user!.id,
          content: post.content,
          imageUrls: post.imageUrls,
          linkUrl: post.linkUrl,
          gifUrl: post.gifUrl,
          contentHash: post.contentHash,
          isRepostOf: post.id,
        },
      }),
    ]);

    if (post.authorId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: req.user!.id,
          type: "REPOST",
          postId: post.id,
          message: `@${req.user!.username} reposted your post`,
        },
      });
    }

    const reward = await grantReward(req.user!.id, "REPOST", post.id);
    res.status(201).json({ data: { reposted: true }, reward });
  })
);
