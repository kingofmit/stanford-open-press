import { describe, it, expect } from "vitest";
import { createDecision, summarizeReviewDecisions } from "../src/decision";
import { EditorialDecisionType } from "../src/types";

describe("createDecision", () => {
  it("creates a decision with all provided fields", () => {
    const decision = createDecision({
      submissionId: "sub_1",
      editorId: "editor_1",
      decision: EditorialDecisionType.MinorRevision,
      commentsToAuthor: "Please revise section 3.",
      internalNotes: "Solid paper overall.",
      round: 1,
    });

    expect(decision.submissionId).toBe("sub_1");
    expect(decision.editorId).toBe("editor_1");
    expect(decision.decision).toBe(EditorialDecisionType.MinorRevision);
    expect(decision.commentsToAuthor).toBe("Please revise section 3.");
    expect(decision.internalNotes).toBe("Solid paper overall.");
    expect(decision.round).toBe(1);
  });

  it("generates a unique id starting with ed_", () => {
    const d1 = createDecision({
      submissionId: "sub_1",
      editorId: "editor_1",
      decision: EditorialDecisionType.Accept,
      commentsToAuthor: "Accepted.",
      round: 1,
    });
    const d2 = createDecision({
      submissionId: "sub_1",
      editorId: "editor_1",
      decision: EditorialDecisionType.Accept,
      commentsToAuthor: "Accepted.",
      round: 1,
    });

    expect(d1.id).toMatch(/^ed_/);
    expect(d2.id).toMatch(/^ed_/);
    expect(d1.id).not.toBe(d2.id);
  });

  it("sets createdAt to a valid ISO date string", () => {
    const decision = createDecision({
      submissionId: "sub_1",
      editorId: "editor_1",
      decision: EditorialDecisionType.Reject,
      commentsToAuthor: "Rejected.",
      round: 2,
    });

    expect(decision.createdAt).toBeTruthy();
    expect(new Date(decision.createdAt).toISOString()).toBe(decision.createdAt);
  });

  it("allows internalNotes to be undefined", () => {
    const decision = createDecision({
      submissionId: "sub_1",
      editorId: "editor_1",
      decision: EditorialDecisionType.Accept,
      commentsToAuthor: "Great work.",
      round: 1,
    });

    expect(decision.internalNotes).toBeUndefined();
  });
});

describe("summarizeReviewDecisions", () => {
  it("recommends accept when all reviewers accept", () => {
    const result = summarizeReviewDecisions([
      { decision: "accept" },
      { decision: "accept" },
      { decision: "accept" },
    ]);

    expect(result.recommendation).toBe("accept");
    expect(result.breakdown).toEqual({ accept: 3 });
  });

  it("recommends reject when majority rejects", () => {
    const result = summarizeReviewDecisions([
      { decision: "reject" },
      { decision: "reject" },
      { decision: "accept" },
    ]);

    expect(result.recommendation).toBe("reject");
    expect(result.breakdown).toEqual({ reject: 2, accept: 1 });
  });

  it("recommends major-revision when any reviewer says major-revision", () => {
    const result = summarizeReviewDecisions([
      { decision: "accept" },
      { decision: "major-revision" },
      { decision: "accept" },
    ]);

    expect(result.recommendation).toBe("major-revision");
    expect(result.breakdown).toEqual({ accept: 2, "major-revision": 1 });
  });

  it("recommends minor-revision when any reviewer says minor-revision and no major-revision", () => {
    const result = summarizeReviewDecisions([
      { decision: "accept" },
      { decision: "minor-revision" },
      { decision: "accept" },
    ]);

    expect(result.recommendation).toBe("minor-revision");
    expect(result.breakdown).toEqual({ accept: 2, "minor-revision": 1 });
  });

  it("prioritizes reject over major-revision when majority rejects", () => {
    const result = summarizeReviewDecisions([
      { decision: "reject" },
      { decision: "reject" },
      { decision: "major-revision" },
    ]);

    expect(result.recommendation).toBe("reject");
  });

  it("does not recommend reject when less than half reject", () => {
    const result = summarizeReviewDecisions([
      { decision: "reject" },
      { decision: "accept" },
      { decision: "accept" },
    ]);

    // reject is 1 out of 3, which is less than half
    // but major-revision is not present either, nor minor-revision
    // the logic falls through to "accept" since reject < half
    expect(result.recommendation).toBe("accept");
  });

  it("handles a single reviewer", () => {
    const result = summarizeReviewDecisions([{ decision: "accept" }]);
    expect(result.recommendation).toBe("accept");
    expect(result.breakdown).toEqual({ accept: 1 });
  });

  it("handles mixed decisions with major and minor revisions", () => {
    const result = summarizeReviewDecisions([
      { decision: "minor-revision" },
      { decision: "major-revision" },
    ]);

    // major-revision takes priority over minor-revision
    expect(result.recommendation).toBe("major-revision");
    expect(result.breakdown).toEqual({ "minor-revision": 1, "major-revision": 1 });
  });

  it("handles empty array defaulting to accept", () => {
    const result = summarizeReviewDecisions([]);
    expect(result.recommendation).toBe("accept");
    expect(result.breakdown).toEqual({});
  });
});
