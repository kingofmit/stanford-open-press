import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@stanford-press/database", () => ({
  prisma: {
    submission: { findUnique: vi.fn() },
    reviewAssignment: { findMany: vi.fn(), groupBy: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { matchReviewers } from "@/lib/ai/reviewer-matching";
import { prisma } from "@stanford-press/database";

const mockSubmission = {
  id: "sub1",
  journalId: "j1",
  title: "Deep Learning for Protein Folding",
  abstract:
    "We present a novel deep learning approach for protein structure prediction using transformer architectures.",
  keywords: ["deep learning", "protein folding", "transformers", "structural biology"],
  authors: [
    {
      email: "author@stanford.edu",
      affiliation: "Stanford University",
      userId: "user1",
    },
  ],
  journal: { id: "j1" },
};

const mockReviewers = [
  {
    id: "rev1",
    name: "Expert Reviewer",
    email: "expert@mit.edu",
    affiliation: "MIT",
    expertiseAreas: ["deep learning", "protein folding", "computational biology"],
    totalCompleted: 15,
    totalDeclined: 2,
    avgResponseDays: 14,
    qualityScore: 85,
    lastReviewDate: new Date("2026-06-01"),
  },
  {
    id: "rev2",
    name: "Partial Match",
    email: "partial@oxford.edu",
    affiliation: "Oxford University",
    expertiseAreas: ["machine learning", "drug discovery"],
    totalCompleted: 5,
    totalDeclined: 1,
    avgResponseDays: 20,
    qualityScore: 70,
    lastReviewDate: new Date("2026-03-01"),
  },
  {
    id: "rev3",
    name: "Conflicted Reviewer",
    email: "conflict@stanford.edu",
    affiliation: "Stanford University",
    expertiseAreas: ["deep learning", "protein folding"],
    totalCompleted: 10,
    totalDeclined: 0,
    avgResponseDays: 10,
    qualityScore: 90,
    lastReviewDate: new Date("2026-08-01"),
  },
];

describe("AI Reviewer Matching (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.submission.findUnique as any).mockResolvedValue(mockSubmission);
    (prisma.reviewAssignment.findMany as any).mockResolvedValue([]);
    (prisma.reviewAssignment.groupBy as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue(mockReviewers);
  });

  it("returns ranked reviewer matches", async () => {
    const matches = await matchReviewers({ submissionId: "sub1" });
    expect(matches.length).toBeGreaterThan(0);
    // Should be sorted by score descending
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it("ranks expert higher than partial match", async () => {
    const matches = await matchReviewers({ submissionId: "sub1" });
    const expert = matches.find((m) => m.userId === "rev1");
    const partial = matches.find((m) => m.userId === "rev2");
    expect(expert).toBeDefined();
    expect(partial).toBeDefined();
    expect(expert!.score).toBeGreaterThan(partial!.score);
  });

  it("detects institutional conflicts", async () => {
    const matches = await matchReviewers({ submissionId: "sub1" });
    const conflicted = matches.find((m) => m.userId === "rev3");
    if (conflicted) {
      expect(conflicted.conflicts.length).toBeGreaterThan(0);
      expect(conflicted.score).toBeLessThan(
        matches.find((m) => m.userId === "rev1")!.score
      );
    }
  });

  it("includes matching expertise areas", async () => {
    const matches = await matchReviewers({ submissionId: "sub1" });
    const expert = matches.find((m) => m.userId === "rev1");
    expect(expert!.matchingAreas.length).toBeGreaterThan(0);
  });

  it("respects maxResults", async () => {
    const matches = await matchReviewers({ submissionId: "sub1", maxResults: 1 });
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("excludes specified IDs via database query", async () => {
    await matchReviewers({ submissionId: "sub1", excludeIds: ["rev1"] });
    // excludeIds are passed to the prisma query's notIn filter
    const findManyCall = (prisma.user.findMany as any).mock.calls[0][0];
    expect(findManyCall.where.id.notIn).toContain("rev1");
  });

  it("throws for non-existent submission", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue(null);
    await expect(matchReviewers({ submissionId: "missing" })).rejects.toThrow();
  });

  it("includes reliability score", async () => {
    const matches = await matchReviewers({ submissionId: "sub1" });
    for (const match of matches) {
      expect(match.reliability).toBeGreaterThanOrEqual(0);
      expect(match.reliability).toBeLessThanOrEqual(100);
    }
  });

  it("includes active assignment count", async () => {
    (prisma.reviewAssignment.groupBy as any).mockResolvedValue([
      { reviewerId: "rev1", _count: 3 },
    ]);
    const matches = await matchReviewers({ submissionId: "sub1" });
    const expert = matches.find((m) => m.userId === "rev1");
    expect(expert!.activeAssignments).toBe(3);
  });
});
