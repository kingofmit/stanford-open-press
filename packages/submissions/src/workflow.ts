import { SubmissionStatus } from "./types";
import type { StatusTransition } from "./types";
import type { ID } from "@stanford-press/core";

/**
 * Valid state transitions for the submission workflow.
 * Maps each status to the set of statuses it can transition to.
 */
export const VALID_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  [SubmissionStatus.Draft]: [SubmissionStatus.Submitted],
  [SubmissionStatus.Submitted]: [SubmissionStatus.UnderReview, SubmissionStatus.Rejected],
  [SubmissionStatus.UnderReview]: [
    SubmissionStatus.Revision,
    SubmissionStatus.Accepted,
    SubmissionStatus.Rejected,
  ],
  [SubmissionStatus.Revision]: [SubmissionStatus.UnderReview, SubmissionStatus.Rejected],
  [SubmissionStatus.Accepted]: [SubmissionStatus.Published],
  [SubmissionStatus.Rejected]: [],
  [SubmissionStatus.Published]: [],
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Submission state machine that tracks transitions and enforces valid state changes.
 */
export class SubmissionWorkflow {
  private currentStatus: SubmissionStatus;
  private transitions: StatusTransition[] = [];

  constructor(initialStatus: SubmissionStatus = SubmissionStatus.Draft) {
    this.currentStatus = initialStatus;
  }

  /** Get current status */
  get status(): SubmissionStatus {
    return this.currentStatus;
  }

  /** Get all transitions */
  get history(): StatusTransition[] {
    return [...this.transitions];
  }

  /** Get valid next statuses from current state */
  get nextStatuses(): SubmissionStatus[] {
    return VALID_TRANSITIONS[this.currentStatus] ?? [];
  }

  /** Whether the submission can transition to the given status */
  canTransitionTo(status: SubmissionStatus): boolean {
    return isValidTransition(this.currentStatus, status);
  }

  /**
   * Transition to a new status.
   * @throws Error if the transition is invalid.
   */
  transitionTo(status: SubmissionStatus, actorId: ID, reason?: string): StatusTransition {
    if (!this.canTransitionTo(status)) {
      throw new Error(
        `Invalid transition: cannot move from "${this.currentStatus}" to "${status}". ` +
          `Valid transitions: ${this.nextStatuses.join(", ") || "none"}`,
      );
    }

    const transition: StatusTransition = {
      from: this.currentStatus,
      to: status,
      actorId,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.transitions.push(transition);
    this.currentStatus = status;
    return transition;
  }

  /** Whether the submission is in a terminal state */
  get isTerminal(): boolean {
    return this.nextStatuses.length === 0;
  }

  /** Whether the submission is published */
  get isPublished(): boolean {
    return this.currentStatus === SubmissionStatus.Published;
  }

  /** Whether the submission is rejected */
  get isRejected(): boolean {
    return this.currentStatus === SubmissionStatus.Rejected;
  }
}
