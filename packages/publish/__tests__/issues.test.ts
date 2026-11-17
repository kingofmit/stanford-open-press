import { describe, it, expect } from "vitest";
import {
  createVolume,
  createIssue,
  addArticleToIssue,
  removeArticleFromIssue,
  publishIssue,
} from "../src/issues";

describe("createVolume", () => {
  it("creates a volume with correct number and year", () => {
    const vol = createVolume("j_1", 1, 2024);
    expect(vol.number).toBe(1);
    expect(vol.year).toBe(2024);
    expect(vol.journalId).toBe("j_1");
  });

  it("generates a unique id starting with pub_", () => {
    const vol = createVolume("j_1", 1, 2024);
    expect(vol.id).toMatch(/^pub_/);
  });

  it("includes optional title when provided", () => {
    const vol = createVolume("j_1", 1, 2024, "Special Volume");
    expect(vol.title).toBe("Special Volume");
  });

  it("sets title to undefined when not provided", () => {
    const vol = createVolume("j_1", 1, 2024);
    expect(vol.title).toBeUndefined();
  });
});

describe("createIssue", () => {
  it("creates an issue with correct fields", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    expect(issue.journalId).toBe("j_1");
    expect(issue.volumeId).toBe("vol_1");
    expect(issue.number).toBe(1);
  });

  it("generates a unique id starting with pub_", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    expect(issue.id).toMatch(/^pub_/);
  });

  it("starts with empty articleIds array", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    expect(issue.articleIds).toEqual([]);
  });

  it("includes optional fields when provided", () => {
    const issue = createIssue("j_1", "vol_1", 1, {
      title: "Special Issue",
      description: "A special issue on testing",
      coverImageUrl: "https://example.com/cover.jpg",
    });
    expect(issue.title).toBe("Special Issue");
    expect(issue.description).toBe("A special issue on testing");
    expect(issue.coverImageUrl).toBe("https://example.com/cover.jpg");
  });

  it("sets optional fields to undefined when not provided", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    expect(issue.title).toBeUndefined();
    expect(issue.description).toBeUndefined();
    expect(issue.coverImageUrl).toBeUndefined();
    expect(issue.publishedAt).toBeUndefined();
  });
});

describe("addArticleToIssue", () => {
  it("adds an article id to the issue", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    const updated = addArticleToIssue(issue, "art_1");
    expect(updated.articleIds).toEqual(["art_1"]);
  });

  it("appends to existing articles", () => {
    let issue = createIssue("j_1", "vol_1", 1);
    issue = addArticleToIssue(issue, "art_1");
    issue = addArticleToIssue(issue, "art_2");
    expect(issue.articleIds).toEqual(["art_1", "art_2"]);
  });

  it("throws when adding duplicate article", () => {
    let issue = createIssue("j_1", "vol_1", 1);
    issue = addArticleToIssue(issue, "art_1");
    expect(() => addArticleToIssue(issue, "art_1")).toThrowError(
      'Article "art_1" is already in this issue',
    );
  });

  it("does not mutate the original issue", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    const updated = addArticleToIssue(issue, "art_1");
    expect(issue.articleIds).toEqual([]);
    expect(updated.articleIds).toEqual(["art_1"]);
  });
});

describe("removeArticleFromIssue", () => {
  it("removes an article from the issue", () => {
    let issue = createIssue("j_1", "vol_1", 1);
    issue = addArticleToIssue(issue, "art_1");
    issue = addArticleToIssue(issue, "art_2");
    const updated = removeArticleFromIssue(issue, "art_1");
    expect(updated.articleIds).toEqual(["art_2"]);
  });

  it("returns unchanged issue when removing non-existent article", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    const updated = removeArticleFromIssue(issue, "nonexistent");
    expect(updated.articleIds).toEqual([]);
  });

  it("does not mutate the original issue", () => {
    let issue = createIssue("j_1", "vol_1", 1);
    issue = addArticleToIssue(issue, "art_1");
    const updated = removeArticleFromIssue(issue, "art_1");
    expect(issue.articleIds).toEqual(["art_1"]);
    expect(updated.articleIds).toEqual([]);
  });
});

describe("publishIssue", () => {
  it("sets publishedAt timestamp", () => {
    let issue = createIssue("j_1", "vol_1", 1);
    issue = addArticleToIssue(issue, "art_1");
    const before = new Date().toISOString();
    const published = publishIssue(issue);
    expect(published.publishedAt).toBeTruthy();
    expect(published.publishedAt! >= before).toBe(true);
  });

  it("throws when publishing an empty issue", () => {
    const issue = createIssue("j_1", "vol_1", 1);
    expect(() => publishIssue(issue)).toThrowError("Cannot publish an empty issue");
  });

  it("does not mutate the original issue", () => {
    let issue = createIssue("j_1", "vol_1", 1);
    issue = addArticleToIssue(issue, "art_1");
    const published = publishIssue(issue);
    expect(issue.publishedAt).toBeUndefined();
    expect(published.publishedAt).toBeTruthy();
  });

  it("preserves all other fields", () => {
    let issue = createIssue("j_1", "vol_1", 2, { title: "Special Issue" });
    issue = addArticleToIssue(issue, "art_1");
    const published = publishIssue(issue);
    expect(published.journalId).toBe("j_1");
    expect(published.volumeId).toBe("vol_1");
    expect(published.number).toBe(2);
    expect(published.title).toBe("Special Issue");
    expect(published.articleIds).toEqual(["art_1"]);
  });
});
