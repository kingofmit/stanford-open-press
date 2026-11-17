import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing
vi.mock("@stanford-press/database", () => ({
  prisma: {
    submission: {
      findUnique: vi.fn(),
    },
    deskReviewLog: {
      create: vi.fn(),
    },
  },
}));

import { performDeskReview } from "@/lib/ai/desk-review";
import { prisma } from "@stanford-press/database";

const mockSubmission = {
  id: "sub1",
  title: "A Study of Machine Learning Applications in Drug Discovery",
  abstract:
    "This study investigates the application of machine learning techniques to accelerate the drug discovery pipeline. We propose a novel deep learning architecture that combines graph neural networks with attention mechanisms to predict molecular properties. Our method achieves state-of-the-art results on multiple benchmark datasets, demonstrating significant improvements in both accuracy and computational efficiency compared to existing approaches.",
  keywords: ["machine learning", "drug discovery", "deep learning"],
  coverLetter: "Dear Editor, we submit this manuscript...",
  conflictOfInterest: "The authors declare no conflicts of interest.",
  funding: "NIH Grant R01-123456",
  dataAvailability: "Data available at github.com/example",
  ethicsApproval: null,
  authors: [
    {
      corresponding: true,
      affiliation: "Stanford University",
      email: "jane@stanford.edu",
      givenName: "Jane",
      familyName: "Doe",
    },
    {
      corresponding: false,
      affiliation: "MIT",
      email: "john@mit.edu",
      givenName: "John",
      familyName: "Smith",
    },
  ],
  files: [
    { category: "Manuscript", sizeBytes: 2 * 1024 * 1024, filename: "manuscript.pdf" },
  ],
  journal: {
    name: "Journal of Computational Biology",
    description:
      "A journal focused on computational methods in biology, bioinformatics, machine learning, and drug discovery.",
    peerReviewType: "double-blind",
  },
};

describe("AI Desk Review (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.submission.findUnique as any).mockResolvedValue(mockSubmission);
    (prisma.deskReviewLog.create as any).mockResolvedValue({});
  });

  it("passes a complete, well-formed submission", async () => {
    const result = await performDeskReview("sub1");
    expect(result.assessment).toBe("pass");
    expect(result.confidence).toBeGreaterThan(50);
    expect(result.checks.filter((c) => c.status === "fail")).toHaveLength(0);
  });

  it("flags submission with missing abstract", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue({
      ...mockSubmission,
      abstract: null,
    });
    const result = await performDeskReview("sub1");
    expect(result.assessment).not.toBe("pass");
    const abstractCheck = result.checks.find((c) => c.name === "Abstract");
    expect(abstractCheck?.status).toBe("fail");
  });

  it("flags submission with no authors", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue({
      ...mockSubmission,
      authors: [],
    });
    const result = await performDeskReview("sub1");
    const authorCheck = result.checks.find((c) => c.name === "Authors");
    expect(authorCheck?.status).toBe("fail");
  });

  it("flags submission with no manuscript file", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue({
      ...mockSubmission,
      files: [],
    });
    const result = await performDeskReview("sub1");
    const fileCheck = result.checks.find((c) => c.name === "Manuscript");
    expect(fileCheck?.status).toBe("fail");
  });

  it("warns when keywords are missing", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue({
      ...mockSubmission,
      keywords: [],
    });
    const result = await performDeskReview("sub1");
    const kwCheck = result.checks.find((c) => c.name === "Keywords");
    expect(kwCheck?.status).toBe("warn");
  });

  it("warns when abstract is very short", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue({
      ...mockSubmission,
      abstract: "Short abstract here.",
    });
    const result = await performDeskReview("sub1");
    const absCheck = result.checks.find((c) => c.name === "Abstract");
    expect(absCheck?.status).toBe("warn");
  });

  it("warns about missing ethics for human subjects research", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue({
      ...mockSubmission,
      abstract: "This clinical trial enrolled 200 human participants to test...",
      ethicsApproval: null,
    });
    const result = await performDeskReview("sub1");
    const ethicsCheck = result.checks.find((c) => c.name === "Ethics Approval");
    expect(ethicsCheck?.status).toBe("warn");
  });

  it("rejects submission with multiple critical failures", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue({
      ...mockSubmission,
      title: "Hi",
      abstract: null,
      authors: [],
      files: [],
    });
    const result = await performDeskReview("sub1");
    expect(result.assessment).toBe("reject");
  });

  it("throws for non-existent submission", async () => {
    (prisma.submission.findUnique as any).mockResolvedValue(null);
    await expect(performDeskReview("missing")).rejects.toThrow("Submission not found");
  });

  it("stores result in database", async () => {
    await performDeskReview("sub1");
    expect(prisma.deskReviewLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: "sub1",
        assessment: "pass",
      }),
    });
  });
});
