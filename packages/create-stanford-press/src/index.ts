import prompts from "prompts";
import pc from "picocolors";
import { execSync } from "child_process";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { randomBytes } from "crypto";

const REPO_URL = "https://github.com/kingofmit/stanford-open-press.git";

async function main() {
  console.log();
  console.log(pc.bold(pc.magenta("  Stanford Open Press")));
  console.log(pc.dim("  The modern, AI-powered scholarly publishing platform"));
  console.log();

  // Step 1: Project name
  const { projectName } = await prompts({
    type: "text",
    name: "projectName",
    message: "Project name",
    initial: "my-journal",
    validate: (v: string) => /^[a-z0-9-]+$/.test(v) || "Use lowercase letters, numbers, and hyphens only",
  });

  if (!projectName) {
    console.log(pc.red("Cancelled."));
    process.exit(0);
  }

  const projectDir = resolve(process.cwd(), projectName);

  if (existsSync(projectDir)) {
    console.log(pc.red(`Directory "${projectName}" already exists.`));
    process.exit(1);
  }

  // Step 2: Configuration
  const config = await prompts([
    {
      type: "text",
      name: "journalName",
      message: "Journal name",
      initial: "My Open Access Journal",
    },
    {
      type: "text",
      name: "dbUrl",
      message: "PostgreSQL URL",
      initial: "postgresql://postgres:postgres@localhost:5432/" + projectName.replace(/-/g, "_"),
    },
    {
      type: "select",
      name: "deployment",
      message: "Deployment target",
      choices: [
        { title: "Local development", value: "local" },
        { title: "Vercel", value: "vercel" },
        { title: "Docker", value: "docker" },
      ],
    },
    {
      type: "confirm",
      name: "installDeps",
      message: "Install dependencies now?",
      initial: true,
    },
  ]);

  if (!config.journalName) {
    console.log(pc.red("Cancelled."));
    process.exit(0);
  }

  // Step 3: Clone
  console.log();
  console.log(pc.cyan("Cloning Stanford Open Press..."));
  try {
    execSync(`git clone --depth 1 ${REPO_URL} ${projectName}`, {
      stdio: "pipe",
      cwd: process.cwd(),
    });
    // Remove .git to start fresh
    execSync(`rm -rf .git`, { cwd: projectDir, stdio: "pipe" });
    execSync(`git init`, { cwd: projectDir, stdio: "pipe" });
  } catch (err) {
    console.log(pc.red("Failed to clone repository. Check your internet connection."));
    process.exit(1);
  }

  console.log(pc.green("  Cloned successfully."));

  // Step 4: Generate environment files
  console.log(pc.cyan("Configuring environment..."));

  const secret = randomBytes(32).toString("base64");

  // Database env
  writeFileSync(
    join(projectDir, "packages/database/.env"),
    `DATABASE_URL="${config.dbUrl}"\n`
  );

  // Web app env
  const webEnv = [
    `DATABASE_URL="${config.dbUrl}"`,
    `NEXTAUTH_URL="http://localhost:3000"`,
    `NEXTAUTH_SECRET="${secret}"`,
    "",
    "# ORCID OAuth (register at https://orcid.org/developer-tools)",
    "ORCID_CLIENT_ID=",
    "ORCID_CLIENT_SECRET=",
    "",
    "# Email (https://resend.com)",
    "RESEND_API_KEY=",
    `EMAIL_FROM="noreply@${projectName}.press"`,
    "",
    "# AI (optional — features degrade gracefully without these)",
    "ANTHROPIC_API_KEY=",
    "OPENAI_API_KEY=",
    "",
    "# File storage (defaults to local ./uploads)",
    "# S3_BUCKET=",
    "# S3_REGION=us-east-1",
    "# S3_ACCESS_KEY_ID=",
    "# S3_SECRET_ACCESS_KEY=",
  ].join("\n");

  writeFileSync(join(projectDir, "apps/web/.env.local"), webEnv);

  console.log(pc.green("  Environment configured."));

  // Step 5: Install dependencies
  if (config.installDeps) {
    console.log(pc.cyan("Installing dependencies (this may take a minute)..."));
    try {
      execSync("pnpm install", {
        cwd: projectDir,
        stdio: "inherit",
      });
      console.log(pc.green("  Dependencies installed."));
    } catch {
      console.log(pc.yellow("  pnpm not found. Trying npm..."));
      try {
        execSync("npm install", { cwd: projectDir, stdio: "inherit" });
        console.log(pc.green("  Dependencies installed."));
      } catch {
        console.log(pc.red("  Failed to install dependencies. Run 'pnpm install' manually."));
      }
    }

    // Step 6: Set up database
    console.log(pc.cyan("Setting up database..."));
    try {
      execSync("pnpm --filter @stanford-press/database db:push", {
        cwd: projectDir,
        stdio: "pipe",
      });
      console.log(pc.green("  Database schema created."));

      // Seed with journal name
      execSync("pnpm --filter @stanford-press/database db:seed", {
        cwd: projectDir,
        stdio: "pipe",
      });
      console.log(pc.green("  Demo journal seeded."));
    } catch {
      console.log(pc.yellow("  Could not set up database. Make sure PostgreSQL is running."));
      console.log(pc.dim("  You can run this later:"));
      console.log(pc.dim("    pnpm --filter @stanford-press/database db:push"));
      console.log(pc.dim("    pnpm --filter @stanford-press/database db:seed"));
    }
  }

  // Step 7: Initial commit
  try {
    execSync("git add -A && git commit -m 'Initial commit: Stanford Open Press'", {
      cwd: projectDir,
      stdio: "pipe",
    });
  } catch {
    // Git commit may fail if no git config, that's ok
  }

  // Done!
  console.log();
  console.log(pc.bold(pc.green("  Your journal is ready!")));
  console.log();
  console.log(`  ${pc.cyan("cd")} ${projectName}`);

  if (!config.installDeps) {
    console.log(`  ${pc.cyan("pnpm")} install`);
    console.log(`  ${pc.cyan("pnpm")} --filter @stanford-press/database db:push`);
    console.log(`  ${pc.cyan("pnpm")} --filter @stanford-press/database db:seed`);
  }

  console.log(`  ${pc.cyan("pnpm")} dev`);
  console.log();
  console.log(pc.dim(`  Then open ${pc.underline("http://localhost:3000")}`));
  console.log();

  if (config.deployment === "vercel") {
    console.log(pc.dim("  To deploy to Vercel:"));
    console.log(pc.dim("    vercel deploy --prod"));
    console.log();
  } else if (config.deployment === "docker") {
    console.log(pc.dim("  To deploy with Docker:"));
    console.log(pc.dim("    cp .env.production.example .env.production"));
    console.log(pc.dim("    docker compose up -d"));
    console.log();
  }

  console.log(pc.dim("  Docs: https://github.com/kingofmit/stanford-open-press"));
  console.log();
}

main().catch((err) => {
  console.error(pc.red("Error:"), err.message);
  process.exit(1);
});
