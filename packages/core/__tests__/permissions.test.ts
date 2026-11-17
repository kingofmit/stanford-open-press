import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getPermissionsForRole,
  DEFAULT_PERMISSIONS,
} from "../src/permissions";
import { Role, Action, Resource, WorkflowStage } from "../src/types";

describe("hasPermission", () => {
  it("grants EditorInChief permission to create a journal", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.EditorInChief, Action.Create, Resource.Journal),
    ).toBe(true);
  });

  it("grants EditorInChief permission to read submissions", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.EditorInChief, Action.Read, Resource.Submission),
    ).toBe(true);
  });

  it("grants EditorInChief permission to decide on editorials", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.EditorInChief, Action.Decide, Resource.Editorial),
    ).toBe(true);
  });

  it("grants EditorInChief permission to publish issues", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.EditorInChief, Action.Publish, Resource.Issue),
    ).toBe(true);
  });

  it("grants EditorInChief permission to manage users", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.EditorInChief, Action.Create, Resource.User),
    ).toBe(true);
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.EditorInChief, Action.Update, Resource.User),
    ).toBe(true);
  });

  it("denies Author permission to decide", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.Author, Action.Decide, Resource.Editorial),
    ).toBe(false);
  });

  it("denies Author permission to publish", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.Author, Action.Publish, Resource.Issue),
    ).toBe(false);
  });

  it("grants Author permission to create submissions", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.Author, Action.Create, Resource.Submission),
    ).toBe(true);
  });

  it("grants Author permission to read submissions (no stage restriction)", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.Author, Action.Read, Resource.Submission),
    ).toBe(true);
  });

  it("denies Author permission to delete submissions", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.Author, Action.Delete, Resource.Submission),
    ).toBe(false);
  });

  it("grants Author update on submissions during Revision stage", () => {
    expect(
      hasPermission(
        DEFAULT_PERMISSIONS,
        Role.Author,
        Action.Update,
        Resource.Submission,
        WorkflowStage.Revision,
      ),
    ).toBe(true);
  });

  it("denies Author update on submissions during PeerReview stage", () => {
    expect(
      hasPermission(
        DEFAULT_PERMISSIONS,
        Role.Author,
        Action.Update,
        Resource.Submission,
        WorkflowStage.PeerReview,
      ),
    ).toBe(false);
  });

  it("denies Author update on submissions when no stage is specified (stage-scoped permission)", () => {
    expect(
      hasPermission(DEFAULT_PERMISSIONS, Role.Author, Action.Update, Resource.Submission),
    ).toBe(false);
  });

  describe("Reviewer stage-scoped permissions", () => {
    it("grants Reviewer read access to submissions during PeerReview", () => {
      expect(
        hasPermission(
          DEFAULT_PERMISSIONS,
          Role.Reviewer,
          Action.Read,
          Resource.Submission,
          WorkflowStage.PeerReview,
        ),
      ).toBe(true);
    });

    it("denies Reviewer read access to submissions during Copyediting", () => {
      expect(
        hasPermission(
          DEFAULT_PERMISSIONS,
          Role.Reviewer,
          Action.Read,
          Resource.Submission,
          WorkflowStage.Copyediting,
        ),
      ).toBe(false);
    });

    it("denies Reviewer read access to submissions when no stage provided", () => {
      expect(
        hasPermission(DEFAULT_PERMISSIONS, Role.Reviewer, Action.Read, Resource.Submission),
      ).toBe(false);
    });

    it("grants Reviewer permission to create reviews (no stage restriction)", () => {
      expect(
        hasPermission(DEFAULT_PERMISSIONS, Role.Reviewer, Action.Create, Resource.Review),
      ).toBe(true);
    });

    it("grants Reviewer permission to update reviews", () => {
      expect(
        hasPermission(DEFAULT_PERMISSIONS, Role.Reviewer, Action.Update, Resource.Review),
      ).toBe(true);
    });
  });

  describe("Copyeditor stage-scoped permissions", () => {
    it("grants Copyeditor read during Copyediting stage", () => {
      expect(
        hasPermission(
          DEFAULT_PERMISSIONS,
          Role.Copyeditor,
          Action.Read,
          Resource.Submission,
          WorkflowStage.Copyediting,
        ),
      ).toBe(true);
    });

    it("grants Copyeditor update during Copyediting stage", () => {
      expect(
        hasPermission(
          DEFAULT_PERMISSIONS,
          Role.Copyeditor,
          Action.Update,
          Resource.Submission,
          WorkflowStage.Copyediting,
        ),
      ).toBe(true);
    });

    it("denies Copyeditor access during Production stage", () => {
      expect(
        hasPermission(
          DEFAULT_PERMISSIONS,
          Role.Copyeditor,
          Action.Read,
          Resource.Submission,
          WorkflowStage.Production,
        ),
      ).toBe(false);
    });
  });

  describe("Proofreader stage-scoped permissions", () => {
    it("grants Proofreader read during Production stage", () => {
      expect(
        hasPermission(
          DEFAULT_PERMISSIONS,
          Role.Proofreader,
          Action.Read,
          Resource.Submission,
          WorkflowStage.Production,
        ),
      ).toBe(true);
    });

    it("denies Proofreader access during Copyediting stage", () => {
      expect(
        hasPermission(
          DEFAULT_PERMISSIONS,
          Role.Proofreader,
          Action.Read,
          Resource.Submission,
          WorkflowStage.Copyediting,
        ),
      ).toBe(false);
    });
  });

  describe("SectionEditor permissions", () => {
    it("grants SectionEditor permission to assign reviews", () => {
      expect(
        hasPermission(DEFAULT_PERMISSIONS, Role.SectionEditor, Action.Assign, Resource.Review),
      ).toBe(true);
    });

    it("grants SectionEditor permission to decide on editorials", () => {
      expect(
        hasPermission(DEFAULT_PERMISSIONS, Role.SectionEditor, Action.Decide, Resource.Editorial),
      ).toBe(true);
    });

    it("denies SectionEditor permission to publish issues", () => {
      expect(
        hasPermission(DEFAULT_PERMISSIONS, Role.SectionEditor, Action.Publish, Resource.Issue),
      ).toBe(false);
    });
  });

  it("works with custom permission arrays", () => {
    const custom = [
      { role: Role.Author, action: Action.Delete, resource: Resource.Submission },
    ];
    expect(hasPermission(custom, Role.Author, Action.Delete, Resource.Submission)).toBe(true);
    expect(hasPermission(custom, Role.Author, Action.Create, Resource.Submission)).toBe(false);
  });
});

describe("getPermissionsForRole", () => {
  it("returns all EditorInChief permissions", () => {
    const perms = getPermissionsForRole(DEFAULT_PERMISSIONS, Role.EditorInChief);
    expect(perms.length).toBe(11);
    expect(perms.every((p) => p.role === Role.EditorInChief)).toBe(true);
  });

  it("returns all Author permissions", () => {
    const perms = getPermissionsForRole(DEFAULT_PERMISSIONS, Role.Author);
    expect(perms.length).toBe(3);
  });

  it("returns all Reviewer permissions", () => {
    const perms = getPermissionsForRole(DEFAULT_PERMISSIONS, Role.Reviewer);
    expect(perms.length).toBe(3);
  });

  it("returns all Copyeditor permissions", () => {
    const perms = getPermissionsForRole(DEFAULT_PERMISSIONS, Role.Copyeditor);
    expect(perms.length).toBe(2);
  });

  it("returns all Proofreader permissions", () => {
    const perms = getPermissionsForRole(DEFAULT_PERMISSIONS, Role.Proofreader);
    expect(perms.length).toBe(2);
  });

  it("returns all SectionEditor permissions", () => {
    const perms = getPermissionsForRole(DEFAULT_PERMISSIONS, Role.SectionEditor);
    expect(perms.length).toBe(4);
  });

  it("returns empty array for a role with no permissions", () => {
    const perms = getPermissionsForRole([], Role.Author);
    expect(perms).toEqual([]);
  });
});
