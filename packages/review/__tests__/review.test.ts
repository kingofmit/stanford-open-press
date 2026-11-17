import { describe, it, expect } from "vitest";
import { createDefaultReviewForm, createReviewForm, calculateWeightedScore } from "../src/review-form";
import { inviteReviewer, isOverdue, updateReviewerMetrics } from "../src/assignment";
import { ReviewType, ReviewAssignmentStatus } from "../src/types";
import type { ReviewAssignment, Reviewer, ReviewCriteria } from "../src/types";

describe("createDefaultReviewForm", () => {
  it("creates a form with 5 criteria", () => {
    const form = createDefaultReviewForm("j_1");
    expect(form.criteria).toHaveLength(5);
  });

  it("includes expected criterion labels", () => {
    const form = createDefaultReviewForm("j_1");
    const labels = form.criteria.map((c) => c.label);
    expect(labels).toContain("Originality & Significance");
    expect(labels).toContain("Scientific Rigor");
    expect(labels).toContain("Clarity of Presentation");
    expect(labels).toContain("Relevance to Journal Scope");
    expect(labels).toContain("References & Literature Review");
  });

  it("sets all criteria as required", () => {
    const form = createDefaultReviewForm("j_1");
    expect(form.criteria.every((c) => c.required)).toBe(true);
  });

  it("sets score range 1-5 for all criteria", () => {
    const form = createDefaultReviewForm("j_1");
    expect(form.criteria.every((c) => c.minScore === 1 && c.maxScore === 5)).toBe(true);
  });

  it("sets includeComments and includeConfidentialComments to true", () => {
    const form = createDefaultReviewForm("j_1");
    expect(form.includeComments).toBe(true);
    expect(form.includeConfidentialComments).toBe(true);
  });

  it("generates unique ids for form and criteria", () => {
    const form = createDefaultReviewForm("j_1");
    expect(form.id).toMatch(/^rf_/);
    const ids = form.criteria.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it("assigns correct weights (Scientific Rigor=3, Originality=2, others=1)", () => {
    const form = createDefaultReviewForm("j_1");
    const rigor = form.criteria.find((c) => c.label === "Scientific Rigor");
    const originality = form.criteria.find((c) => c.label === "Originality & Significance");
    const clarity = form.criteria.find((c) => c.label === "Clarity of Presentation");
    expect(rigor!.weight).toBe(3);
    expect(originality!.weight).toBe(2);
    expect(clarity!.weight).toBe(1);
  });
});

describe("calculateWeightedScore", () => {
  it("returns 0 when no scores are provided", () => {
    const criteria: ReviewCriteria[] = [
      { id: "c1", label: "Test", minScore: 1, maxScore: 5, required: true, weight: 1 },
    ];
    expect(calculateWeightedScore(criteria, [])).toBe(0);
  });

  it("calculates perfect score as 100", () => {
    const criteria: ReviewCriteria[] = [
      { id: "c1", label: "A", minScore: 1, maxScore: 5, required: true, weight: 1 },
      { id: "c2", label: "B", minScore: 1, maxScore: 5, required: true, weight: 1 },
    ];
    const scores = [
      { criterionId: "c1", score: 5 },
      { criterionId: "c2", score: 5 },
    ];
    expect(calculateWeightedScore(criteria, scores)).toBe(100);
  });

  it("calculates minimum score as 0", () => {
    const criteria: ReviewCriteria[] = [
      { id: "c1", label: "A", minScore: 1, maxScore: 5, required: true, weight: 1 },
    ];
    const scores = [{ criterionId: "c1", score: 1 }];
    expect(calculateWeightedScore(criteria, scores)).toBe(0);
  });

  it("calculates midpoint score as 50", () => {
    const criteria: ReviewCriteria[] = [
      { id: "c1", label: "A", minScore: 1, maxScore: 5, required: true, weight: 1 },
    ];
    const scores = [{ criterionId: "c1", score: 3 }];
    expect(calculateWeightedScore(criteria, scores)).toBe(50);
  });

  it("applies weights correctly", () => {
    const criteria: ReviewCriteria[] = [
      { id: "c1", label: "A", minScore: 1, maxScore: 5, required: true, weight: 3 },
      { id: "c2", label: "B", minScore: 1, maxScore: 5, required: true, weight: 1 },
    ];
    // c1 (weight 3): score 5 -> normalized 1.0 -> weighted 3.0
    // c2 (weight 1): score 1 -> normalized 0.0 -> weighted 0.0
    // total weight = 4, weighted sum = 3.0
    // result = (3.0 / 4) * 100 = 75
    const scores = [
      { criterionId: "c1", score: 5 },
      { criterionId: "c2", score: 1 },
    ];
    expect(calculateWeightedScore(criteria, scores)).toBe(75);
  });

  it("ignores scores for unknown criteria", () => {
    const criteria: ReviewCriteria[] = [
      { id: "c1", label: "A", minScore: 1, maxScore: 5, required: true, weight: 1 },
    ];
    const scores = [
      { criterionId: "c1", score: 3 },
      { criterionId: "unknown", score: 5 },
    ];
    expect(calculateWeightedScore(criteria, scores)).toBe(50);
  });

  it("handles partial scores (not all criteria scored)", () => {
    const criteria: ReviewCriteria[] = [
      { id: "c1", label: "A", minScore: 1, maxScore: 5, required: true, weight: 2 },
      { id: "c2", label: "B", minScore: 1, maxScore: 5, required: true, weight: 2 },
    ];
    // Only c1 scored: normalized 1.0 * weight 2 = 2.0, total weight 2
    const scores = [{ criterionId: "c1", score: 5 }];
    expect(calculateWeightedScore(criteria, scores)).toBe(100);
  });
});

describe("inviteReviewer", () => {
  it("creates assignment with Invited status", () => {
    const assignment = inviteReviewer({
      submissionId: "sub_1",
      reviewerId: "rev_1",
      assignedBy: "editor_1",
      reviewType: ReviewType.DoubleBlind,
      formId: "form_1",
    });
    expect(assignment.status).toBe(ReviewAssignmentStatus.Invited);
  });

  it("generates an id starting with ra_", () => {
    const assignment = inviteReviewer({
      submissionId: "sub_1",
      reviewerId: "rev_1",
      assignedBy: "editor_1",
      reviewType: ReviewType.DoubleBlind,
      formId: "form_1",
    });
    expect(assignment.id).toMatch(/^ra_/);
  });

  it("sets default deadline to 21 days from now", () => {
    const before = Date.now();
    const assignment = inviteReviewer({
      submissionId: "sub_1",
      reviewerId: "rev_1",
      assignedBy: "editor_1",
      reviewType: ReviewType.DoubleBlind,
      formId: "form_1",
    });
    const deadlineMs = new Date(assignment.deadline).getTime();
    const expectedMs = before + 21 * 24 * 60 * 60 * 1000;
    // Allow 1 second tolerance
    expect(Math.abs(deadlineMs - expectedMs)).toBeLessThan(1000);
  });

  it("allows custom deadline days", () => {
    const before = Date.now();
    const assignment = inviteReviewer({
      submissionId: "sub_1",
      reviewerId: "rev_1",
      assignedBy: "editor_1",
      reviewType: ReviewType.SingleBlind,
      formId: "form_1",
      deadlineDays: 14,
    });
    const deadlineMs = new Date(assignment.deadline).getTime();
    const expectedMs = before + 14 * 24 * 60 * 60 * 1000;
    expect(Math.abs(deadlineMs - expectedMs)).toBeLessThan(1000);
  });

  it("stores all provided fields", () => {
    const assignment = inviteReviewer({
      submissionId: "sub_1",
      reviewerId: "rev_1",
      assignedBy: "editor_1",
      reviewType: ReviewType.Open,
      formId: "form_1",
    });
    expect(assignment.submissionId).toBe("sub_1");
    expect(assignment.reviewerId).toBe("rev_1");
    expect(assignment.assignedBy).toBe("editor_1");
    expect(assignment.reviewType).toBe(ReviewType.Open);
    expect(assignment.formId).toBe("form_1");
    expect(assignment.invitedAt).toBeTruthy();
  });
});

describe("isOverdue", () => {
  function makeAssignment(overrides: Partial<ReviewAssignment> = {}): ReviewAssignment {
    return {
      id: "ra_1",
      submissionId: "sub_1",
      reviewerId: "rev_1",
      assignedBy: "editor_1",
      reviewType: ReviewType.DoubleBlind,
      formId: "form_1",
      status: ReviewAssignmentStatus.Invited,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it("returns false when deadline is in the future", () => {
    const assignment = makeAssignment({
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(isOverdue(assignment)).toBe(false);
  });

  it("returns true when deadline has passed for Invited status", () => {
    const assignment = makeAssignment({
      deadline: new Date(Date.now() - 1000).toISOString(),
      status: ReviewAssignmentStatus.Invited,
    });
    expect(isOverdue(assignment)).toBe(true);
  });

  it("returns true when deadline has passed for Accepted status", () => {
    const assignment = makeAssignment({
      deadline: new Date(Date.now() - 1000).toISOString(),
      status: ReviewAssignmentStatus.Accepted,
    });
    expect(isOverdue(assignment)).toBe(true);
  });

  it("returns false for Completed assignments even if past deadline", () => {
    const assignment = makeAssignment({
      deadline: new Date(Date.now() - 1000).toISOString(),
      status: ReviewAssignmentStatus.Completed,
    });
    expect(isOverdue(assignment)).toBe(false);
  });

  it("returns false for Declined assignments even if past deadline", () => {
    const assignment = makeAssignment({
      deadline: new Date(Date.now() - 1000).toISOString(),
      status: ReviewAssignmentStatus.Declined,
    });
    expect(isOverdue(assignment)).toBe(false);
  });

  it("returns false for Cancelled assignments even if past deadline", () => {
    const assignment = makeAssignment({
      deadline: new Date(Date.now() - 1000).toISOString(),
      status: ReviewAssignmentStatus.Cancelled,
    });
    expect(isOverdue(assignment)).toBe(false);
  });
});

describe("updateReviewerMetrics", () => {
  function makeReviewer(overrides: Partial<Reviewer> = {}): Reviewer {
    return {
      userId: "rev_1",
      expertiseAreas: ["machine learning"],
      avgResponseDays: 14,
      qualityScore: 80,
      totalCompleted: 10,
      totalDeclined: 2,
      available: true,
      ...overrides,
    };
  }

  it("increments totalCompleted", () => {
    const reviewer = makeReviewer({ totalCompleted: 10 });
    const updated = updateReviewerMetrics(reviewer, 7);
    expect(updated.totalCompleted).toBe(11);
  });

  it("calculates new average response days", () => {
    const reviewer = makeReviewer({ avgResponseDays: 14, totalCompleted: 10 });
    const updated = updateReviewerMetrics(reviewer, 7);
    // (14 * 10 + 7) / 11 = 147/11 = 13.363... rounded to 13.4
    expect(updated.avgResponseDays).toBe(13.4);
  });

  it("updates quality score when editor rating provided", () => {
    const reviewer = makeReviewer({ qualityScore: 80, totalCompleted: 10 });
    const updated = updateReviewerMetrics(reviewer, 7, 90);
    // (80 * 10 + 90) / 11 = 890 / 11 = 80.909... rounded to 80.9
    expect(updated.qualityScore).toBe(80.9);
  });

  it("keeps quality score unchanged when no editor rating", () => {
    const reviewer = makeReviewer({ qualityScore: 80, totalCompleted: 10 });
    const updated = updateReviewerMetrics(reviewer, 7);
    // (80 * 10 + <not provided so unchanged>) -> same rolling formula but no new rating
    // The function recalculates: (80 * 10) / 11 = 72.7... wait let me re-read the code
    // If editorQualityRating is undefined, newQuality stays as reviewer.qualityScore
    expect(updated.qualityScore).toBe(80);
  });

  it("sets lastReviewDate to current time", () => {
    const reviewer = makeReviewer();
    const before = new Date().toISOString();
    const updated = updateReviewerMetrics(reviewer, 7);
    expect(updated.lastReviewDate).toBeTruthy();
    expect(updated.lastReviewDate! >= before).toBe(true);
  });

  it("does not mutate the original reviewer", () => {
    const reviewer = makeReviewer();
    const updated = updateReviewerMetrics(reviewer, 7);
    expect(reviewer.totalCompleted).toBe(10);
    expect(updated.totalCompleted).toBe(11);
    expect(updated).not.toBe(reviewer);
  });

  it("handles first review (totalCompleted = 0)", () => {
    const reviewer = makeReviewer({ totalCompleted: 0, avgResponseDays: 0, qualityScore: 0 });
    const updated = updateReviewerMetrics(reviewer, 21, 85);
    expect(updated.totalCompleted).toBe(1);
    expect(updated.avgResponseDays).toBe(21);
    expect(updated.qualityScore).toBe(85);
  });
});
