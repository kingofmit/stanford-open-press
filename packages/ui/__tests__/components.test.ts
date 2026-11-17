import { describe, it, expect } from "vitest";
import {
  formatAuthorList,
  truncateAbstract,
  groupByStatus,
  getPagination,
  validateWizardStep,
  DEFAULT_WIZARD_STEPS,
  DEFAULT_THEME,
} from "../src/components";

describe("formatAuthorList", () => {
  it("returns empty string for no authors", () => {
    expect(formatAuthorList([])).toBe("");
  });

  it("returns the name for a single author", () => {
    expect(formatAuthorList([{ name: "Jane Doe" }])).toBe("Jane Doe");
  });

  it("joins two authors with 'and'", () => {
    expect(
      formatAuthorList([{ name: "Jane Doe" }, { name: "John Smith" }])
    ).toBe("Jane Doe and John Smith");
  });

  it("uses Oxford comma for 3+ authors", () => {
    expect(
      formatAuthorList([
        { name: "Jane Doe" },
        { name: "John Smith" },
        { name: "Alice Johnson" },
      ])
    ).toBe("Jane Doe, John Smith, and Alice Johnson");
  });

  it("handles 4 authors correctly", () => {
    expect(
      formatAuthorList([
        { name: "A" },
        { name: "B" },
        { name: "C" },
        { name: "D" },
      ])
    ).toBe("A, B, C, and D");
  });
});

describe("truncateAbstract", () => {
  it("returns short text unchanged", () => {
    const text = "A short abstract.";
    expect(truncateAbstract(text)).toBe(text);
  });

  it("returns text unchanged when equal to max length", () => {
    const text = "a".repeat(200);
    expect(truncateAbstract(text)).toBe(text);
  });

  it("truncates long text at word boundary with ellipsis", () => {
    const text = "word ".repeat(50); // 250 chars
    const result = truncateAbstract(text, 200);

    expect(result.length).toBeLessThanOrEqual(203); // 200 + "..."
    expect(result.endsWith("...")).toBe(true);
    // Should not cut in the middle of a word
    expect(result.slice(0, -3).endsWith("wor")).toBe(false);
  });

  it("respects custom max length", () => {
    const text = "This is a test of truncation functionality.";
    const result = truncateAbstract(text, 10);

    expect(result).toBe("This is a...");
  });
});

describe("groupByStatus", () => {
  it("groups items by their status field", () => {
    const items = [
      { id: 1, status: "submitted" },
      { id: 2, status: "under-review" },
      { id: 3, status: "submitted" },
      { id: 4, status: "published" },
    ];

    const grouped = groupByStatus(items);

    expect(grouped["submitted"]).toHaveLength(2);
    expect(grouped["under-review"]).toHaveLength(1);
    expect(grouped["published"]).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupByStatus([])).toEqual({});
  });

  it("handles single item", () => {
    const grouped = groupByStatus([{ status: "draft" }]);
    expect(grouped["draft"]).toHaveLength(1);
  });
});

describe("getPagination", () => {
  it("calculates total pages correctly", () => {
    const p = getPagination(100, 1, 10);
    expect(p.totalPages).toBe(10);
  });

  it("rounds up for partial pages", () => {
    const p = getPagination(101, 1, 10);
    expect(p.totalPages).toBe(11);
  });

  it("returns hasNext true when not on last page", () => {
    const p = getPagination(50, 1, 10);
    expect(p.hasNext).toBe(true);
  });

  it("returns hasNext false on last page", () => {
    const p = getPagination(50, 5, 10);
    expect(p.hasNext).toBe(false);
  });

  it("returns hasPrev false on first page", () => {
    const p = getPagination(50, 1, 10);
    expect(p.hasPrev).toBe(false);
  });

  it("returns hasPrev true on page 2", () => {
    const p = getPagination(50, 2, 10);
    expect(p.hasPrev).toBe(true);
  });

  it("calculates correct start and end indices", () => {
    const p = getPagination(50, 2, 10);
    expect(p.startIndex).toBe(10);
    expect(p.endIndex).toBe(20);
  });

  it("clamps endIndex to totalResults on last page", () => {
    const p = getPagination(25, 3, 10);
    expect(p.startIndex).toBe(20);
    expect(p.endIndex).toBe(25);
  });

  it("handles zero results", () => {
    const p = getPagination(0, 1, 10);
    expect(p.totalPages).toBe(0);
    expect(p.hasNext).toBe(false);
  });
});

describe("validateWizardStep", () => {
  describe("metadata step", () => {
    it("returns errors for all missing fields", () => {
      const errors = validateWizardStep("metadata", {});
      expect(errors).toContain("Title is required");
      expect(errors).toContain("Abstract is required");
      expect(errors).toContain("At least one keyword is required");
      expect(errors).toContain("Please select a journal section");
    });

    it("returns no errors when all fields are present", () => {
      const errors = validateWizardStep("metadata", {
        title: "My Paper",
        abstract: "An abstract.",
        keywords: ["science"],
        sectionId: "sec_1",
      });
      expect(errors).toHaveLength(0);
    });

    it("rejects blank title", () => {
      const errors = validateWizardStep("metadata", {
        title: "   ",
        abstract: "Abstract",
        keywords: ["k"],
        sectionId: "s",
      });
      expect(errors).toContain("Title is required");
    });

    it("rejects empty keywords array", () => {
      const errors = validateWizardStep("metadata", {
        title: "Title",
        abstract: "Abstract",
        keywords: [],
        sectionId: "s",
      });
      expect(errors).toContain("At least one keyword is required");
    });
  });

  describe("authors step", () => {
    it("returns error when no authors provided", () => {
      const errors = validateWizardStep("authors", {});
      expect(errors).toContain("At least one author is required");
    });

    it("returns error when no corresponding author", () => {
      const errors = validateWizardStep("authors", {
        authors: [
          { name: "Jane", email: "jane@example.com", corresponding: false },
        ],
      });
      expect(errors).toContain("A corresponding author must be designated");
    });

    it("returns error for missing author name", () => {
      const errors = validateWizardStep("authors", {
        authors: [
          { name: "", email: "jane@example.com", corresponding: true },
        ],
      });
      expect(errors).toContain("Author 1: name is required");
    });

    it("returns error for missing author email", () => {
      const errors = validateWizardStep("authors", {
        authors: [
          { name: "Jane", email: "", corresponding: true },
        ],
      });
      expect(errors).toContain("Author 1: email is required");
    });

    it("returns no errors for valid author", () => {
      const errors = validateWizardStep("authors", {
        authors: [
          { name: "Jane Doe", email: "jane@example.com", corresponding: true },
        ],
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe("files step", () => {
    it("returns error when no files", () => {
      const errors = validateWizardStep("files", {});
      expect(errors).toContain("A manuscript file is required");
    });

    it("returns error for empty files array", () => {
      const errors = validateWizardStep("files", { files: [] });
      expect(errors).toContain("A manuscript file is required");
    });

    it("returns no errors when files are present", () => {
      const errors = validateWizardStep("files", {
        files: [{ name: "manuscript.pdf" }],
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe("optional steps", () => {
    it("cover-letter returns no errors", () => {
      expect(validateWizardStep("cover-letter", {})).toHaveLength(0);
    });

    it("disclosures returns no errors", () => {
      expect(validateWizardStep("disclosures", {})).toHaveLength(0);
    });

    it("review returns no errors", () => {
      expect(validateWizardStep("review", {})).toHaveLength(0);
    });
  });
});

describe("DEFAULT_WIZARD_STEPS", () => {
  it("has 6 steps", () => {
    expect(DEFAULT_WIZARD_STEPS).toHaveLength(6);
  });

  it("starts with metadata and ends with review", () => {
    expect(DEFAULT_WIZARD_STEPS[0].id).toBe("metadata");
    expect(DEFAULT_WIZARD_STEPS[5].id).toBe("review");
  });

  it("each step has an id and title", () => {
    for (const step of DEFAULT_WIZARD_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
    }
  });
});

describe("DEFAULT_THEME", () => {
  it("has a primary color", () => {
    expect(DEFAULT_THEME.primaryColor).toBe("#1a1a2e");
  });

  it("has an accent color", () => {
    expect(DEFAULT_THEME.accentColor).toBe("#e94560");
  });

  it("has heading and body fonts", () => {
    expect(DEFAULT_THEME.headingFont).toBeTruthy();
    expect(DEFAULT_THEME.bodyFont).toBeTruthy();
  });

  it("has darkMode set to false", () => {
    expect(DEFAULT_THEME.darkMode).toBe(false);
  });
});
