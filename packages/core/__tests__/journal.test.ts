import { describe, it, expect, beforeEach } from "vitest";
import { createJournal, JournalRegistry } from "../src/journal";
import type { Journal } from "../src/types";

describe("createJournal", () => {
  it("creates a journal with correct name and slug", () => {
    const journal = createJournal({ name: "Journal of Open Science", slug: "jos" });
    expect(journal.name).toBe("Journal of Open Science");
    expect(journal.slug).toBe("jos");
  });

  it("generates a unique id starting with sp_", () => {
    const journal = createJournal({ name: "Test", slug: "test" });
    expect(journal.id).toMatch(/^sp_/);
  });

  it("sets defaultReviewType to double-blind by default", () => {
    const journal = createJournal({ name: "Test", slug: "test" });
    expect(journal.defaultReviewType).toBe("double-blind");
  });

  it("allows overriding defaultReviewType", () => {
    const journal = createJournal({ name: "Test", slug: "test", defaultReviewType: "open" });
    expect(journal.defaultReviewType).toBe("open");
  });

  it("creates sections from string array", () => {
    const journal = createJournal({
      name: "Test",
      slug: "test",
      sections: ["Research Articles", "Reviews"],
    });
    expect(journal.sections).toHaveLength(2);
    expect(journal.sections[0].name).toBe("Research Articles");
    expect(journal.sections[1].name).toBe("Reviews");
    expect(journal.sections[0].active).toBe(true);
    expect(journal.sections[0].id).toMatch(/^sp_/);
  });

  it("sets empty sections array when none provided", () => {
    const journal = createJournal({ name: "Test", slug: "test" });
    expect(journal.sections).toEqual([]);
  });

  it("sets createdAt and updatedAt to ISO date strings", () => {
    const before = new Date().toISOString();
    const journal = createJournal({ name: "Test", slug: "test" });
    const after = new Date().toISOString();
    expect(journal.createdAt >= before).toBe(true);
    expect(journal.createdAt <= after).toBe(true);
    expect(journal.createdAt).toBe(journal.updatedAt);
  });

  it("passes through optional fields", () => {
    const journal = createJournal({
      name: "Test",
      slug: "test",
      abbreviation: "TST",
      issn: "1234-5678",
      eissn: "8765-4321",
      doiPrefix: "10.1234",
      description: "A test journal",
    });
    expect(journal.abbreviation).toBe("TST");
    expect(journal.issn).toBe("1234-5678");
    expect(journal.eissn).toBe("8765-4321");
    expect(journal.doiPrefix).toBe("10.1234");
    expect(journal.description).toBe("A test journal");
  });

  it("leaves optional fields undefined when not provided", () => {
    const journal = createJournal({ name: "Test", slug: "test" });
    expect(journal.abbreviation).toBeUndefined();
    expect(journal.issn).toBeUndefined();
    expect(journal.description).toBeUndefined();
  });
});

describe("JournalRegistry", () => {
  let registry: JournalRegistry;
  let journal1: Journal;
  let journal2: Journal;

  beforeEach(() => {
    registry = new JournalRegistry();
    journal1 = createJournal({ name: "Journal One", slug: "one" });
    journal2 = createJournal({ name: "Journal Two", slug: "two" });
  });

  it("starts with size 0", () => {
    expect(registry.size).toBe(0);
  });

  it("registers a journal and increases size", () => {
    registry.register(journal1);
    expect(registry.size).toBe(1);
  });

  it("gets a journal by id", () => {
    registry.register(journal1);
    const found = registry.get(journal1.id);
    expect(found).toBe(journal1);
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("gets a journal by slug", () => {
    registry.register(journal1);
    registry.register(journal2);
    const found = registry.getBySlug("two");
    expect(found).toBe(journal2);
  });

  it("returns undefined for unknown slug", () => {
    registry.register(journal1);
    expect(registry.getBySlug("nonexistent")).toBeUndefined();
  });

  it("lists all registered journals", () => {
    registry.register(journal1);
    registry.register(journal2);
    const all = registry.list();
    expect(all).toHaveLength(2);
    expect(all).toContain(journal1);
    expect(all).toContain(journal2);
  });

  it("returns empty array when no journals registered", () => {
    expect(registry.list()).toEqual([]);
  });

  it("removes a journal by id and returns true", () => {
    registry.register(journal1);
    const removed = registry.remove(journal1.id);
    expect(removed).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.get(journal1.id)).toBeUndefined();
  });

  it("returns false when removing nonexistent id", () => {
    expect(registry.remove("nonexistent")).toBe(false);
  });

  it("throws when registering a duplicate id", () => {
    registry.register(journal1);
    expect(() => registry.register(journal1)).toThrowError(
      `Journal with id "${journal1.id}" already registered`,
    );
  });

  it("supports registering after removal of same journal", () => {
    registry.register(journal1);
    registry.remove(journal1.id);
    expect(() => registry.register(journal1)).not.toThrow();
    expect(registry.size).toBe(1);
  });
});
