import { describe, it, expect } from "vitest";
import {
  matchReviewers,
  cosineSimilarity,
  keywordOverlap,
  detectConflicts,
} from "../src/reviewer-matching";
import type { ExpertiseProfile } from "../src/types";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("throws for vectors of different lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrowError(
      "Vectors must have the same length",
    );
  });

  it("computes known similarity correctly", () => {
    // cos([1,0,1], [0,1,1]) = 1 / (sqrt(2) * sqrt(2)) = 0.5
    expect(cosineSimilarity([1, 0, 1], [0, 1, 1])).toBeCloseTo(0.5);
  });

  it("handles single-element vectors", () => {
    expect(cosineSimilarity([3], [3])).toBeCloseTo(1);
    expect(cosineSimilarity([3], [-3])).toBeCloseTo(-1);
  });
});

describe("keywordOverlap", () => {
  it("returns 100 for identical keyword sets", () => {
    expect(keywordOverlap(["ai", "ml"], ["ai", "ml"])).toBe(100);
  });

  it("returns 0 for completely disjoint sets", () => {
    expect(keywordOverlap(["ai", "ml"], ["biology", "chemistry"])).toBe(0);
  });

  it("returns 0 for two empty sets", () => {
    expect(keywordOverlap([], [])).toBe(0);
  });

  it("computes Jaccard index correctly", () => {
    // intersection = {ai}, union = {ai, ml, nlp} -> 1/3 = 33%
    expect(keywordOverlap(["ai", "ml"], ["ai", "nlp"])).toBe(33);
  });

  it("is case-insensitive", () => {
    expect(keywordOverlap(["AI", "ML"], ["ai", "ml"])).toBe(100);
  });

  it("handles one empty set", () => {
    expect(keywordOverlap(["ai"], [])).toBe(0);
  });

  it("handles duplicates within a set", () => {
    // Set deduplication: {ai, ml} vs {ai, ml} -> 100
    expect(keywordOverlap(["ai", "ai", "ml"], ["ai", "ml"])).toBe(100);
  });
});

describe("matchReviewers", () => {
  const reviewers: ExpertiseProfile[] = [
    {
      reviewerId: "rev_1",
      areas: ["machine learning", "NLP"],
      reviewKeywords: ["deep learning", "transformers"],
      embedding: [1, 0, 0],
    },
    {
      reviewerId: "rev_2",
      areas: ["biology", "genomics"],
      reviewKeywords: ["CRISPR", "gene editing"],
      embedding: [0, 1, 0],
    },
    {
      reviewerId: "rev_3",
      areas: ["machine learning", "computer vision"],
      reviewKeywords: ["CNN", "image recognition"],
      embedding: [0.9, 0.1, 0],
    },
  ];

  it("ranks reviewers by expertise overlap", () => {
    const matches = matchReviewers(
      { keywords: ["machine learning", "deep learning"], embedding: [1, 0, 0] },
      reviewers,
      { minScore: 0 },
    );

    // rev_1 should be top (exact keyword match + embedding match)
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].reviewerId).toBe("rev_1");
  });

  it("filters out reviewers below minScore", () => {
    const matches = matchReviewers(
      { keywords: ["machine learning"], embedding: [1, 0, 0] },
      reviewers,
      { minScore: 80 },
    );

    // Only very high matches should remain
    for (const m of matches) {
      expect(m.score).toBeGreaterThanOrEqual(80);
    }
  });

  it("excludes specified reviewer ids", () => {
    const matches = matchReviewers(
      { keywords: ["machine learning"], embedding: [1, 0, 0] },
      reviewers,
      { excludeIds: ["rev_1"], minScore: 0 },
    );

    expect(matches.find((m) => m.reviewerId === "rev_1")).toBeUndefined();
  });

  it("respects maxResults", () => {
    const matches = matchReviewers(
      { keywords: ["machine learning"], embedding: [1, 0, 0] },
      reviewers,
      { maxResults: 1, minScore: 0 },
    );

    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("returns matches sorted by score descending", () => {
    const matches = matchReviewers(
      { keywords: ["machine learning", "deep learning"] },
      reviewers,
      { minScore: 0 },
    );

    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it("doubles keyword weight when no embeddings provided", () => {
    const noEmbeddingReviewers: ExpertiseProfile[] = [
      {
        reviewerId: "rev_a",
        areas: ["machine learning"],
        reviewKeywords: ["deep learning"],
      },
    ];
    const matches = matchReviewers(
      { keywords: ["machine learning", "deep learning"] },
      noEmbeddingReviewers,
      { minScore: 0 },
    );

    expect(matches.length).toBe(1);
    // Without embeddings, keyword overlap is weighted at 100% (0.4 + 0.6)
    expect(matches[0].score).toBeGreaterThan(0);
  });

  it("includes matching areas in results", () => {
    const matches = matchReviewers(
      { keywords: ["machine learning"] },
      reviewers,
      { minScore: 0 },
    );

    const rev1Match = matches.find((m) => m.reviewerId === "rev_1");
    expect(rev1Match?.matchingAreas).toContain("machine learning");
  });

  it("returns empty array when no reviewers match", () => {
    const matches = matchReviewers(
      { keywords: ["quantum physics"] },
      reviewers,
      { minScore: 50 },
    );
    expect(matches).toEqual([]);
  });
});

describe("detectConflicts", () => {
  it("detects same institution", () => {
    const conflicts = detectConflicts(
      ["Stanford University"],
      ["author@stanford.edu"],
      "Stanford University",
      "reviewer@mit.edu",
    );
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain("Same institution");
  });

  it("detects partial institution match", () => {
    const conflicts = detectConflicts(
      ["MIT"],
      [],
      "MIT Computer Science Department",
    );
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain("Same institution");
  });

  it("detects same email domain", () => {
    const conflicts = detectConflicts(
      [],
      ["author@stanford.edu"],
      undefined,
      "reviewer@stanford.edu",
    );
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]).toContain("Same email domain");
    expect(conflicts[0]).toContain("stanford.edu");
  });

  it("returns empty when no conflicts", () => {
    const conflicts = detectConflicts(
      ["MIT"],
      ["author@mit.edu"],
      "Stanford University",
      "reviewer@stanford.edu",
    );
    expect(conflicts).toEqual([]);
  });

  it("handles missing reviewer affiliation", () => {
    const conflicts = detectConflicts(
      ["MIT"],
      ["author@mit.edu"],
      undefined,
      "reviewer@stanford.edu",
    );
    // No institution conflict, but also no domain conflict
    expect(conflicts).toEqual([]);
  });

  it("handles missing reviewer email", () => {
    const conflicts = detectConflicts(
      ["MIT"],
      ["author@mit.edu"],
      "Stanford University",
      undefined,
    );
    expect(conflicts).toEqual([]);
  });

  it("is case-insensitive for institutions", () => {
    const conflicts = detectConflicts(
      ["stanford university"],
      [],
      "Stanford University",
    );
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("is case-insensitive for email domains", () => {
    const conflicts = detectConflicts(
      [],
      ["user@MIT.EDU"],
      undefined,
      "reviewer@mit.edu",
    );
    expect(conflicts.length).toBe(1);
  });

  it("detects multiple conflicts", () => {
    const conflicts = detectConflicts(
      ["Stanford University"],
      ["author@stanford.edu"],
      "Stanford University",
      "reviewer@stanford.edu",
    );
    expect(conflicts.length).toBe(2);
  });
});
