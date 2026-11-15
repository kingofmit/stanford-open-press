import type { ExpertiseProfile, ReviewerMatch } from "./types";

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have the same length");
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Compute keyword overlap between two sets of keywords.
 * Returns a score from 0-100.
 */
export function keywordOverlap(a: string[], b: string[]): number {
  const setA = new Set(a.map((k) => k.toLowerCase()));
  const setB = new Set(b.map((k) => k.toLowerCase()));
  const intersection = [...setA].filter((k) => setB.has(k));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return Math.round((intersection.length / union.size) * 100);
}

/**
 * Match reviewers to a submission based on expertise profiles.
 *
 * Uses a combination of embedding similarity (if available) and keyword overlap.
 *
 * ```ts
 * const matches = matchReviewers(
 *   { keywords: ["machine learning", "NLP"], embedding: [...] },
 *   reviewerProfiles,
 *   { maxResults: 5, minScore: 30 },
 * );
 * ```
 */
export function matchReviewers(
  submission: { keywords: string[]; embedding?: number[] },
  reviewers: ExpertiseProfile[],
  options: { maxResults?: number; minScore?: number; excludeIds?: string[] } = {},
): ReviewerMatch[] {
  const { maxResults = 10, minScore = 20, excludeIds = [] } = options;
  const excludeSet = new Set(excludeIds);

  const matches: ReviewerMatch[] = reviewers
    .filter((r) => !excludeSet.has(r.reviewerId))
    .map((reviewer) => {
      let score = 0;
      const reasons: string[] = [];

      // Keyword overlap (weighted 40%)
      const kwOverlap = keywordOverlap(submission.keywords, [
        ...reviewer.areas,
        ...reviewer.reviewKeywords,
      ]);
      score += kwOverlap * 0.4;
      if (kwOverlap > 0) {
        reasons.push(`${kwOverlap}% keyword overlap`);
      }

      // Embedding similarity (weighted 60%) — if both have embeddings
      if (submission.embedding && reviewer.embedding) {
        const similarity = cosineSimilarity(submission.embedding, reviewer.embedding);
        const embScore = Math.round(similarity * 100);
        score += embScore * 0.6;
        if (embScore > 0) {
          reasons.push(`${embScore}% semantic similarity`);
        }
      } else {
        // If no embeddings, double the keyword weight
        score += kwOverlap * 0.6;
      }

      score = Math.round(score);

      // Find matching areas
      const subKw = new Set(submission.keywords.map((k) => k.toLowerCase()));
      const matchingAreas = reviewer.areas.filter((a) => subKw.has(a.toLowerCase()));

      return {
        reviewerId: reviewer.reviewerId,
        score,
        matchingAreas,
        reason: reasons.join("; ") || "No significant overlap detected",
        conflicts: [],
      };
    })
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return matches;
}

/**
 * Detect potential conflicts of interest between an author list and a reviewer.
 */
export function detectConflicts(
  authorAffiliations: string[],
  authorEmails: string[],
  reviewerAffiliation?: string,
  reviewerEmail?: string,
): string[] {
  const conflicts: string[] = [];

  // Same institution check
  if (reviewerAffiliation) {
    const reviewerInst = reviewerAffiliation.toLowerCase();
    for (const aff of authorAffiliations) {
      if (aff.toLowerCase().includes(reviewerInst) || reviewerInst.includes(aff.toLowerCase())) {
        conflicts.push(`Same institution: ${aff}`);
      }
    }
  }

  // Same email domain check
  if (reviewerEmail) {
    const reviewerDomain = reviewerEmail.split("@")[1]?.toLowerCase();
    if (reviewerDomain) {
      for (const email of authorEmails) {
        const authorDomain = email.split("@")[1]?.toLowerCase();
        if (authorDomain === reviewerDomain) {
          conflicts.push(`Same email domain: ${reviewerDomain}`);
        }
      }
    }
  }

  return conflicts;
}
