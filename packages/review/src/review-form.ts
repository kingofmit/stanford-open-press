import type { ID } from "@stanford-press/core";
import type { ReviewForm, CreateReviewFormOptions, ReviewCriteria } from "./types";

let counter = 0;

function generateId(): ID {
  return `rf_${Date.now()}_${++counter}`;
}

/**
 * Create a customizable review form with scoring criteria.
 *
 * ```ts
 * const form = createReviewForm({
 *   journalId: "j_123",
 *   name: "Standard Research Article Review",
 *   criteria: [
 *     { label: "Originality", minScore: 1, maxScore: 5, required: true, weight: 2 },
 *     { label: "Methodology", minScore: 1, maxScore: 5, required: true, weight: 3 },
 *     { label: "Clarity", minScore: 1, maxScore: 5, required: true, weight: 1 },
 *   ],
 * });
 * ```
 */
export function createReviewForm(options: CreateReviewFormOptions): ReviewForm {
  const criteria: ReviewCriteria[] = options.criteria.map((c) => ({
    ...c,
    id: generateId(),
  }));

  return {
    id: generateId(),
    journalId: options.journalId,
    name: options.name,
    description: options.description,
    criteria,
    includeComments: options.includeComments ?? true,
    includeConfidentialComments: options.includeConfidentialComments ?? true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Default review form for research articles.
 */
export function createDefaultReviewForm(journalId: ID): ReviewForm {
  return createReviewForm({
    journalId,
    name: "Standard Review Form",
    description: "Default review form for research article submissions.",
    criteria: [
      {
        label: "Originality & Significance",
        description: "Does the paper present novel and significant findings?",
        minScore: 1,
        maxScore: 5,
        required: true,
        weight: 2,
      },
      {
        label: "Scientific Rigor",
        description: "Are the methods sound and the analysis rigorous?",
        minScore: 1,
        maxScore: 5,
        required: true,
        weight: 3,
      },
      {
        label: "Clarity of Presentation",
        description: "Is the paper well-written and clearly structured?",
        minScore: 1,
        maxScore: 5,
        required: true,
        weight: 1,
      },
      {
        label: "Relevance to Journal Scope",
        description: "Is this paper appropriate for the journal's readership?",
        minScore: 1,
        maxScore: 5,
        required: true,
        weight: 1,
      },
      {
        label: "References & Literature Review",
        description: "Does the paper adequately cite and discuss relevant prior work?",
        minScore: 1,
        maxScore: 5,
        required: true,
        weight: 1,
      },
    ],
    includeComments: true,
    includeConfidentialComments: true,
  });
}

/**
 * Calculate the weighted average score for a set of criterion scores.
 */
export function calculateWeightedScore(
  criteria: ReviewCriteria[],
  scores: { criterionId: ID; score: number }[],
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const criterion of criteria) {
    const score = scores.find((s) => s.criterionId === criterion.id);
    if (score) {
      // Normalize score to 0-1 range
      const normalized = (score.score - criterion.minScore) / (criterion.maxScore - criterion.minScore);
      weightedSum += normalized * criterion.weight;
      totalWeight += criterion.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return (weightedSum / totalWeight) * 100;
}
