import type { ID } from "@stanford-press/core";
import type { DashboardStats } from "./types";

/**
 * Compute dashboard statistics from raw submission data.
 */
export function computeDashboardStats(
  journalId: ID,
  submissions: Array<{
    status: string;
    submittedAt?: string;
    decisionDate?: string;
    decision?: string;
  }>,
): DashboardStats {
  const byStage: Record<string, number> = {};
  let totalActive = 0;
  let awaitingDecision = 0;
  let totalDecisions = 0;
  let totalDaysToDecision = 0;
  let acceptCount = 0;
  let decidedCount = 0;

  for (const sub of submissions) {
    byStage[sub.status] = (byStage[sub.status] ?? 0) + 1;

    // Count active (not rejected, not published)
    if (sub.status !== "rejected" && sub.status !== "published") {
      totalActive++;
    }

    // Count awaiting decision (under review)
    if (sub.status === "under-review") {
      awaitingDecision++;
    }

    // Calculate days to decision
    if (sub.submittedAt && sub.decisionDate) {
      const days =
        (new Date(sub.decisionDate).getTime() - new Date(sub.submittedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      totalDaysToDecision += days;
      totalDecisions++;
    }

    // Track acceptance rate
    if (sub.decision) {
      decidedCount++;
      if (sub.decision === "accept") {
        acceptCount++;
      }
    }
  }

  return {
    journalId,
    byStage,
    totalActive,
    awaitingDecision,
    overdueReviews: 0, // Computed separately from review assignments
    avgDaysToDecision: totalDecisions > 0 ? Math.round(totalDaysToDecision / totalDecisions) : 0,
    acceptanceRate: decidedCount > 0 ? Math.round((acceptCount / decidedCount) * 100) : 0,
    computedAt: new Date().toISOString(),
  };
}
