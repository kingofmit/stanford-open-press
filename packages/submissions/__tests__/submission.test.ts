import { describe, it, expect } from "vitest";
import {
  createSubmission,
  addFile,
  getFilesByCategory,
  getLatestManuscript,
  validateForSubmission,
} from "../src/submission";
import { SubmissionStatus, FileCategory } from "../src/types";

function makeBaseOptions() {
  return {
    journalId: "j_1",
    title: "A Novel Approach to Testing",
    abstract: "We present a comprehensive framework for unit testing.",
    authors: [
      { name: "Jane Doe", email: "jane@mit.edu", corresponding: true },
      { name: "John Smith", email: "john@stanford.edu" },
    ],
    submitterId: "user_1",
  };
}

describe("createSubmission", () => {
  it("creates a submission with correct title and abstract", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.title).toBe("A Novel Approach to Testing");
    expect(sub.abstract).toBe("We present a comprehensive framework for unit testing.");
  });

  it("generates a unique id starting with sub_", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.id).toMatch(/^sub_/);
  });

  it("sets status to Draft", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.status).toBe(SubmissionStatus.Draft);
  });

  it("sets currentVersion to 1", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.currentVersion).toBe(1);
  });

  it("assigns author order based on array position", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.authors[0].order).toBe(1);
    expect(sub.authors[1].order).toBe(2);
  });

  it("sets corresponding flag correctly", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.authors[0].corresponding).toBe(true);
    expect(sub.authors[1].corresponding).toBe(false);
  });

  it("starts with empty files array", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.files).toEqual([]);
  });

  it("sets keywords to empty array when not provided", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.keywords).toEqual([]);
  });

  it("passes through keywords when provided", () => {
    const sub = createSubmission({ ...makeBaseOptions(), keywords: ["testing", "typescript"] });
    expect(sub.keywords).toEqual(["testing", "typescript"]);
  });

  it("creates cover letter when provided", () => {
    const sub = createSubmission({ ...makeBaseOptions(), coverLetter: "Dear Editor..." });
    expect(sub.coverLetter).toBeDefined();
    expect(sub.coverLetter!.text).toBe("Dear Editor...");
    expect(sub.coverLetter!.createdAt).toBeTruthy();
  });

  it("sets coverLetter to undefined when not provided", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.coverLetter).toBeUndefined();
  });

  it("passes through metadata fields", () => {
    const sub = createSubmission({
      ...makeBaseOptions(),
      metadata: {
        conflictOfInterest: "None",
        funding: "NSF Grant",
        wordCount: 5000,
      },
    });
    expect(sub.metadata.conflictOfInterest).toBe("None");
    expect(sub.metadata.funding).toBe("NSF Grant");
    expect(sub.metadata.wordCount).toBe(5000);
  });

  it("sets createdAt and updatedAt", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(sub.createdAt).toBeTruthy();
    expect(sub.updatedAt).toBeTruthy();
  });
});

describe("addFile", () => {
  it("adds a file to the submission", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });

    expect(sub.files).toHaveLength(1);
    expect(sub.files[0].filename).toBe("manuscript.pdf");
    expect(sub.files[0].id).toMatch(/^file_/);
    expect(sub.files[0].uploadedAt).toBeTruthy();
  });

  it("sets version to currentVersion for Manuscript files", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });
    expect(sub.files[0].version).toBe(1);
  });

  it("sets version to currentVersion for RevisedManuscript files", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "revised.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.RevisedManuscript,
      uploadedBy: "user_1",
    });
    expect(sub.files[0].version).toBe(1);
  });

  it("sets version to 1 for non-manuscript files", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "figure1.png",
      mimeType: "image/png",
      sizeBytes: 512000,
      category: FileCategory.Figure,
      uploadedBy: "user_1",
    });
    expect(sub.files[0].version).toBe(1);
  });

  it("does not mutate the original submission", () => {
    const sub = createSubmission(makeBaseOptions());
    const updated = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });
    expect(sub.files).toHaveLength(0);
    expect(updated.files).toHaveLength(1);
  });

  it("updates updatedAt timestamp", () => {
    const sub = createSubmission(makeBaseOptions());
    const updated = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });
    expect(updated.updatedAt >= sub.updatedAt).toBe(true);
  });
});

describe("getFilesByCategory", () => {
  it("returns files matching the specified category", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });
    sub = addFile(sub, {
      filename: "figure1.png",
      mimeType: "image/png",
      sizeBytes: 512000,
      category: FileCategory.Figure,
      uploadedBy: "user_1",
    });
    sub = addFile(sub, {
      filename: "figure2.png",
      mimeType: "image/png",
      sizeBytes: 256000,
      category: FileCategory.Figure,
      uploadedBy: "user_1",
    });

    const figures = getFilesByCategory(sub, FileCategory.Figure);
    expect(figures).toHaveLength(2);
    expect(figures.every((f) => f.category === FileCategory.Figure)).toBe(true);
  });

  it("returns empty array when no files match", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(getFilesByCategory(sub, FileCategory.Supplementary)).toEqual([]);
  });
});

describe("getLatestManuscript", () => {
  it("returns the manuscript file", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });

    const latest = getLatestManuscript(sub);
    expect(latest).toBeDefined();
    expect(latest!.filename).toBe("manuscript.pdf");
  });

  it("returns undefined when no manuscript exists", () => {
    const sub = createSubmission(makeBaseOptions());
    expect(getLatestManuscript(sub)).toBeUndefined();
  });

  it("returns the highest-version manuscript", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "v1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });
    // Simulate a revised manuscript with higher version by manually adjusting
    const revisedFile = {
      id: "file_manual",
      filename: "v2.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.RevisedManuscript,
      version: 2,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "user_1",
    };
    sub = { ...sub, files: [...sub.files, revisedFile] };

    const latest = getLatestManuscript(sub);
    expect(latest!.filename).toBe("v2.pdf");
    expect(latest!.version).toBe(2);
  });
});

describe("validateForSubmission", () => {
  it("returns no errors for a valid submission with manuscript", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });

    const errors = validateForSubmission(sub);
    expect(errors).toEqual([]);
  });

  it("catches missing title", () => {
    let sub = createSubmission({ ...makeBaseOptions(), title: "  " });
    sub = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });

    const errors = validateForSubmission(sub);
    expect(errors).toContain("Title is required");
  });

  it("catches missing abstract", () => {
    let sub = createSubmission({ ...makeBaseOptions(), abstract: "" });
    sub = addFile(sub, {
      filename: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.Manuscript,
      uploadedBy: "user_1",
    });

    const errors = validateForSubmission(sub);
    expect(errors).toContain("Abstract is required");
  });

  it("catches missing authors", () => {
    // Need to construct manually since createSubmission requires at least one author in options
    const sub = {
      ...createSubmission(makeBaseOptions()),
      authors: [],
    };
    const errors = validateForSubmission(sub);
    expect(errors).toContain("At least one author is required");
    expect(errors).toContain("A corresponding author must be designated");
  });

  it("catches missing corresponding author", () => {
    const sub = createSubmission({
      ...makeBaseOptions(),
      authors: [
        { name: "Jane Doe", email: "jane@mit.edu", corresponding: false },
      ],
    });
    const errors = validateForSubmission(sub);
    expect(errors).toContain("A corresponding author must be designated");
  });

  it("catches missing manuscript file", () => {
    const sub = createSubmission(makeBaseOptions());
    const errors = validateForSubmission(sub);
    expect(errors).toContain("A manuscript file is required");
  });

  it("accepts RevisedManuscript as a manuscript", () => {
    let sub = createSubmission(makeBaseOptions());
    sub = addFile(sub, {
      filename: "revised.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024000,
      category: FileCategory.RevisedManuscript,
      uploadedBy: "user_1",
    });

    const errors = validateForSubmission(sub);
    expect(errors).not.toContain("A manuscript file is required");
  });

  it("returns multiple errors at once", () => {
    const sub = {
      ...createSubmission(makeBaseOptions()),
      title: "",
      abstract: "",
      authors: [],
      files: [],
    };
    const errors = validateForSubmission(sub);
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});
