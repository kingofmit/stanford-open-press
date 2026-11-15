import type { ID, ISODate } from "@stanford-press/core";

/** Status of a submission in the workflow */
export enum SubmissionStatus {
  Draft = "draft",
  Submitted = "submitted",
  UnderReview = "under-review",
  Revision = "revision",
  Accepted = "accepted",
  Rejected = "rejected",
  Published = "published",
}

/** An author on a submission */
export interface Author {
  name: string;
  email: string;
  affiliation?: string;
  orcid?: string;
  /** Whether this is the corresponding author */
  corresponding: boolean;
  /** Order in the author list */
  order: number;
}

/** A file attached to a submission */
export interface FileAttachment {
  id: ID;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Purpose: manuscript, supplementary, figure, cover-letter */
  category: FileCategory;
  /** Version number for manuscript files */
  version: number;
  uploadedAt: ISODate;
  uploadedBy: ID;
}

/** Categories of files that can be attached */
export enum FileCategory {
  Manuscript = "manuscript",
  Supplementary = "supplementary",
  Figure = "figure",
  CoverLetter = "cover-letter",
  RevisedManuscript = "revised-manuscript",
  ResponseToReviewers = "response-to-reviewers",
}

/** Cover letter included with a submission */
export interface CoverLetter {
  text: string;
  createdAt: ISODate;
}

/** A manuscript submission */
export interface Submission {
  id: ID;
  journalId: ID;
  sectionId?: ID;
  title: string;
  abstract: string;
  keywords: string[];
  authors: Author[];
  files: FileAttachment[];
  coverLetter?: CoverLetter;
  status: SubmissionStatus;
  /** The user who created the submission */
  submitterId: ID;
  /** Current manuscript version number */
  currentVersion: number;
  /** Metadata for the submission */
  metadata: SubmissionMetadata;
  createdAt: ISODate;
  updatedAt: ISODate;
  submittedAt?: ISODate;
}

/** Additional metadata for a submission */
export interface SubmissionMetadata {
  /** Conflict of interest statement */
  conflictOfInterest?: string;
  /** Funding sources */
  funding?: string;
  /** Data availability statement */
  dataAvailability?: string;
  /** Ethics approval details */
  ethicsApproval?: string;
  /** Word count */
  wordCount?: number;
  /** Suggested reviewers */
  suggestedReviewers?: string[];
  /** Opposed reviewers */
  opposedReviewers?: string[];
}

/** Options for creating a new submission */
export interface CreateSubmissionOptions {
  journalId: ID;
  sectionId?: ID;
  title: string;
  abstract: string;
  keywords?: string[];
  authors: Omit<Author, "order">[];
  submitterId: ID;
  coverLetter?: string;
  metadata?: Partial<SubmissionMetadata>;
}

/** A record of a status transition */
export interface StatusTransition {
  from: SubmissionStatus;
  to: SubmissionStatus;
  actorId: ID;
  reason?: string;
  timestamp: ISODate;
}
