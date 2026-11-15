<p align="center">
  <img src=".github/StanfordOpenPress.png" alt="Stanford Open Press" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@stanford-press/core"><img src="https://img.shields.io/npm/v/@stanford-press/core.svg" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/react-19-61dafb" alt="React 19" />
</p>

The modern, AI-powered scholarly publishing platform. Beautiful journals, frictionless peer review, and intelligent editorial workflows — built for the future of open science.

## Features

- **AI Reviewer Matching** — Analyze abstracts and match against reviewer expertise using embeddings
- **Automated Desk Review** — Scope check, completeness validation, and duplicate detection
- **Smart Formatting** — Detect citation style issues and check reference completeness
- **DOI Registration** — Crossref and DataCite integration for persistent identifiers
- **JATS XML** — Generate standards-compliant XML for indexing and archival
- **Beautiful Default Theme** — Mobile-first, accessible journal theme built on Allem UI
- **Mobile-First** — Responsive design for readers, reviewers, and editors
- **OJS Migration Tool** — Import your entire journal from OJS 3.x in minutes

## Stanford Open Press vs OJS

| Feature | Stanford Open Press | OJS 3.x |
|---------|-------------------|---------|
| **Stack** | Next.js 16, React 19, TypeScript | PHP 8, jQuery, Smarty |
| **UI Framework** | Allem UI (modern components) | Bootstrap 3 (legacy) |
| **AI Features** | Reviewer matching, desk review, formatting | None |
| **Mobile Support** | Mobile-first responsive | Basic responsive |
| **Performance** | Edge-ready, static generation | Server-rendered PHP |
| **Setup Time** | Minutes (npm install) | Hours (LAMP stack) |
| **API** | TypeScript SDK, REST + GraphQL | REST (limited) |
| **Theme System** | React components, dark mode | PHP templates |
| **Multi-Journal** | Built-in, first-class | Plugin-based |
| **Review Types** | Single-blind, double-blind, open | Single-blind, double-blind |

## Packages

| Package | Description |
|---------|-------------|
| [`@stanford-press/core`](./packages/core) | Journal configuration, roles, permissions, and event system |
| [`@stanford-press/submissions`](./packages/submissions) | Submission workflow state machine and file management |
| [`@stanford-press/review`](./packages/review) | Peer review management, forms, and reviewer tracking |
| [`@stanford-press/editorial`](./packages/editorial) | Editorial workflow, copyediting, and production pipeline |
| [`@stanford-press/publish`](./packages/publish) | DOI registration, JATS XML, citation export, OAI-PMH |
| [`@stanford-press/ai`](./packages/ai) | AI reviewer matching, desk review, and formatting agents |
| [`@stanford-press/ui`](./packages/ui) | Journal theme components built on Allem UI |
| [`@stanford-press/migrate`](./packages/migrate) | OJS 3.x database importer with rollback support |

## Quick Start

```bash
# Install all packages
npm install @stanford-press/core @stanford-press/submissions @stanford-press/review @stanford-press/editorial @stanford-press/publish

# Configure your journal
import { createJournal } from "@stanford-press/core";

const journal = createJournal({
  name: "Journal of Open Science",
  issn: "1234-5678",
  doiPrefix: "10.1234",
  sections: ["Research Articles", "Reviews", "Short Communications"],
});

# Start the editorial workflow
import { createSubmission } from "@stanford-press/submissions";
import { assignReviewers } from "@stanford-press/review";

const submission = createSubmission({
  journalId: journal.id,
  title: "A Novel Approach to Open Access Publishing",
  abstract: "We present a modern platform for scholarly communication...",
  authors: [{ name: "Jane Doe", email: "jane@university.edu", affiliation: "MIT" }],
});
```

## Architecture

Stanford Open Press is built as a modular Turborepo monorepo. Each package handles one concern:

```
@stanford-press/core          Journal config, roles, permissions
        |
@stanford-press/submissions   Submission intake & state machine
        |
@stanford-press/review        Peer review assignment & tracking
        |
@stanford-press/editorial     Editorial decisions & production
        |
@stanford-press/publish       DOI minting, JATS XML, indexing
        |
@stanford-press/ai            AI features (matching, desk review)
@stanford-press/ui            Reader & editor UI components
@stanford-press/migrate       OJS migration tools
```

The workflow flows from submission through review to publication, with AI augmenting each stage. The UI package provides React components for building the front-end, and the migrate package handles importing data from legacy systems.

## For Editors

Editors get a dashboard showing all submissions organized by workflow stage. Assign reviewers with AI-powered matching, make editorial decisions, and track the entire pipeline from submission to publication. Customizable email templates keep authors and reviewers informed at every step.

## For Reviewers

Reviewers receive invitations with one-click accept/decline. The review interface presents the manuscript alongside a customizable review form with scoring rubrics. Deadline reminders and AI-powered smart notifications help keep reviews on track.

## For Authors

Authors submit manuscripts through a guided multi-step wizard. Track submission status in real time, respond to reviewer comments, upload revised manuscripts, and proof galleys — all from a clean, modern dashboard.

## Tech Stack

- [Next.js 16](https://nextjs.org/) — App Router, Turbopack
- [React 19](https://react.dev/) — Server and client components
- [Allem UI](https://github.com/kingofmit/allem-ui) — Component library
- [Allem SDK](https://github.com/kingofmit/allem-sdk) — Developer SDK (hooks, AI, forms)
- [Prisma](https://www.prisma.io/) — Database ORM
- [PostgreSQL](https://www.postgresql.org/) — Primary database
- [Vercel AI SDK](https://sdk.vercel.ai/) — AI features
- [TypeScript](https://www.typescriptlang.org/) — Strict mode throughout
- [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) — Monorepo tooling
- [tsup](https://tsup.egoist.dev/) — ESM + CJS builds
- [Changesets](https://github.com/changesets/changesets) — Versioning

## Migration

Coming from OJS? Import your entire journal in minutes:

```typescript
import { OJSImporter } from "@stanford-press/migrate";

const importer = new OJSImporter({
  source: { host: "localhost", database: "ojs", user: "ojs", password: "***" },
});

const plan = await importer.analyze();
console.log(`Found ${plan.journals} journals, ${plan.submissions} submissions, ${plan.users} users`);

const report = await importer.execute(plan);
console.log(`Migrated: ${report.success} records, ${report.warnings} warnings`);
```

## Development

```bash
git clone https://github.com/kingofmit/stanford-open-press.git
cd stanford-open-press
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## License

[MIT](./LICENSE) - [Ahmed Allem](https://kingallem.com)
