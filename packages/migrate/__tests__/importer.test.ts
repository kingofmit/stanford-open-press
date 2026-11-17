import { describe, it, expect } from "vitest";
import { OJSImporter } from "../src/importer";
import type { OJSJournal, OJSSubmission, OJSUser, OJSIssue, OJSReviewAssignment } from "../src/types";

describe("OJSImporter", () => {
  const config = {
    source: {
      host: "localhost",
      port: 3306,
      database: "ojs",
      user: "ojs_user",
      password: "secret",
    },
  };

  it("can be constructed with a database config", () => {
    const importer = new OJSImporter(config);
    expect(importer).toBeInstanceOf(OJSImporter);
  });

  it("has an analyze method that returns a migration plan", async () => {
    const importer = new OJSImporter(config);
    const plan = await importer.analyze();

    expect(plan.id).toMatch(/^mig_/);
    expect(plan.sourceConfig.host).toBe("localhost");
    expect(plan.sourceConfig.database).toBe("ojs");
    expect(plan.sourceConfig.user).toBe("ojs_user");
    // Password should not be in the plan config
    expect((plan.sourceConfig as any).password).toBeUndefined();
    expect(plan.createdAt).toBeTruthy();
  });

  it("has an execute method that returns a migration report", async () => {
    const importer = new OJSImporter(config);
    const plan = await importer.analyze();
    const report = await importer.execute(plan);

    expect(report.planId).toBe(plan.id);
    expect(report.completedAt).toBeTruthy();
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.errors).toEqual([]);
  });

  describe("migrateJournals", () => {
    it("maps OJS journals and assigns ids", () => {
      const importer = new OJSImporter(config);
      const ojsJournals: OJSJournal[] = [
        {
          journalId: 1,
          path: "test-journal",
          primaryLocale: "en",
          name: "Test Journal",
          settings: {},
        },
      ];

      const result = importer.migrateJournals(ojsJournals);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Journal");
      expect(result[0].slug).toBe("test-journal");
      expect(result[0].id).toMatch(/^mig_/);
    });
  });

  describe("migrateSubmissions", () => {
    it("maps OJS submissions and assigns ids", () => {
      const importer = new OJSImporter(config);
      const ojsSubmissions: OJSSubmission[] = [
        {
          submissionId: 42,
          journalId: 1,
          title: "A Paper",
          status: 1,
          locale: "en",
          authors: [
            {
              authorId: 1,
              firstName: "Jane",
              lastName: "Doe",
              email: "jane@example.com",
              primaryContact: true,
              seq: 1,
            },
          ],
        },
      ];

      const result = importer.migrateSubmissions(ojsSubmissions);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("A Paper");
      expect(result[0].status).toBe("submitted");
      expect(result[0].id).toMatch(/^mig_/);
    });
  });

  describe("migrateUsers", () => {
    it("maps OJS users and assigns ids", () => {
      const importer = new OJSImporter(config);
      const ojsUsers: OJSUser[] = [
        {
          userId: 1,
          username: "jdoe",
          email: "jane@example.com",
          firstName: "Jane",
          lastName: "Doe",
          roles: [0x00010000],
        },
      ];

      const result = importer.migrateUsers(ojsUsers);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Jane Doe");
      expect(result[0].roles).toContain("author");
      expect(result[0].id).toMatch(/^mig_/);
    });
  });

  describe("migrateIssues", () => {
    it("maps OJS issues and assigns ids", () => {
      const importer = new OJSImporter(config);
      const ojsIssues: OJSIssue[] = [
        {
          issueId: 1,
          journalId: 1,
          volume: 1,
          number: 1,
          year: 2024,
          published: true,
          datePublished: "2024-01-01",
        },
      ];

      const result = importer.migrateIssues(ojsIssues);

      expect(result).toHaveLength(1);
      expect(result[0].volume).toBe(1);
      expect(result[0].year).toBe(2024);
      expect(result[0].id).toMatch(/^mig_/);
    });
  });

  describe("migrateReviews", () => {
    it("maps OJS review assignments and assigns ids", () => {
      const importer = new OJSImporter(config);
      const ojsReviews: OJSReviewAssignment[] = [
        {
          reviewId: 1,
          submissionId: 42,
          reviewerId: 10,
          recommendation: 1,
          dateCompleted: "2024-03-15",
          comments: "Good paper.",
        },
      ];

      const result = importer.migrateReviews(ojsReviews);

      expect(result).toHaveLength(1);
      expect(result[0].decision).toBe("accept");
      expect(result[0].id).toMatch(/^mig_/);
    });
  });

  describe("rollback", () => {
    it("creates rollback info after execute", async () => {
      const importer = new OJSImporter(config);
      const plan = await importer.analyze();
      await importer.execute(plan);

      const rollbackInfo = importer.getRollbackInfo(plan.id);
      expect(rollbackInfo).toBeDefined();
      expect(rollbackInfo!.planId).toBe(plan.id);
      expect(rollbackInfo!.canRollback).toBe(true);
    });

    it("performs rollback successfully", async () => {
      const importer = new OJSImporter(config);
      const plan = await importer.analyze();
      await importer.execute(plan);

      const result = await importer.rollback(plan.id);
      expect(result.success).toBe(true);
    });

    it("throws when no rollback data exists", async () => {
      const importer = new OJSImporter(config);
      await expect(importer.rollback("nonexistent")).rejects.toThrow(
        'No rollback data found for migration plan "nonexistent"'
      );
    });

    it("prevents double rollback", async () => {
      const importer = new OJSImporter(config);
      const plan = await importer.analyze();
      await importer.execute(plan);

      await importer.rollback(plan.id);
      await expect(importer.rollback(plan.id)).rejects.toThrow(
        "Rollback is no longer available for this migration"
      );
    });
  });
});
