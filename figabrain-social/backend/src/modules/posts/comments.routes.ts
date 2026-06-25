import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { shadowBanGate } from "../../middleware/antibot.js";
import { grantReward } from "../rewards/rewards.service.js";
import { adjustReputation } from "../reputation/reputation.service.js";

export const commentsRouter = Router({ mergeParams: true });

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

commentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id, moderation: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { username: true, displayName: true, avatarUrl: true, rank: true } } },
      take: 100,
    });
    res.json({ data: comments });
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
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: req.user!.id,
          type: "COMMENT",
          postId: post.id,
          message: `@${req.user!.username} commented on your post`,
        },
      });
      await adjustReputation(post.authorId, 1, "COMMENT_RECEIVED");
    }

    const reward = await grantReward(req.user!.id, "COMMENT", comment.id);
    res.status(201).json({ data: comment, reward });
  })
);
