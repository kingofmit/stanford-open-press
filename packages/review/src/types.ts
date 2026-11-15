import type { ID, ISODate } from "@stanford-press/core";

/** Type of peer review */
export enum ReviewType {
  SingleBlind = "single-blind",
  DoubleBlind = "double-blind",
  Open = "open",
}

/** Status of a review assignment */
export enum ReviewAssignmentStatus {
  Invited = "invited",
  Accepted = "accepted",
  Declined = "declined",
  Completed = "completed",
  Overdue = "overdue",
  Cancelled = "cancelled",
}

/** Review decision recommendation */
export enum ReviewDecision {
  Accept = "accept",
  MinorRevision = "minor-revision",
  MajorRevision = "major-revision",
  Reject = "reject",
}

/** A criterion in a review form */
export interface ReviewCriteria {
  id: ID;
  label: string;
  description?: string;
  /** Score range: min to max */
  minScore: number;
  maxScore: number;
  /** Whether this criterion is required */
  required: boolean;
  /** Weight for computing overall score */
  weight: number;
}

/** A customizable review form */
export interface ReviewForm {
  id: ID;
  journalId: ID;
  name: string;
  description?: string;
  criteria: ReviewCriteria[];
  /** Whether to include a free-text comments field */
  includeComments: boolean;
  /** Whether to include confidential comments to the editor */
  includeConfidentialComments: boolean;
  createdAt: ISODate;
}

/** A score given for a single criterion */
export interface CriterionScore {
  criterionId: ID;
  score: number;
  comment?: string;
}

/** A completed review */
export interface Review {
  id: ID;
  assignmentId: ID;
  submissionId: ID;
  reviewerId: ID;
  formId: ID;
  scores: CriterionScore[];
  /** Comments visible to the author */
  commentsToAuthor: string;
  /** Confidential comments visible only to the editor */
  commentsToEditor?: string;
  decision: ReviewDecision;
  completedAt: ISODate;
}

/** A reviewer assignment */
export interface ReviewAssignment {
  id: ID;
  submissionId: ID;
  reviewerId: ID;
  /** Editor who made the assignment */
  assignedBy: ID;
  reviewType: ReviewType;
  formId: ID;
  status: ReviewAssignmentStatus;
  /** Deadline for completing the review */
  deadline: ISODate;
  invitedAt: ISODate;
  respondedAt?: ISODate;
  completedAt?: ISODate;
  /** Decline reason if declined */
  declineReason?: string;
}

/** Reviewer profile with expertise and performance metrics */
export interface Reviewer {
  userId: ID;
  expertiseAreas: string[];
  /** Average days to complete a review */
  avgResponseDays: number;
  /** Quality score from 0-100 based on editor ratings */
  qualityScore: number;
  /** Total reviews completed */
  totalCompleted: number;
  /** Total reviews declined */
  totalDeclined: number;
  /** Whether the reviewer is available for new assignments */
  available: boolean;
  lastReviewDate?: ISODate;
}

/** Options for creating a review form */
export interface CreateReviewFormOptions {
  journalId: ID;
  name: string;
  description?: string;
  criteria: Omit<ReviewCriteria, "id">[];
  includeComments?: boolean;
  includeConfidentialComments?: boolean;
}

/** Options for inviting a reviewer */
export interface InviteReviewerOptions {
  submissionId: ID;
  reviewerId: ID;
  assignedBy: ID;
  reviewType: ReviewType;
  formId: ID;
  /** Days from now for the deadline */
  deadlineDays?: number;
}
