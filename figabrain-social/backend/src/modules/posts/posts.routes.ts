import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { shadowBanGate } from "../../middleware/antibot.js";
import { hashPostContent, isDuplicatePost } from "../antibot/antibot.service.js";
import { grantReward } from "../rewards/rewards.service.js";
import { adjustReputation } from "../reputation/reputation.service.js";

async function createMentionNotifications(content: string, actorId: string, postId: string) {
  const handles = [...new Set((content.match(/@([a-zA-Z0-9_]{1,32})/g) ?? []).map((h) => h.slice(1).toLowerCase()))];
  if (!handles.length) return;
  const mentioned = await prisma.user.findMany({
    where: { username: { in: handles, mode: "insensitive" }, id: { not: actorId }, isBanned: false },
    select: { id: true },
  });
  if (!mentioned.length) return;
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { username: true } });
  await prisma.notification.createMany({
    data: mentioned.map((u) => ({
      recipientId: u.id,
      actorId,
      type: "MENTION" as const,
      postId,
      message: `@${actor?.username ?? "someone"} mentioned you in a post`,
    })),
    skipDuplicates: true,
  });
}

export const postsRouter = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  imageUrls: z.array(z.string().url()).max(4).default([]),
  linkUrl: z.string().url().optional(),
  gifUrl: z.string().url().optional(),
});

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const updatePostSchema = z.object({
  content: z.string().min(1).max(2000),
});

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  filter: z.enum(["all", "following"]).default("all"),
});

const postAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  rank: true,
} as const;

const postInclude = {
  author: { select: postAuthorSelect },
  _count: { select: { likes: true, comments: true, reposts: true } },
  likes: { select: { userId: true } },
} as const;

// likes is omitted from the base type so the conditional include (false for
// anonymous requests) doesn't cause a TypeScript mismatch.
type RawPost = Omit<Prisma.PostGetPayload<{ include: typeof postInclude }>, "likes"> & {
  likes?: { userId: string }[];
};

function serializePost(post: RawPost, viewerId?: string) {
  return {
    id: post.id,
    content: post.content,
    imageUrls: post.imageUrls,
    linkUrl: post.linkUrl,
    gifUrl: post.gifUrl,
    createdAt: post.createdAt,
    author: post.author,
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    repostsCount: post._count.reposts,
    likedByMe: viewerId ? (post.likes?.some((l) => l.userId === viewerId) ?? false) : false,
  };
}

postsRouter.get(
  "/feed",
  optionalAuth,
  validateQuery(feedQuerySchema),
  asyncHandler(async (req, res) => {
    const { cursor, limit, filter } = req.query as unknown as { cursor?: string; limit: number; filter: "all" | "following" };

    let authorIdIn: string[] | undefined;
    if (filter === "following" && req.user) {
      const follows = await prisma.follow.findMany({ where: { followerId: req.user.id }, select: { followingId: true } });
      authorIdIn = follows.map((f) => f.followingId);
      if (authorIdIn.length === 0) { res.json({ data: [], nextCursor: null }); return; }
    }

    const posts = (await prisma.post.findMany({
      where: { moderation: "ACTIVE", ...(authorIdIn ? { authorId: { in: authorIdIn } } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        ...postInclude,
        likes: req.user ? { where: { userId: req.user.id }, select: { userId: true } } : false,
      },
    })) as RawPost[];

    res.json({
      data: posts.map((p) => serializePost(p, req.user?.id)),
      nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null,
    });
  })
);

// Search and patch must come before /:id to avoid "search" being captured as an id.
postsRouter.get(
  "/search",
  optionalAuth,
  validateQuery(searchQuerySchema),
  asyncHandler(async (req, res) => {
    const { q, cursor, limit } = req.query as unknown as { q: string; cursor?: string; limit: number };
    const posts = (await prisma.post.findMany({
      where: {
        moderation: "ACTIVE",
        content: { contains: q, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        ...postInclude,
        likes: req.user ? { where: { userId: req.user.id }, select: { userId: true } } : false,
      },
    })) as RawPost[];
    res.json({
      data: posts.map((p) => serializePost(p, req.user?.id)),
      nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null,
    });
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
    createMentionNotifications(content, req.user!.id, post.id).catch(() => {});

    res.status(201).json({ data: serializePost({ ...post, _count: { likes: 0, comments: 0, reposts: 0 } }), reward });
  })
);

postsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = (await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        ...postInclude,
        likes: req.user ? { where: { userId: req.user.id }, select: { userId: true } } : false,
      },
    })) as RawPost | null;
    if (!post || post.moderation !== "ACTIVE") {
      throw new HttpError(404, "Post not found", "POST_NOT_FOUND");
    }
    res.json({ data: serializePost(post, req.user?.id) });
  })
);

postsRouter.patch(
  "/:id",
  requireAuth,
  shadowBanGate,
  writeActionRateLimiter,
  validateBody(updatePostSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found", "POST_NOT_FOUND");
    if (post.authorId !== req.user!.id) throw new HttpError(403, "Not allowed to edit this post", "FORBIDDEN");
    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: { content: req.body.content, contentHash: hashPostContent(req.body.content) },
      include: { ...postInclude, likes: { where: { userId: req.user!.id }, select: { userId: true } } },
    });
    res.json({ data: serializePost(updated as RawPost, req.user!.id) });
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

const reportPostSchema = z.object({
  reason: z.string().min(1).max(500),
});

postsRouter.post(
  "/:id/report",
  requireAuth,
  writeActionRateLimiter,
  validateBody(reportPostSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found", "POST_NOT_FOUND");
    if (post.authorId === req.user!.id) throw new HttpError(400, "Cannot report your own post", "INVALID_OPERATION");

    const existing = await prisma.report.findFirst({
      where: { filerId: req.user!.id, targetType: "POST", targetId: post.id },
    });
    if (existing) throw new HttpError(409, "Already reported", "ALREADY_REPORTED");

    await prisma.report.create({
      data: { filerId: req.user!.id, targetType: "POST", targetId: post.id, reason: req.body.reason },
    });

    res.json({ data: { reported: true } });
  })
);
