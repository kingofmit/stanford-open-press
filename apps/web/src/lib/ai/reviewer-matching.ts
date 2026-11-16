import { prisma } from "@stanford-press/database";

export interface ReviewerMatch {
  userId: string;
  name: string;
  email: string;
  affiliation: string | null;
  score: number;
  matchingAreas: string[];
  reliability: number;
  conflicts: string[];
  totalCompleted: number;
  activeAssignments: number;
}

interface MatchOptions {
  submissionId: string;
  maxResults?: number;
  excludeIds?: string[];
}

/**
 * Find the best reviewer matches for a submission using keyword overlap,
 * expertise matching, and workload balancing.
 */
export async function matchReviewers(options: MatchOptions): Promise<ReviewerMatch[]> {
  const { submissionId, maxResults = 10, excludeIds = [] } = options;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      authors: { select: { email: true, affiliation: true, userId: true } },
      journal: { select: { id: true } },
    },
  });

  if (!submission) throw new Error("Submission not found");

  // Get submission keywords and abstract words for matching
  const submissionTerms = new Set([
    ...submission.keywords.map((k) => k.toLowerCase()),
    ...(submission.abstract || "")
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4),
    ...submission.title
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4),
  ]);

  // Get author identifiers for conflict detection
  const authorEmails = new Set(submission.authors.map((a) => a.email.toLowerCase()));
  const authorAffiliations = new Set(
    submission.authors
      .map((a) => a.affiliation?.toLowerCase())
      .filter(Boolean) as string[]
  );
  const authorUserIds = new Set(
    submission.authors
      .map((a) => a.userId)
      .filter(Boolean) as string[]
  );

  // Already-invited reviewer IDs
  const existingReviewers = await prisma.reviewAssignment.findMany({
    where: {
      submissionId,
      status: { notIn: ["Declined", "Cancelled"] },
    },
    select: { reviewerId: true },
  });
  const excludeSet = new Set([
    ...excludeIds,
    ...existingReviewers.map((r) => r.reviewerId),
    ...Array.from(authorUserIds),
  ]);

  // Find potential reviewers who have the Reviewer role in this journal
  const potentialReviewers = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          journalId: submission.journalId,
          role: "Reviewer",
        },
      },
      id: { notIn: Array.from(excludeSet) },
      reviewerAvailable: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      affiliation: true,
      expertiseAreas: true,
      totalCompleted: true,
      totalDeclined: true,
      avgResponseDays: true,
      qualityScore: true,
      lastReviewDate: true,
    },
  });

  // Get active assignment counts
  const activeCounts = await prisma.reviewAssignment.groupBy({
    by: ["reviewerId"],
    where: {
      reviewerId: { in: potentialReviewers.map((r) => r.id) },
      status: { in: ["Invited", "Accepted", "InProgress"] },
    },
    _count: true,
  });
  const activeMap = new Map(activeCounts.map((c) => [c.reviewerId, c._count]));

  // Score each reviewer
  const matches: ReviewerMatch[] = potentialReviewers.map((reviewer) => {
    const conflicts: string[] = [];
    let score = 0;
    const matchingAreas: string[] = [];

    // 1. Expertise match (40% weight)
    const reviewerTerms = new Set(reviewer.expertiseAreas.map((a) => a.toLowerCase()));
    let expertiseScore = 0;

    for (const term of reviewerTerms) {
      if (submissionTerms.has(term)) {
        matchingAreas.push(term);
        expertiseScore += 10;
      }
      // Partial matching — check if any submission term contains this expertise
      for (const sTerm of submissionTerms) {
        if (sTerm.includes(term) || term.includes(sTerm)) {
          if (!matchingAreas.includes(term)) matchingAreas.push(term);
          expertiseScore += 3;
          break;
        }
      }
    }
    score += Math.min(40, expertiseScore);

    // 2. Reliability score (20% weight)
    const totalReviews = reviewer.totalCompleted + reviewer.totalDeclined;
    let reliability = 50; // Default for new reviewers
    if (totalReviews > 0) {
      const acceptRate = reviewer.totalCompleted / totalReviews;
      reliability = Math.round(acceptRate * 100);
    }
    if (reviewer.qualityScore) {
      reliability = Math.round((reliability + reviewer.qualityScore) / 2);
    }
    score += Math.round((reliability / 100) * 20);

    // 3. Workload balance (20% weight)
    const activeCount = activeMap.get(reviewer.id) || 0;
    if (activeCount === 0) score += 20;
    else if (activeCount === 1) score += 15;
    else if (activeCount === 2) score += 8;
    else score += 2; // Heavily loaded

    // 4. Recency bonus (10% weight) — prefer reviewers who haven't reviewed recently
    if (reviewer.lastReviewDate) {
      const daysSinceLastReview = Math.floor(
        (Date.now() - reviewer.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastReview > 180) score += 10;
      else if (daysSinceLastReview > 90) score += 7;
      else if (daysSinceLastReview > 30) score += 4;
      else score += 1;
    } else {
      score += 5; // Never reviewed — neutral
    }

    // 5. Experience bonus (10% weight)
    if (reviewer.totalCompleted >= 10) score += 10;
    else if (reviewer.totalCompleted >= 5) score += 7;
    else if (reviewer.totalCompleted >= 1) score += 4;
    else score += 2;

    // Conflict detection
    if (authorEmails.has(reviewer.email.toLowerCase())) {
      conflicts.push("Reviewer email matches an author");
      score = 0;
    }
    if (reviewer.affiliation && authorAffiliations.has(reviewer.affiliation.toLowerCase())) {
      conflicts.push("Same institutional affiliation as an author");
      score = Math.max(0, score - 30);
    }
    // Check email domain
    const reviewerDomain = reviewer.email.split("@")[1]?.toLowerCase();
    for (const authorEmail of authorEmails) {
      const authorDomain = authorEmail.split("@")[1];
      if (reviewerDomain && authorDomain && reviewerDomain === authorDomain && !["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(reviewerDomain)) {
        conflicts.push("Same email domain as an author");
        score = Math.max(0, score - 20);
      }
    }

    return {
      userId: reviewer.id,
      name: reviewer.name,
      email: reviewer.email,
      affiliation: reviewer.affiliation,
      score: Math.min(100, score),
      matchingAreas,
      reliability,
      conflicts,
      totalCompleted: reviewer.totalCompleted,
      activeAssignments: activeCount,
    };
  });

  // Sort by score descending, filter out zero scores
  return matches
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
