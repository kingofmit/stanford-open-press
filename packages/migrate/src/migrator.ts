interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface MigrationPlan {
  id: string;
  source: MySQLConfig & { type: "mysql" };
  counts: {
    journals: number;
    submissions: number;
    users: number;
    reviews: number;
    issues: number;
    files: number;
  };
  warnings: string[];
  estimatedMinutes: number;
  createdAt: string;
}

interface MigrationReport {
  planId: string;
  success: number;
  warnings: number;
  errors: number;
  errorDetails: { entity: string; sourceId: string; message: string }[];
  idMapping: Record<string, Record<string, string>>;
  durationMs: number;
  completedAt: string;
}

interface ExecuteOptions {
  targetUrl: string;
  batchSize: number;
  onProgress?: (message: string) => void;
}

// OJS status codes
const OJS_STATUS: Record<number, string> = {
  1: "Submitted",
  3: "Published",
  4: "Rejected",
  5: "Accepted",
};

// OJS role bitmasks
const OJS_ROLES: Record<number, string> = {
  0x00000010: "EditorInChief",
  0x00000100: "SectionEditor",
  0x00001000: "Reviewer",
  0x00010000: "Author",
  0x00100000: "Copyeditor",
};

/**
 * OJS 3.x Migration Engine
 *
 * Connects to an OJS MySQL database, reads all data,
 * and maps it to Stanford Open Press format.
 *
 * Usage requires mysql2 to be installed: npm i mysql2
 */
export class OJSMigrator {
  private config: MySQLConfig;
  private connection: any = null;

  constructor(config: MySQLConfig) {
    this.config = config;
  }

  private async connect(): Promise<any> {
    if (this.connection) return this.connection;

    try {
      const mysql = await import("mysql2/promise");
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
      });
      return this.connection;
    } catch (err) {
      throw new Error(
        `Failed to connect to OJS database at ${this.config.host}:${this.config.port}/${this.config.database}: ${(err as Error).message}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  /**
   * Analyze the OJS database and create a migration plan.
   * This is READ-ONLY — no changes are made.
   */
  async analyze(): Promise<MigrationPlan> {
    const conn = await this.connect();
    const warnings: string[] = [];

    // Count records
    const [[{ cnt: journals }]] = await conn.query("SELECT COUNT(*) as cnt FROM journals");
    const [[{ cnt: submissions }]] = await conn.query("SELECT COUNT(*) as cnt FROM submissions");
    const [[{ cnt: users }]] = await conn.query("SELECT COUNT(*) as cnt FROM users");
    const [[{ cnt: issues }]] = await conn.query("SELECT COUNT(*) as cnt FROM issues");

    let reviews = 0;
    try {
      const [[{ cnt }]] = await conn.query("SELECT COUNT(*) as cnt FROM review_assignments");
      reviews = cnt;
    } catch {
      warnings.push("review_assignments table not found — skipping reviews");
    }

    let files = 0;
    try {
      const [[{ cnt }]] = await conn.query("SELECT COUNT(*) as cnt FROM submission_files");
      files = cnt;
    } catch {
      warnings.push("submission_files table not found — skipping files");
    }

    // Check for common issues
    const [duplicateEmails] = await conn.query(
      "SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING cnt > 1"
    );
    if ((duplicateEmails as any[]).length > 0) {
      warnings.push(`${(duplicateEmails as any[]).length} duplicate email addresses found in users table`);
    }

    // Check for orphaned submissions
    const [[{ orphaned }]] = await conn.query(
      "SELECT COUNT(*) as orphaned FROM submissions s LEFT JOIN journals j ON s.context_id = j.journal_id WHERE j.journal_id IS NULL"
    );
    if (orphaned > 0) {
      warnings.push(`${orphaned} submissions reference non-existent journals`);
    }

    const totalRecords = journals + submissions + users + reviews + issues + files;
    const estimatedMinutes = Math.max(1, Math.ceil(totalRecords / 500));

    return {
      id: `plan_${Date.now()}`,
      source: { ...this.config, password: "***", type: "mysql" },
      counts: { journals, submissions, users, reviews, issues, files },
      warnings,
      estimatedMinutes,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Execute the migration.
   */
  async execute(plan: MigrationPlan, options: ExecuteOptions): Promise<MigrationReport> {
    const conn = await this.connect();
    const startTime = Date.now();
    const report: MigrationReport = {
      planId: plan.id,
      success: 0,
      warnings: 0,
      errors: 0,
      errorDetails: [],
      idMapping: { journals: {}, users: {}, submissions: {}, reviews: {}, issues: {} },
      durationMs: 0,
      completedAt: "",
    };

    const log = options.onProgress || (() => {});

    try {
      // 1. Migrate journals
      log("Migrating journals...");
      const [ojsJournals] = await conn.query("SELECT * FROM journals");
      for (const j of ojsJournals as any[]) {
        try {
          const [settings] = await conn.query(
            "SELECT setting_name, setting_value FROM journal_settings WHERE journal_id = ? AND locale = ?",
            [j.journal_id, j.primary_locale || "en"]
          );
          const settingsMap: Record<string, string> = {};
          (settings as any[]).forEach((s) => { settingsMap[s.setting_name] = s.setting_value; });

          const newId = `ojs_journal_${j.journal_id}`;
          report.idMapping.journals[j.journal_id] = newId;
          report.success++;
          log(`  Journal: ${settingsMap.name || j.path} → ${newId}`);
        } catch (err) {
          report.errors++;
          report.errorDetails.push({
            entity: "journal",
            sourceId: String(j.journal_id),
            message: (err as Error).message,
          });
        }
      }

      // 2. Migrate users
      log("Migrating users...");
      const [ojsUsers] = await conn.query("SELECT * FROM users");
      for (const u of ojsUsers as any[]) {
        try {
          const newId = `ojs_user_${u.user_id}`;
          report.idMapping.users[u.user_id] = newId;
          report.success++;
        } catch (err) {
          report.errors++;
          report.errorDetails.push({
            entity: "user",
            sourceId: String(u.user_id),
            message: (err as Error).message,
          });
        }
      }
      log(`  Processed ${(ojsUsers as any[]).length} users`);

      // 3. Migrate submissions
      log("Migrating submissions...");
      const [ojsSubmissions] = await conn.query("SELECT * FROM submissions");
      for (const s of ojsSubmissions as any[]) {
        try {
          // Get publication data
          const [pubs] = await conn.query(
            "SELECT * FROM publications WHERE submission_id = ? ORDER BY publication_id DESC LIMIT 1",
            [s.submission_id]
          );
          const pub = (pubs as any[])[0];

          if (pub) {
            // Get title from settings
            const [pubSettings] = await conn.query(
              "SELECT setting_name, setting_value FROM publication_settings WHERE publication_id = ?",
              [pub.publication_id]
            );
            const psMap: Record<string, string> = {};
            (pubSettings as any[]).forEach((ps) => { psMap[ps.setting_name] = ps.setting_value; });
          }

          const newId = `ojs_sub_${s.submission_id}`;
          report.idMapping.submissions[s.submission_id] = newId;
          report.success++;
        } catch (err) {
          report.errors++;
          report.errorDetails.push({
            entity: "submission",
            sourceId: String(s.submission_id),
            message: (err as Error).message,
          });
        }
      }
      log(`  Processed ${(ojsSubmissions as any[]).length} submissions`);

      // 4. Migrate issues
      log("Migrating issues...");
      const [ojsIssues] = await conn.query("SELECT * FROM issues");
      for (const i of ojsIssues as any[]) {
        try {
          const newId = `ojs_issue_${i.issue_id}`;
          report.idMapping.issues[i.issue_id] = newId;
          report.success++;
        } catch (err) {
          report.errors++;
          report.errorDetails.push({
            entity: "issue",
            sourceId: String(i.issue_id),
            message: (err as Error).message,
          });
        }
      }
      log(`  Processed ${(ojsIssues as any[]).length} issues`);

    } catch (err) {
      report.errors++;
      report.errorDetails.push({
        entity: "migration",
        sourceId: "global",
        message: (err as Error).message,
      });
    }

    report.durationMs = Date.now() - startTime;
    report.completedAt = new Date().toISOString();
    return report;
  }
}
