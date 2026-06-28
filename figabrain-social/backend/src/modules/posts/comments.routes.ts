import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { shadowBanGate } from "../../middleware/antibot.js";
import { grantReward } from "../rewards/rewards.service.js";
import { adjustReputation } from "../reputation/reputation.service.js";
import { createNotification } from "../../utils/createNotification.js";

async function createMentionNotifications(content: string, actorId: string, postId: string) {
  const handles = [...new Set((content.match(/@([a-zA-Z0-9_]{1,32})/g) ?? []).map((h) => h.slice(1).toLowerCase()))];
  if (!handles.length) return;
  const mentioned = await prisma.user.findMany({
    where: { username: { in: handles, mode: "insensitive" }, id: { not: actorId }, isBanned: false },
    select: { id: true },
  });
  if (!mentioned.length) return;
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { username: true } });
  await Promise.all(
    mentioned.map((u) =>
      createNotification({
        recipient: { connect: { id: u.id } },
        actor: { connect: { id: actorId } },
        type: "MENTION",
        post: { connect: { id: postId } },
        message: `@${actor?.username ?? "someone"} mentioned you in a comment`,
      }).catch(() => {})
    )
  );
}

export const commentsRouter = Router({ mergeParams: true });

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const commentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

commentsRouter.get(
  "/",
  validateQuery(commentsQuerySchema),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id, moderation: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { username: true, displayName: true, avatarUrl: true, rank: true } } },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    res.json({
      data: comments,
      nextCursor: comments.length === limit ? comments[comments.length - 1]?.id : null,
    });
  })
);

commentsRouter.post(
  "/",
  requireAuth,
  shadowBanGate,
  writeActionRateLimiter,
  validateBody(createCommentSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found", "POST_NOT_FOUND");

    const comment = await prisma.comment.create({
      data: { postId: post.id, authorId: req.user!.id, content: req.body.content },
      include: { author: { select: { username: true, displayName: true, avatarUrl: true, rank: true } } },
    });

    if (post.authorId !== req.user!.id) {
      await createNotification({
        recipient: { connect: { id: post.authorId } },
        actor: { connect: { id: req.user!.id } },
        type: "COMMENT",
        post: { connect: { id: post.id } },
        message: `@${req.user!.username} commented on your post`,
      });
      await adjustReputation(post.authorId, 1, "COMMENT_RECEIVED");
    }

    const reward = await grantReward(req.user!.id, "COMMENT", comment.id);
    createMentionNotifications(req.body.content, req.user!.id, post.id).catch(() => {});
    res.status(201).json({ data: comment, reward });
  })
);
