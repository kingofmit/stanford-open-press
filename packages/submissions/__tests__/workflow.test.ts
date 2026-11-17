import { describe, it, expect } from "vitest";
import { SubmissionWorkflow, isValidTransition, VALID_TRANSITIONS } from "../src/workflow";
import { SubmissionStatus } from "../src/types";

describe("isValidTransition", () => {
  it("allows Draft -> Submitted", () => {
    expect(isValidTransition(SubmissionStatus.Draft, SubmissionStatus.Submitted)).toBe(true);
  });

  it("allows Submitted -> UnderReview", () => {
    expect(isValidTransition(SubmissionStatus.Submitted, SubmissionStatus.UnderReview)).toBe(true);
  });

  it("allows Submitted -> Rejected", () => {
    expect(isValidTransition(SubmissionStatus.Submitted, SubmissionStatus.Rejected)).toBe(true);
  });

  it("allows UnderReview -> Revision", () => {
    expect(isValidTransition(SubmissionStatus.UnderReview, SubmissionStatus.Revision)).toBe(true);
  });

  it("allows UnderReview -> Accepted", () => {
    expect(isValidTransition(SubmissionStatus.UnderReview, SubmissionStatus.Accepted)).toBe(true);
  });

  it("allows UnderReview -> Rejected", () => {
    expect(isValidTransition(SubmissionStatus.UnderReview, SubmissionStatus.Rejected)).toBe(true);
  });

  it("allows Revision -> UnderReview", () => {
    expect(isValidTransition(SubmissionStatus.Revision, SubmissionStatus.UnderReview)).toBe(true);
  });

  it("allows Accepted -> Published", () => {
    expect(isValidTransition(SubmissionStatus.Accepted, SubmissionStatus.Published)).toBe(true);
  });

  it("denies Draft -> Published", () => {
    expect(isValidTransition(SubmissionStatus.Draft, SubmissionStatus.Published)).toBe(false);
  });

  it("denies Published -> anything", () => {
    expect(isValidTransition(SubmissionStatus.Published, SubmissionStatus.Draft)).toBe(false);
    expect(isValidTransition(SubmissionStatus.Published, SubmissionStatus.Rejected)).toBe(false);
  });

  it("denies Rejected -> anything", () => {
    expect(isValidTransition(SubmissionStatus.Rejected, SubmissionStatus.Draft)).toBe(false);
    expect(isValidTransition(SubmissionStatus.Rejected, SubmissionStatus.Submitted)).toBe(false);
  });
});

describe("SubmissionWorkflow", () => {
  it("starts in Draft status by default", () => {
    const wf = new SubmissionWorkflow();
    expect(wf.status).toBe(SubmissionStatus.Draft);
  });

  it("accepts a custom initial status", () => {
    const wf = new SubmissionWorkflow(SubmissionStatus.UnderReview);
    expect(wf.status).toBe(SubmissionStatus.UnderReview);
  });

  describe("transitionTo", () => {
    it("transitions from Draft to Submitted", () => {
      const wf = new SubmissionWorkflow();
      const transition = wf.transitionTo(SubmissionStatus.Submitted, "user_1", "Ready");
      expect(wf.status).toBe(SubmissionStatus.Submitted);
      expect(transition.from).toBe(SubmissionStatus.Draft);
      expect(transition.to).toBe(SubmissionStatus.Submitted);
      expect(transition.actorId).toBe("user_1");
      expect(transition.reason).toBe("Ready");
      expect(transition.timestamp).toBeTruthy();
    });

    it("throws for invalid transition", () => {
      const wf = new SubmissionWorkflow();
      expect(() => wf.transitionTo(SubmissionStatus.Published, "user_1")).toThrowError(
        /Invalid transition/,
      );
    });

    it("throws when transitioning from terminal state (Published)", () => {
      const wf = new SubmissionWorkflow(SubmissionStatus.Published);
      expect(() => wf.transitionTo(SubmissionStatus.Draft, "user_1")).toThrowError(
        /Invalid transition/,
      );
    });

    it("throws when transitioning from terminal state (Rejected)", () => {
      const wf = new SubmissionWorkflow(SubmissionStatus.Rejected);
      expect(() => wf.transitionTo(SubmissionStatus.Submitted, "user_1")).toThrowError(
        /Invalid transition/,
      );
    });

    it("supports full happy-path workflow", () => {
      const wf = new SubmissionWorkflow();
      wf.transitionTo(SubmissionStatus.Submitted, "author_1");
      wf.transitionTo(SubmissionStatus.UnderReview, "editor_1");
      wf.transitionTo(SubmissionStatus.Revision, "editor_1", "Minor revisions needed");
      wf.transitionTo(SubmissionStatus.UnderReview, "author_1");
      wf.transitionTo(SubmissionStatus.Accepted, "editor_1");
      wf.transitionTo(SubmissionStatus.Published, "editor_1");

      expect(wf.status).toBe(SubmissionStatus.Published);
      expect(wf.isPublished).toBe(true);
      expect(wf.isTerminal).toBe(true);
    });
  });

  describe("history", () => {
    it("starts with empty history", () => {
      const wf = new SubmissionWorkflow();
      expect(wf.history).toEqual([]);
    });

    it("tracks all transitions", () => {
      const wf = new SubmissionWorkflow();
      wf.transitionTo(SubmissionStatus.Submitted, "user_1");
      wf.transitionTo(SubmissionStatus.UnderReview, "editor_1");

      expect(wf.history).toHaveLength(2);
      expect(wf.history[0].from).toBe(SubmissionStatus.Draft);
      expect(wf.history[0].to).toBe(SubmissionStatus.Submitted);
      expect(wf.history[1].from).toBe(SubmissionStatus.Submitted);
      expect(wf.history[1].to).toBe(SubmissionStatus.UnderReview);
    });

    it("returns a copy, not the internal array", () => {
      const wf = new SubmissionWorkflow();
      wf.transitionTo(SubmissionStatus.Submitted, "user_1");
      const h1 = wf.history;
      const h2 = wf.history;
      expect(h1).not.toBe(h2);
      expect(h1).toEqual(h2);
    });
  });

  describe("nextStatuses", () => {
    it("returns [Submitted] from Draft", () => {
      const wf = new SubmissionWorkflow();
      expect(wf.nextStatuses).toEqual([SubmissionStatus.Submitted]);
    });

    it("returns [UnderReview, Rejected] from Submitted", () => {
      const wf = new SubmissionWorkflow(SubmissionStatus.Submitted);
      expect(wf.nextStatuses).toEqual([SubmissionStatus.UnderReview, SubmissionStatus.Rejected]);
    });

    it("returns empty array from Published", () => {
      const wf = new SubmissionWorkflow(SubmissionStatus.Published);
      expect(wf.nextStatuses).toEqual([]);
    });

    it("returns empty array from Rejected", () => {
      const wf = new SubmissionWorkflow(SubmissionStatus.Rejected);
      expect(wf.nextStatuses).toEqual([]);
    });
  });

  describe("terminal state helpers", () => {
    it("isTerminal is true for Published", () => {
      const wf = new SubmissionWorkflow(SubmissionStatus.Published);
      expect(wf.isTerminal).toBe(true);
    });

    it("isTerminal is true for Rejected", () => {
      const wf = new SubmissionWorkflow(SubmissionStatus.Rejected);
      expect(wf.isTerminal).toBe(true);
    });

    it("isTerminal is false for Draft", () => {
      const wf = new SubmissionWorkflow();
      expect(wf.isTerminal).toBe(false);
    });

    it("isPublished is true only for Published", () => {
      expect(new SubmissionWorkflow(SubmissionStatus.Published).isPublished).toBe(true);
      expect(new SubmissionWorkflow(SubmissionStatus.Rejected).isPublished).toBe(false);
    });

    it("isRejected is true only for Rejected", () => {
      expect(new SubmissionWorkflow(SubmissionStatus.Rejected).isRejected).toBe(true);
      expect(new SubmissionWorkflow(SubmissionStatus.Published).isRejected).toBe(false);
    });
  });

  describe("canTransitionTo", () => {
    it("returns true for valid transitions", () => {
      const wf = new SubmissionWorkflow();
      expect(wf.canTransitionTo(SubmissionStatus.Submitted)).toBe(true);
    });

    it("returns false for invalid transitions", () => {
      const wf = new SubmissionWorkflow();
      expect(wf.canTransitionTo(SubmissionStatus.Published)).toBe(false);
    });
  });
});
