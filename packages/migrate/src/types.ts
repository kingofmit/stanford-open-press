import type { ID, ISODate } from "@stanford-press/core";

/** OJS journal as stored in the OJS database */
export interface OJSJournal {
  journalId: number;
  path: string;
  primaryLocale: string;
  name: string;
  description?: string;
  issn?: string;
  /** OJS settings that map to Stanford Open Press config */
  settings: Record<string, string>;
}

/** OJS submission record */
export interface OJSSubmission {
  submissionId: number;
  journalId: number;
  title: string;
  abstract?: string;
  status: number;
  /** OJS status codes: 1=queued, 3=published, 4=declined, 5=scheduled */
  locale: string;
  dateSubmitted?: string;
  dateLastModified?: string;
  authors: OJSAuthor[];
  keywords?: string[];
}

/** OJS author record */
export interface OJSAuthor {
  authorId: number;
  firstName: string;
  lastName: string;
  email: string;
  affiliation?: string;
  orcid?: string;
  primaryContact: boolean;
  seq: number;
}

/** OJS user record */
export interface OJSUser {
  userId: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: number[];
}

/** OJS review assignment */
export interface OJSReviewAssignment {
  reviewId: number;
  submissionId: number;
  reviewerId: number;
  recommendation?: number;
  dateCompleted?: string;
  comments?: string;
}

/** OJS issue record */
export interface OJSIssue {
  issueId: number;
  journalId: number;
  volume: number;
  number: number;
  year: number;
  title?: string;
  published: boolean;
  datePublished?: string;
}

/** Database connection configuration */
export interface DatabaseConfig {
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  /** Database type: mysql or postgresql */
  type?: "mysql" | "postgresql";
}

/** A migration plan describing what will be imported */
export interface MigrationPlan {
  id: ID;
  sourceConfig: Omit<DatabaseConfig, "password">;
  journals: number;
  submissions: number;
  users: number;
  reviews: number;
  issues: number;
  files: number;
  /** Estimated time in seconds */
  estimatedDuration: number;
  /** Items that cannot be automatically migrated */
  manualItems: string[];
  createdAt: ISODate;
}

/** Report after migration execution */
export interface MigrationReport {
  planId: ID;
  /** Total records successfully migrated */
  success: number;
  /** Records that had issues but were migrated with warnings */
  warnings: number;
  /** Records that failed to migrate */
  failures: number;
  /** Detailed errors */
  errors: MigrationError[];
  /** Items requiring manual attention */
  manualItems: string[];
  /** Duration in milliseconds */
  durationMs: number;
  /** Mapping of OJS IDs to new Stanford Open Press IDs */
  idMapping: Record<string, Record<number, string>>;
  completedAt: ISODate;
}

/** An error that occurred during migration */
export interface MigrationError {
  entity: string;
  sourceId: number;
  message: string;
  /** Whether migration of this item can be retried */
  retryable: boolean;
}

/** Migration rollback info */
export interface RollbackInfo {
  planId: ID;
  /** IDs of records created during migration, grouped by entity type */
  createdRecords: Record<string, string[]>;
  /** Whether rollback is still possible */
  canRollback: boolean;
  expiresAt: ISODate;
}
