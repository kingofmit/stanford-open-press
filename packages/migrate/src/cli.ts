#!/usr/bin/env node

import { OJSMigrator } from "./migrator";

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`
Stanford Open Press — OJS Migration Tool

Usage:
  npx @stanford-press/migrate analyze --host <host> --database <db> --user <user> --password <pass>
  npx @stanford-press/migrate execute --plan <plan.json> --target <postgres-url>
  npx @stanford-press/migrate verify --plan <plan.json> --target <postgres-url>

Commands:
  analyze    Connect to OJS database and generate migration plan
  execute    Run the migration based on a plan file
  verify     Verify migration completeness

Options:
  --host        OJS MySQL host (default: localhost)
  --port        OJS MySQL port (default: 3306)
  --database    OJS database name
  --user        OJS database user
  --password    OJS database password
  --target      Target PostgreSQL URL
  --plan        Path to migration plan JSON file
  --output      Output path for plan/report (default: stdout)
  --batch-size  Records per batch (default: 100)
  `);
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return result;
}

async function main() {
  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  const opts = parseArgs(args.slice(1));

  if (command === "analyze") {
    if (!opts.database || !opts.user) {
      console.error("Error: --database and --user are required for analyze");
      process.exit(1);
    }

    console.log("Connecting to OJS database...");
    const migrator = new OJSMigrator({
      host: opts.host || "localhost",
      port: parseInt(opts.port || "3306"),
      database: opts.database,
      user: opts.user,
      password: opts.password || "",
    });

    try {
      const plan = await migrator.analyze();
      const output = JSON.stringify(plan, null, 2);

      if (opts.output) {
        const { writeFileSync } = await import("fs");
        writeFileSync(opts.output, output);
        console.log(`\nMigration plan saved to: ${opts.output}`);
      } else {
        console.log(output);
      }

      console.log("\n=== Migration Plan Summary ===");
      console.log(`Journals:    ${plan.counts.journals}`);
      console.log(`Submissions: ${plan.counts.submissions}`);
      console.log(`Users:       ${plan.counts.users}`);
      console.log(`Reviews:     ${plan.counts.reviews}`);
      console.log(`Issues:      ${plan.counts.issues}`);
      if (plan.warnings.length > 0) {
        console.log(`\nWarnings (${plan.warnings.length}):`);
        plan.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
      }
      console.log(`\nEstimated migration time: ${plan.estimatedMinutes} minutes`);
    } finally {
      await migrator.disconnect();
    }
  } else if (command === "execute") {
    if (!opts.plan) {
      console.error("Error: --plan is required for execute");
      process.exit(1);
    }
    if (!opts.target) {
      console.error("Error: --target (PostgreSQL URL) is required for execute");
      process.exit(1);
    }

    const { readFileSync } = await import("fs");
    const plan = JSON.parse(readFileSync(opts.plan, "utf-8"));

    const migrator = new OJSMigrator({
      host: plan.source.host,
      port: plan.source.port,
      database: plan.source.database,
      user: plan.source.user,
      password: opts.password || "",
    });

    try {
      console.log("Starting migration...");
      const report = await migrator.execute(plan, {
        targetUrl: opts.target,
        batchSize: parseInt(opts["batch-size"] || "100"),
        onProgress: (message) => console.log(`  ${message}`),
      });

      const output = JSON.stringify(report, null, 2);
      if (opts.output) {
        const { writeFileSync } = await import("fs");
        writeFileSync(opts.output, output);
        console.log(`\nMigration report saved to: ${opts.output}`);
      }

      console.log("\n=== Migration Report ===");
      console.log(`Success:  ${report.success}`);
      console.log(`Warnings: ${report.warnings}`);
      console.log(`Errors:   ${report.errors}`);
      console.log(`Duration: ${report.durationMs}ms`);

      if (report.errorDetails.length > 0) {
        console.log("\nErrors:");
        report.errorDetails.forEach((e) => console.log(`  ✗ [${e.entity}] ${e.message}`));
      }
    } finally {
      await migrator.disconnect();
    }
  } else {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
