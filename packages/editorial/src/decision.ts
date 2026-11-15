import type { ID } from "@stanford-press/core";
import type { EditorialDecision, CreateDecisionOptions } from "./types";

let counter = 0;

function generateId(): ID {
  return `ed_${Date.now()}_${++counter}`;
}

/**
 * Create an editorial decision for a submission.
 *
 * ```ts
 * const decision = createDecision({
 *   submissionId: "sub_123",
 *   editorId: "editor_456",
 *   decision: EditorialDecisionType.MinorRevision,
 *   commentsToAuthor: "The reviewers recommend minor revisions...",
 *   round: 1,
 * });
 * ```
 */
export function createDecision(options: CreateDecisionOptions): EditorialDecision {
  return {
    id: generateId(),
    submissionId: options.submissionId,
    editorId: options.editorId,
    decision: options.decision,
    commentsToAuthor: options.commentsToAuthor,
    internalNotes: options.internalNotes,
    round: options.round,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Summarize review decisions to help the editor make a final call.
 * Returns a recommendation based on majority review decisions.
 */
export function summarizeReviewDecisions(
  decisions: Array<{ decision: string }>,
): { recommendation: string; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  for (const d of decisions) {
    breakdown[d.decision] = (breakdown[d.decision] ?? 0) + 1;
  }

  // Determine recommendation by priority: reject > major > minor > accept
  let recommendation = "accept";
  if (breakdown["reject"] && breakdown["reject"] >= decisions.length / 2) {
    recommendation = "reject";
  } else if (breakdown["major-revision"]) {
    recommendation = "major-revision";
  } else if (breakdown["minor-revision"]) {
    recommendation = "minor-revision";
  }

  return { recommendation, breakdown };
}
