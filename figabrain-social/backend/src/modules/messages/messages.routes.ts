import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";

export const messagesRouter = Router();

const sendMessageSchema = z.object({
  recipientUsername: z.string().min(1),
  content: z.string().min(1).max(2000),
});

messagesRouter.get(
  "/conversations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId: req.user!.id },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: { username: true, displayName: true, avatarUrl: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    res.json({
      data: conversations.map((cp) => ({
        id: cp.conversation.id,
        participants: cp.conversation.participants.map((p) => p.user),
        lastMessage: cp.conversation.messages[0] ?? null,
      })),
    });
  })
);

messagesRouter.get(
  "/conversations/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.id } },
    });
    if (!participant) throw new HttpError(403, "Not a participant of this conversation", "FORBIDDEN");

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    res.json({ data: messages });
  })
);

messagesRouter.post(
  "/send",
  requireAuth,
  writeActionRateLimiter,
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const recipient = await prisma.user.findUnique({ where: { username: req.body.recipientUsername } });
    if (!recipient) throw new HttpError(404, "Recipient not found", "USER_NOT_FOUND");
    if (recipient.id === req.user!.id) throw new HttpError(400, "Cannot message yourself", "INVALID_OPERATION");

    // Serializable isolation prevents a race where two simultaneous requests
    // both see no conversation and each create one, producing duplicates.
    const conversation = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.conversation.findFirst({
          where: {
            participants: { some: { userId: req.user!.id } },
            AND: { participants: { some: { userId: recipient.id } } },
          },
        });
        if (existing) return existing;
        return tx.conversation.create({
          data: {
            participants: {
              create: [{ userId: req.user!.id }, { userId: recipient.id }],
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    const message = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: req.user!.id, content: req.body.content },
    });

    res.status(201).json({ data: message });
  })
);
