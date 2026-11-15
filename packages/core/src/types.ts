/** Unique identifier type */
export type ID = string;

/** ISO 8601 date string */
export type ISODate = string;

/** Supported roles in the system */
export enum Role {
  EditorInChief = "editor-in-chief",
  SectionEditor = "section-editor",
  Reviewer = "reviewer",
  Author = "author",
  Copyeditor = "copyeditor",
  Proofreader = "proofreader",
}

/** Workflow stages a submission passes through */
export enum WorkflowStage {
  Submission = "submission",
  DeskReview = "desk-review",
  PeerReview = "peer-review",
  EditorialDecision = "editorial-decision",
  Revision = "revision",
  Copyediting = "copyediting",
  Production = "production",
  Published = "published",
  Rejected = "rejected",
}

/** Permission actions */
export enum Action {
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
  Assign = "assign",
  Decide = "decide",
  Publish = "publish",
}

/** Resource types that permissions apply to */
export enum Resource {
  Journal = "journal",
  Submission = "submission",
  Review = "review",
  Editorial = "editorial",
  Issue = "issue",
  User = "user",
}

/** A permission grants a role the ability to perform an action on a resource */
export interface Permission {
  role: Role;
  action: Action;
  resource: Resource;
  /** Optional: restrict to specific workflow stages */
  stages?: WorkflowStage[];
}

/** Journal section configuration */
export interface JournalSection {
  id: ID;
  name: string;
  description?: string;
  /** Section-specific editor */
  editorId?: ID;
  /** Whether the section accepts submissions */
  active: boolean;
}

/** Journal configuration */
export interface Journal {
  id: ID;
  name: string;
  abbreviation?: string;
  issn?: string;
  eissn?: string;
  doiPrefix?: string;
  description?: string;
  sections: JournalSection[];
  /** URL slug for multi-journal instances */
  slug: string;
  /** Default review type for new submissions */
  defaultReviewType: "single-blind" | "double-blind" | "open";
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** User in the system */
export interface User {
  id: ID;
  email: string;
  name: string;
  affiliation?: string;
  orcid?: string;
  roles: RoleAssignment[];
  createdAt: ISODate;
}

/** A role assigned to a user within a specific journal */
export interface RoleAssignment {
  role: Role;
  journalId: ID;
  assignedAt: ISODate;
}

/** Event types emitted during workflow transitions */
export enum EventType {
  SubmissionCreated = "submission.created",
  SubmissionSubmitted = "submission.submitted",
  DeskReviewCompleted = "desk-review.completed",
  ReviewerAssigned = "reviewer.assigned",
  ReviewerInvited = "reviewer.invited",
  ReviewSubmitted = "review.submitted",
  DecisionMade = "decision.made",
  RevisionRequested = "revision.requested",
  RevisionSubmitted = "revision.submitted",
  CopyeditingStarted = "copyediting.started",
  CopyeditingCompleted = "copyediting.completed",
  ProductionStarted = "production.started",
  ArticlePublished = "article.published",
}

/** A workflow event */
export interface WorkflowEvent<T = unknown> {
  id: ID;
  type: EventType;
  journalId: ID;
  submissionId: ID;
  actorId: ID;
  payload: T;
  timestamp: ISODate;
}

/** Options for creating a journal */
export interface CreateJournalOptions {
  name: string;
  slug: string;
  abbreviation?: string;
  issn?: string;
  eissn?: string;
  doiPrefix?: string;
  description?: string;
  sections?: string[];
  defaultReviewType?: "single-blind" | "double-blind" | "open";
}
