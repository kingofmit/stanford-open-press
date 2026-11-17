import { describe, it, expect } from "vitest";
import {
  startCopyediting,
  addNote,
  resolveNote,
  sendToAuthor,
  completeCopyediting,
} from "../src/copyediting";
import { CopyeditStatus } from "../src/types";

describe("startCopyediting", () => {
  it("creates a copyedit record with correct fields", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");

    expect(record.submissionId).toBe("sub_1");
    expect(record.copyeditorId).toBe("ce_editor_1");
    expect(record.status).toBe(CopyeditStatus.Assigned);
    expect(record.notes).toEqual([]);
    expect(record.startedAt).toBeTruthy();
  });

  it("generates a unique id starting with ce_", () => {
    const r1 = startCopyediting("sub_1", "ce_editor_1");
    const r2 = startCopyediting("sub_2", "ce_editor_1");

    expect(r1.id).toMatch(/^ce_/);
    expect(r2.id).toMatch(/^ce_/);
    expect(r1.id).not.toBe(r2.id);
  });
});

describe("addNote", () => {
  it("adds a note to the record", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const updated = addNote(record, "author_1", "Fix typo on page 3", "p3");

    expect(updated.notes).toHaveLength(1);
    expect(updated.notes[0].authorId).toBe("author_1");
    expect(updated.notes[0].text).toBe("Fix typo on page 3");
    expect(updated.notes[0].location).toBe("p3");
    expect(updated.notes[0].resolved).toBe(false);
  });

  it("changes status to in-progress", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const updated = addNote(record, "author_1", "Note text");

    expect(updated.status).toBe(CopyeditStatus.InProgress);
  });

  it("preserves existing notes when adding new ones", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const withOne = addNote(record, "author_1", "First note");
    const withTwo = addNote(withOne, "author_1", "Second note");

    expect(withTwo.notes).toHaveLength(2);
    expect(withTwo.notes[0].text).toBe("First note");
    expect(withTwo.notes[1].text).toBe("Second note");
  });

  it("allows location to be omitted", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const updated = addNote(record, "author_1", "General note");

    expect(updated.notes[0].location).toBeUndefined();
  });
});

describe("resolveNote", () => {
  it("resolves a note by id", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const withNote = addNote(record, "author_1", "Fix this");
    const noteId = withNote.notes[0].id;

    const resolved = resolveNote(withNote, noteId);

    expect(resolved.notes[0].resolved).toBe(true);
  });

  it("does not modify other notes", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const withNotes = addNote(addNote(record, "a1", "Note 1"), "a2", "Note 2");
    const firstNoteId = withNotes.notes[0].id;

    const resolved = resolveNote(withNotes, firstNoteId);

    expect(resolved.notes[0].resolved).toBe(true);
    expect(resolved.notes[1].resolved).toBe(false);
  });

  it("leaves notes unchanged if noteId does not match", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const withNote = addNote(record, "author_1", "Note");

    const resolved = resolveNote(withNote, "nonexistent_id");

    expect(resolved.notes[0].resolved).toBe(false);
  });
});

describe("sendToAuthor", () => {
  it("changes status to author-review when in-progress", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const inProgress = addNote(record, "author_1", "Note");

    const sent = sendToAuthor(inProgress);

    expect(sent.status).toBe(CopyeditStatus.AuthorReview);
  });

  it("throws when status is not in-progress", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    // record status is "assigned", not "in-progress"

    expect(() => sendToAuthor(record)).toThrow(
      'Cannot send to author: copyediting is "assigned"'
    );
  });
});

describe("completeCopyediting", () => {
  it("sets status to completed and records completedAt", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const withNote = addNote(record, "author_1", "Fix this");
    const resolved = resolveNote(withNote, withNote.notes[0].id);

    const completed = completeCopyediting(resolved, "file_final");

    expect(completed.status).toBe(CopyeditStatus.Completed);
    expect(completed.completedAt).toBeTruthy();
    expect(completed.copyeditedFileId).toBe("file_final");
  });

  it("throws when there are unresolved notes", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const withNote = addNote(record, "author_1", "Unresolved note");

    expect(() => completeCopyediting(withNote, "file_1")).toThrow(
      "Cannot complete: 1 unresolved notes remain"
    );
  });

  it("throws with correct count for multiple unresolved notes", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    const withNotes = addNote(addNote(record, "a1", "Note 1"), "a2", "Note 2");

    expect(() => completeCopyediting(withNotes, "file_1")).toThrow(
      "Cannot complete: 2 unresolved notes remain"
    );
  });

  it("completes when no notes exist", () => {
    const record = startCopyediting("sub_1", "ce_editor_1");
    // No notes — directly complete (status is assigned, notes are empty)
    const completed = completeCopyediting(record, "file_1");

    expect(completed.status).toBe(CopyeditStatus.Completed);
  });
});
