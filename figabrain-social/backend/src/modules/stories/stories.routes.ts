import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";

export const storiesRouter = Router();

const createStorySchema = z.object({
  content: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
});

storiesRouter.post(
  "/",
  requireAuth,
  writeActionRateLimiter,
  validateBody(createStorySchema),
  asyncHandler(async (req, res) => {
    const { content, imageUrl } = req.body as z.infer<typeof createStorySchema>;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: { authorId: req.user!.id, content, imageUrl, expiresAt },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    res.status(201).json({ data: story });
  })
);

storiesRouter.get(
  "/feed",
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();

    // Get stories from people the user follows + own stories
    const follows = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      select: { followingId: true },
    });
    const followingIds = follows.map((f) => f.followingId);

    const stories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        authorId: { in: [...followingIds, req.user!.id] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        views: { where: { userId: req.user!.id }, select: { userId: true } },
      },
    });

    const data = stories.map((s) => ({
      id: s.id,
      content: s.content,
      imageUrl: s.imageUrl,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      author: s.author,
      viewedByMe: s.views.length > 0,
      viewsCount: undefined,
    }));

    res.json({ data });
  })
);

storiesRouter.post(
  "/:id/view",
  requireAuth,
  asyncHandler(async (req, res) => {
    const story = await prisma.story.findUnique({ where: { id: req.params.id } });
    if (!story || story.expiresAt < new Date()) {
      throw new HttpError(404, "Story not found or expired", "STORY_NOT_FOUND");
    }

    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId: story.id, userId: req.user!.id } },
      create: { storyId: story.id, userId: req.user!.id },
      update: {},
    });

    res.json({ data: { viewed: true } });
  })
);

storiesRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const story = await prisma.story.findUnique({ where: { id: req.params.id } });
    if (!story) throw new HttpError(404, "Story not found", "STORY_NOT_FOUND");
    if (story.authorId !== req.user!.id) throw new HttpError(403, "Forbidden", "FORBIDDEN");

    await prisma.story.delete({ where: { id: req.params.id } });
    res.json({ data: { deleted: true } });
  })
);
