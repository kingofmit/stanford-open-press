import type { ID } from "@stanford-press/core";
import type { CopyeditRecord, EditorialNote } from "./types";
import { CopyeditStatus } from "./types";

let counter = 0;

function generateId(): ID {
  return `ce_${Date.now()}_${++counter}`;
}

/**
 * Start a copyediting round for a submission.
 */
export function startCopyediting(submissionId: ID, copyeditorId: ID): CopyeditRecord {
  return {
    id: generateId(),
    submissionId,
    copyeditorId,
    status: CopyeditStatus.Assigned,
    notes: [],
    startedAt: new Date().toISOString(),
  };
}

/**
 * Add an editorial note to a copyedit record.
 */
export function addNote(
  record: CopyeditRecord,
  authorId: ID,
  text: string,
  location?: string,
): CopyeditRecord {
  const note: EditorialNote = {
    id: generateId(),
    authorId,
    text,
    location,
    resolved: false,
    createdAt: new Date().toISOString(),
  };

  return {
    ...record,
    notes: [...record.notes, note],
    status: CopyeditStatus.InProgress,
  };
}

/**
 * Resolve an editorial note.
 */
export function resolveNote(record: CopyeditRecord, noteId: ID): CopyeditRecord {
  return {
    ...record,
    notes: record.notes.map((n) => (n.id === noteId ? { ...n, resolved: true } : n)),
  };
}

/**
 * Send to author for review.
 */
export function sendToAuthor(record: CopyeditRecord): CopyeditRecord {
  if (record.status !== CopyeditStatus.InProgress) {
    throw new Error(`Cannot send to author: copyediting is "${record.status}"`);
  }
  return {
    ...record,
    status: CopyeditStatus.AuthorReview,
  };
}

/**
 * Complete copyediting.
 */
export function completeCopyediting(record: CopyeditRecord, copyeditedFileId: ID): CopyeditRecord {
  const unresolvedNotes = record.notes.filter((n) => !n.resolved);
  if (unresolvedNotes.length > 0) {
    throw new Error(`Cannot complete: ${unresolvedNotes.length} unresolved notes remain`);
  }

  return {
    ...record,
    status: CopyeditStatus.Completed,
    copyeditedFileId,
    completedAt: new Date().toISOString(),
  };
}
