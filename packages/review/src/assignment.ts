import type { ID } from "@stanford-press/core";
import type { ReviewAssignment, InviteReviewerOptions, Reviewer } from "./types";
import { ReviewAssignmentStatus } from "./types";

let counter = 0;

function generateId(): ID {
  return `ra_${Date.now()}_${++counter}`;
}

/**
 * Create a reviewer invitation/assignment.
 */
export function inviteReviewer(options: InviteReviewerOptions): ReviewAssignment {
  const now = new Date();
  const deadlineDays = options.deadlineDays ?? 21;
  const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

  return {
    id: generateId(),
    submissionId: options.submissionId,
    reviewerId: options.reviewerId,
    assignedBy: options.assignedBy,
    reviewType: options.reviewType,
    formId: options.formId,
    status: ReviewAssignmentStatus.Invited,
    deadline: deadline.toISOString(),
    invitedAt: now.toISOString(),
  };
}

/**
 * Accept a review invitation.
 */
export function acceptInvitation(assignment: ReviewAssignment): ReviewAssignment {
  if (assignment.status !== ReviewAssignmentStatus.Invited) {
    throw new Error(`Cannot accept: assignment is "${assignment.status}", expected "invited"`);
  }
  return {
    ...assignment,
    status: ReviewAssignmentStatus.Accepted,
    respondedAt: new Date().toISOString(),
  };
}

/**
 * Decline a review invitation.
 */
export function declineInvitation(assignment: ReviewAssignment, reason?: string): ReviewAssignment {
  if (assignment.status !== ReviewAssignmentStatus.Invited) {
    throw new Error(`Cannot decline: assignment is "${assignment.status}", expected "invited"`);
  }
  return {
    ...assignment,
    status: ReviewAssignmentStatus.Declined,
    respondedAt: new Date().toISOString(),
    declineReason: reason,
  };
}

/**
 * Mark a review assignment as completed.
 */
export function completeAssignment(assignment: ReviewAssignment): ReviewAssignment {
  if (assignment.status !== ReviewAssignmentStatus.Accepted) {
    throw new Error(`Cannot complete: assignment is "${assignment.status}", expected "accepted"`);
  }
  return {
    ...assignment,
    status: ReviewAssignmentStatus.Completed,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Check if a review assignment is overdue.
 */
export function isOverdue(assignment: ReviewAssignment): boolean {
  if (
    assignment.status === ReviewAssignmentStatus.Completed ||
    assignment.status === ReviewAssignmentStatus.Declined ||
    assignment.status === ReviewAssignmentStatus.Cancelled
  ) {
    return false;
  }
  return new Date() > new Date(assignment.deadline);
}

/**
 * Update reviewer performance metrics after a completed review.
 */
export function updateReviewerMetrics(
  reviewer: Reviewer,
  responseDays: number,
  editorQualityRating?: number,
): Reviewer {
  const newTotal = reviewer.totalCompleted + 1;
  const newAvgDays =
    (reviewer.avgResponseDays * reviewer.totalCompleted + responseDays) / newTotal;

  let newQuality = reviewer.qualityScore;
  if (editorQualityRating !== undefined) {
    newQuality =
      (reviewer.qualityScore * reviewer.totalCompleted + editorQualityRating) / newTotal;
  }

  return {
    ...reviewer,
    avgResponseDays: Math.round(newAvgDays * 10) / 10,
    qualityScore: Math.round(newQuality * 10) / 10,
    totalCompleted: newTotal,
    lastReviewDate: new Date().toISOString(),
  };
}
