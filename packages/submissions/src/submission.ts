import type { ID } from "@stanford-press/core";
import type { Submission, CreateSubmissionOptions, FileAttachment, Author } from "./types";
import { SubmissionStatus, FileCategory } from "./types";

let counter = 0;

function generateId(): ID {
  return `sub_${Date.now()}_${++counter}`;
}

/**
 * Create a new submission in draft status.
 *
 * ```ts
 * const submission = createSubmission({
 *   journalId: "j_123",
 *   title: "A Novel Approach",
 *   abstract: "We present...",
 *   authors: [{ name: "Jane Doe", email: "jane@mit.edu", corresponding: true }],
 *   submitterId: "user_456",
 * });
 * ```
 */
export function createSubmission(options: CreateSubmissionOptions): Submission {
  const now = new Date().toISOString();

  const authors: Author[] = options.authors.map((a, i) => ({
    ...a,
    corresponding: a.corresponding ?? false,
    order: i + 1,
  }));

  const files: FileAttachment[] = [];
  const coverLetter = options.coverLetter
    ? { text: options.coverLetter, createdAt: now }
    : undefined;

  return {
    id: generateId(),
    journalId: options.journalId,
    sectionId: options.sectionId,
    title: options.title,
    abstract: options.abstract,
    keywords: options.keywords ?? [],
    authors,
    files,
    coverLetter,
    status: SubmissionStatus.Draft,
    submitterId: options.submitterId,
    currentVersion: 1,
    metadata: {
      conflictOfInterest: options.metadata?.conflictOfInterest,
      funding: options.metadata?.funding,
      dataAvailability: options.metadata?.dataAvailability,
      ethicsApproval: options.metadata?.ethicsApproval,
      wordCount: options.metadata?.wordCount,
      suggestedReviewers: options.metadata?.suggestedReviewers,
      opposedReviewers: options.metadata?.opposedReviewers,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add a file attachment to a submission.
 */
export function addFile(
  submission: Submission,
  file: Omit<FileAttachment, "id" | "version" | "uploadedAt">,
): Submission {
  const version =
    file.category === FileCategory.Manuscript || file.category === FileCategory.RevisedManuscript
      ? submission.currentVersion
      : 1;

  const attachment: FileAttachment = {
    ...file,
    id: `file_${Date.now()}_${++counter}`,
    version,
    uploadedAt: new Date().toISOString(),
  };

  return {
    ...submission,
    files: [...submission.files, attachment],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get files of a specific category from a submission.
 */
export function getFilesByCategory(submission: Submission, category: FileCategory): FileAttachment[] {
  return submission.files.filter((f) => f.category === category);
}

/**
 * Get the latest manuscript file for a submission.
 */
export function getLatestManuscript(submission: Submission): FileAttachment | undefined {
  const manuscripts = submission.files
    .filter(
      (f) => f.category === FileCategory.Manuscript || f.category === FileCategory.RevisedManuscript,
    )
    .sort((a, b) => b.version - a.version);
  return manuscripts[0];
}

/**
 * Validate that a submission has all required fields for submission.
 */
export function validateForSubmission(submission: Submission): string[] {
  const errors: string[] = [];

  if (!submission.title.trim()) errors.push("Title is required");
  if (!submission.abstract.trim()) errors.push("Abstract is required");
  if (submission.authors.length === 0) errors.push("At least one author is required");
  if (!submission.authors.some((a) => a.corresponding)) {
    errors.push("A corresponding author must be designated");
  }

  const hasManuscript = submission.files.some(
    (f) => f.category === FileCategory.Manuscript || f.category === FileCategory.RevisedManuscript,
  );
  if (!hasManuscript) errors.push("A manuscript file is required");

  return errors;
}
