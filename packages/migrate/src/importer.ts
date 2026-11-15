import type { ID } from "@stanford-press/core";
import type {
  DatabaseConfig,
  MigrationPlan,
  MigrationReport,
  MigrationError,
  RollbackInfo,
  OJSJournal,
  OJSSubmission,
  OJSUser,
  OJSIssue,
  OJSReviewAssignment,
} from "./types";
import { mapJournal, mapSubmission, mapUser, mapIssue, mapReviewAssignment } from "./mapper";

let counter = 0;

function generateId(): ID {
  return `mig_${Date.now()}_${++counter}`;
}

/**
 * OJS Importer — reads data from an OJS database and migrates it to Stanford Open Press.
 *
 * ```ts
 * const importer = new OJSImporter({
 *   source: { host: "localhost", database: "ojs", user: "ojs", password: "***" },
 * });
 *
 * const plan = await importer.analyze();
 * const report = await importer.execute(plan);
 * ```
 */
export class OJSImporter {
  private sourceConfig: DatabaseConfig;
  private rollbackData: Map<string, RollbackInfo> = new Map();

  constructor(config: { source: DatabaseConfig }) {
    this.sourceConfig = config.source;
  }

  /**
   * Analyze the source OJS database and create a migration plan.
   * This does not modify any data — it only reads the source database.
   */
  async analyze(): Promise<MigrationPlan> {
    // In production, this would query the OJS database
    // For now, we return a plan structure
    const plan: MigrationPlan = {
      id: generateId(),
      sourceConfig: {
        host: this.sourceConfig.host,
        port: this.sourceConfig.port,
        database: this.sourceConfig.database,
        user: this.sourceConfig.user,
        type: this.sourceConfig.type ?? "mysql",
      },
      journals: 0,
      submissions: 0,
      users: 0,
      reviews: 0,
      issues: 0,
      files: 0,
      estimatedDuration: 0,
      manualItems: [],
      createdAt: new Date().toISOString(),
    };

    return plan;
  }

  /**
   * Execute a migration plan.
   */
  async execute(plan: MigrationPlan): Promise<MigrationReport> {
    const startTime = Date.now();
    const errors: MigrationError[] = [];
    const idMapping: Record<string, Record<number, string>> = {
      journals: {},
      submissions: {},
      users: {},
      issues: {},
      reviews: {},
    };

    let success = 0;
    let warnings = 0;

    // Store rollback data
    const rollback: RollbackInfo = {
      planId: plan.id,
      createdRecords: { journals: [], submissions: [], users: [], issues: [] },
      canRollback: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
    this.rollbackData.set(plan.id, rollback);

    const report: MigrationReport = {
      planId: plan.id,
      success,
      warnings,
      failures: errors.length,
      errors,
      manualItems: plan.manualItems,
      durationMs: Date.now() - startTime,
      idMapping,
      completedAt: new Date().toISOString(),
    };

    return report;
  }

  /**
   * Migrate a set of journals from OJS data.
   */
  migrateJournals(ojsJournals: OJSJournal[]) {
    return ojsJournals.map((j) => {
      const mapped = mapJournal(j);
      return { ...mapped, id: generateId() };
    });
  }

  /**
   * Migrate a set of submissions from OJS data.
   */
  migrateSubmissions(ojsSubmissions: OJSSubmission[]) {
    return ojsSubmissions.map((s) => {
      const mapped = mapSubmission(s);
      return { ...mapped, id: generateId() };
    });
  }

  /**
   * Migrate a set of users from OJS data.
   */
  migrateUsers(ojsUsers: OJSUser[]) {
    return ojsUsers.map((u) => {
      const mapped = mapUser(u);
      return { ...mapped, id: generateId() };
    });
  }

  /**
   * Migrate issues from OJS data.
   */
  migrateIssues(ojsIssues: OJSIssue[]) {
    return ojsIssues.map((i) => {
      const mapped = mapIssue(i);
      return { ...mapped, id: generateId() };
    });
  }

  /**
   * Migrate review assignments from OJS data.
   */
  migrateReviews(ojsReviews: OJSReviewAssignment[]) {
    return ojsReviews.map((r) => {
      const mapped = mapReviewAssignment(r);
      return { ...mapped, id: generateId() };
    });
  }

  /**
   * Rollback a migration, removing all records created during the migration.
   */
  async rollback(planId: string): Promise<{ success: boolean; recordsRemoved: number }> {
    const rollbackInfo = this.rollbackData.get(planId);

    if (!rollbackInfo) {
      throw new Error(`No rollback data found for migration plan "${planId}"`);
    }

    if (!rollbackInfo.canRollback) {
      throw new Error("Rollback is no longer available for this migration");
    }

    if (new Date() > new Date(rollbackInfo.expiresAt)) {
      throw new Error("Rollback window has expired");
    }

    let totalRemoved = 0;
    for (const [_entity, ids] of Object.entries(rollbackInfo.createdRecords)) {
      totalRemoved += ids.length;
      // In production: delete records from the database
    }

    rollbackInfo.canRollback = false;

    return { success: true, recordsRemoved: totalRemoved };
  }

  /**
   * Get rollback info for a migration plan.
   */
  getRollbackInfo(planId: string): RollbackInfo | undefined {
    return this.rollbackData.get(planId);
  }
}
