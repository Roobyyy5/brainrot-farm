import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";

export const governanceRouter = Router();

const createProposalSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  endsAt: z.string().datetime(),
});

const voteSchema = z.object({ choice: z.enum(["YES", "NO", "ABSTAIN"]) });

governanceRouter.get(
  "/proposals",
  asyncHandler(async (_req, res) => {
    const proposals = await prisma.governanceProposal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        _count: { select: { votes: true } },
      },
    });
    res.json({ data: proposals });
  })
);

governanceRouter.get(
  "/proposals/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const proposal = await prisma.governanceProposal.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        votes: { select: { choice: true, votingPower: true } },
      },
    });
    if (!proposal) throw new HttpError(404, "Proposal not found", "NOT_FOUND");

    const myVote = await prisma.governanceVote.findUnique({
      where: { proposalId_userId: { proposalId: proposal.id, userId: req.user!.id } },
    });

    const tally: Record<string, number> = {};
    for (const v of proposal.votes) {
      tally[v.choice] = (tally[v.choice] ?? 0) + Number(v.votingPower);
    }

    res.json({ data: { ...proposal, tally, myVote: myVote?.choice ?? null } });
  })
);

governanceRouter.post(
  "/proposals",
  requireAuth,
  requireAdmin,
  validateBody(createProposalSchema),
  asyncHandler(async (req, res) => {
    const { title, description, endsAt } = req.body as z.infer<typeof createProposalSchema>;
    const proposal = await prisma.governanceProposal.create({
      data: { title, description, endsAt: new Date(endsAt), authorId: req.user!.id },
      include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
    });
    res.status(201).json({ data: proposal });
  })
);

governanceRouter.post(
  "/proposals/:id/vote",
  requireAuth,
  validateBody(voteSchema),
  asyncHandler(async (req, res) => {
    const proposal = await prisma.governanceProposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new HttpError(404, "Proposal not found", "NOT_FOUND");
    if (proposal.status !== "ACTIVE" || proposal.endsAt < new Date()) {
      throw new HttpError(400, "Voting period has ended", "VOTING_CLOSED");
    }

    // Voting power = user's brainPoints (capped at 1000)
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { brainPoints: true } });
    const votingPower = Math.min(Number(user?.brainPoints ?? 1), 1000);

    await prisma.governanceVote.upsert({
      where: { proposalId_userId: { proposalId: proposal.id, userId: req.user!.id } },
      create: { proposalId: proposal.id, userId: req.user!.id, choice: req.body.choice, votingPower },
      update: { choice: req.body.choice, votingPower },
    });

    res.json({ data: { voted: true, choice: req.body.choice } });
  })
);
