import type { ID, ISODate } from "@stanford-press/core";

/** Editorial decision types */
export enum EditorialDecisionType {
  Accept = "accept",
  MinorRevision = "minor-revision",
  MajorRevision = "major-revision",
  Reject = "reject",
  DeskReject = "desk-reject",
  Resubmit = "resubmit",
}

/** An editorial decision on a submission */
export interface EditorialDecision {
  id: ID;
  submissionId: ID;
  editorId: ID;
  decision: EditorialDecisionType;
  /** Comments to the author explaining the decision */
  commentsToAuthor: string;
  /** Internal comments for editorial records */
  internalNotes?: string;
  /** Round number (1 = first review, 2 = after revision, etc.) */
  round: number;
  createdAt: ISODate;
}

/** A copyediting record */
export interface CopyeditRecord {
  id: ID;
  submissionId: ID;
  copyeditorId: ID;
  status: CopyeditStatus;
  /** Track changes or editorial notes */
  notes: EditorialNote[];
  /** File ID of the copyedited manuscript */
  copyeditedFileId?: ID;
  startedAt: ISODate;
  completedAt?: ISODate;
}

/** Status of copyediting */
export enum CopyeditStatus {
  Assigned = "assigned",
  InProgress = "in-progress",
  AuthorReview = "author-review",
  Completed = "completed",
}

/** An editorial note or comment */
export interface EditorialNote {
  id: ID;
  authorId: ID;
  text: string;
  /** Location in the manuscript (e.g., page/paragraph reference) */
  location?: string;
  resolved: boolean;
  createdAt: ISODate;
}

/** A production task */
export interface ProductionTask {
  id: ID;
  submissionId: ID;
  type: ProductionTaskType;
  assigneeId?: ID;
  status: ProductionTaskStatus;
  notes?: string;
  createdAt: ISODate;
  completedAt?: ISODate;
}

/** Types of production tasks */
export enum ProductionTaskType {
  Typesetting = "typesetting",
  GalleyProof = "galley-proof",
  AuthorProofing = "author-proofing",
  FinalCheck = "final-check",
  MetadataEntry = "metadata-entry",
  DOIRegistration = "doi-registration",
}

/** Status of a production task */
export enum ProductionTaskStatus {
  Pending = "pending",
  InProgress = "in-progress",
  AwaitingApproval = "awaiting-approval",
  Completed = "completed",
}

/** An email template for workflow notifications */
export interface EmailTemplate {
  id: ID;
  journalId: ID;
  eventKey: string;
  subject: string;
  /** Template body with placeholder variables like {{authorName}}, {{journalName}} */
  body: string;
  /** Whether the template is active */
  enabled: boolean;
}

/** Dashboard statistics for an editor */
export interface DashboardStats {
  journalId: ID;
  /** Submissions by stage */
  byStage: Record<string, number>;
  /** Total active submissions */
  totalActive: number;
  /** Submissions awaiting decision */
  awaitingDecision: number;
  /** Overdue reviews */
  overdueReviews: number;
  /** Average days from submission to first decision */
  avgDaysToDecision: number;
  /** Acceptance rate percentage */
  acceptanceRate: number;
  /** Last updated */
  computedAt: ISODate;
}

/** Options for creating an editorial decision */
export interface CreateDecisionOptions {
  submissionId: ID;
  editorId: ID;
  decision: EditorialDecisionType;
  commentsToAuthor: string;
  internalNotes?: string;
  round: number;
}

/** Options for creating an email template */
export interface CreateEmailTemplateOptions {
  journalId: ID;
  eventKey: string;
  subject: string;
  body: string;
  enabled?: boolean;
}
