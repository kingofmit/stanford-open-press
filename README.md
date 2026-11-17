<p align="center">
  <img src=".github/StanfordOpenPress.png" alt="Stanford Open Press" />
</p>

<p align="center">
  <a href="https://doi.org/10.5281/zenodo.24243322"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.24243322.svg" alt="DOI" /></a>
  <a href="https://www.npmjs.com/package/@stanford-press/core"><img src="https://img.shields.io/npm/v/@stanford-press/core.svg" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/next.js-15-black" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/react-19-61dafb" alt="React 19" />
</p>

The modern, AI-powered scholarly publishing platform. Beautiful journals, frictionless peer review, and intelligent editorial workflows — built for the future of open science.

---

## Why Stanford Open Press?

OJS has 34,000 journals — and 7-8 minute page loads, multi-week upgrade outages, and zero AI. Scholastica costs $10/submission. ScholarOne costs $50k/year.

Stanford Open Press is the open-source alternative: a full editorial workflow from submission to publication, with AI reviewer matching, automated desk review, Crossref DOI registration, Google Scholar indexing, and OJS migration — in one modern platform.

| | Stanford Open Press | OJS 3.x |
|---|---|---|
| **Stack** | Next.js 15, React 19, TypeScript | PHP 8, jQuery, Smarty |
| **Performance** | Instant — SSR + RSC | 7-8 min search queries |
| **AI Features** | Reviewer matching, desk review, LLM analysis | None |
| **Setup** | `pnpm install && pnpm dev` | LAMP stack, hours of config |
| **Mobile** | Responsive, mobile-first | Basic |
| **DOI** | Built-in Crossref deposit | Plugin required |
| **Indexing** | Google Scholar, DOAJ, OAI-PMH built-in | Manual configuration |
| **Migration** | One-command OJS import | N/A |

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9, PostgreSQL

git clone https://github.com/kingofmit/stanford-open-press.git
cd stanford-open-press
pnpm install

# Set up the database
cp packages/database/.env.example packages/database/.env
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env files with your PostgreSQL URL

pnpm --filter @stanford-press/database db:push
pnpm --filter @stanford-press/database db:seed

# Start development
pnpm dev
# → http://localhost:3000
```

## Architecture

```
stanford-open-press/
├── apps/
│   └── web/                    Next.js 15 web application
│       ├── src/app/            Pages & API routes (35 routes, 24 pages)
│       ├── src/lib/            Core services (auth, email, storage, AI, citations)
│       └── src/components/     Shared UI components
├── packages/
│   ├── core/                   Journal config, roles, permissions, event bus
│   ├── database/               Prisma schema (25 models), client, seed
│   ├── submissions/            Submission workflow state machine
│   ├── review/                 Peer review forms, scoring, assignments
│   ├── editorial/              Decisions, copyediting, production pipeline
│   ├── publish/                DOI, JATS XML, citations, OAI-PMH
│   ├── ai/                     Reviewer matching, desk review, formatting
│   ├── ui/                     Theme utilities, component types
│   └── migrate/                OJS 3.x MySQL importer with CLI
└── turbo.json                  Turborepo orchestration
```

**Tech stack:** Next.js 15 (App Router) · React 19 · TypeScript 5.8 (strict) · Prisma 6 · PostgreSQL · NextAuth v5 · Tailwind CSS · Turborepo · pnpm · Vitest

## Features

### For Authors
- **6-step submission wizard** — guided flow with auto-save, drag-and-drop file upload, ORCID auto-fill
- **Real-time status tracking** — always know where your paper is, no need to email the editor
- **Revision management** — see reviewer comments as a checklist, upload revisions with response letter

### For Editors
- **Editorial dashboard** — action-required queue, overdue reviews, pipeline overview, analytics
- **AI desk review** — automated 10-point screening catches scope mismatches, missing ethics, incomplete metadata
- **AI reviewer matching** — 5-dimension scoring (expertise, reliability, workload, recency, experience) with conflict-of-interest detection
- **LLM-powered analysis** — connect Anthropic or OpenAI for real scope evaluation, methodology screening, and language assessment
- **One-click decisions** — see all reviews side-by-side, write decision letter, set revision deadlines
- **Production pipeline** — 6-step workflow from copyediting to DOI registration with progress tracking
- **Journal settings** — theme customization (colors, fonts), email templates with live preview, editorial analytics

### For Reviewers
- **Email-based invitations** — accept or decline from email, no login needed to decline
- **Scored review form** — criteria with weights, comments to author and editor, recommendation
- **Deadline reminders** — 7-day warning, due-today, 3/7/14-day overdue with editor escalation

### Publishing & Indexing
- **Crossref DOI deposit** — XML 5.3.1, automatic registration on publish
- **Google Scholar** — Highwire Press meta tags on every article page
- **DOAJ / OAI-PMH** — built-in OAI-PMH 2.0 endpoint for harvesters
- **JATS XML** — Publishing DTD v1.3 for PubMed/PMC deposit
- **Citations** — export in BibTeX, RIS, APA, MLA, Chicago
- **PDF generation** — branded article PDFs via Puppeteer (HTML fallback)
- **RSS feeds** — per-journal RSS 2.0 with Dublin Core metadata
- **Sitemap** — dynamic sitemap.xml with all published content

### Migration
- **OJS 3.x import** — connect to OJS MySQL, analyze, migrate journals/submissions/users/reviews/issues
- **CLI tool** — `npx @stanford-press/migrate analyze --database ojs --user root`
- **Rollback support** — 7-day rollback window with full ID mapping

## Packages

| Package | Description | Tests |
|---|---|---|
| [`@stanford-press/core`](./packages/core) | Journal config, roles & permissions, event bus | 75 |
| [`@stanford-press/database`](./packages/database) | Prisma schema (25 models, 11 enums), client, seed | — |
| [`@stanford-press/submissions`](./packages/submissions) | Submission workflow state machine, file management | 64 |
| [`@stanford-press/review`](./packages/review) | Review forms, scoring, assignments, deadlines | 32 |
| [`@stanford-press/editorial`](./packages/editorial) | Decisions, copyediting, production pipeline, templates | 60 |
| [`@stanford-press/publish`](./packages/publish) | DOI, JATS XML, citations (5 formats), OAI-PMH | 79 |
| [`@stanford-press/ai`](./packages/ai) | Reviewer matching, desk review, abstract scoring | 55 |
| [`@stanford-press/ui`](./packages/ui) | Theme utilities, wizard validation, formatting | 43 |
| [`@stanford-press/migrate`](./packages/migrate) | OJS 3.x MySQL importer with analyze/execute CLI | 51 |
| [`@stanford-press/web`](./apps/web) | Next.js 15 web app (35 API routes, 24 pages) | 67 |

**Total: 526 tests across 27 test files**

## API Routes

### Journals
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/journals` | List and create journals |
| GET/PATCH | `/api/journals/[id]` | Get and update journal |
| GET/POST/DELETE | `/api/journals/[id]/roles` | Manage role assignments |
| GET/POST | `/api/journals/[id]/sections` | Manage sections |
| GET/POST | `/api/journals/[id]/volumes` | Manage volumes |
| GET/POST | `/api/journals/[id]/issues` | Manage issues |
| GET/PATCH | `/api/journals/[id]/issues/[id]` | Issue detail and article assignment |
| POST | `/api/journals/[id]/issues/[id]/publish` | Publish an issue |
| PATCH | `/api/journals/[id]/templates/[id]` | Edit email templates |
| GET | `/api/journals/[id]/oai` | OAI-PMH 2.0 endpoint |

### Submissions
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/submissions` | List and create submissions |
| GET/PATCH | `/api/submissions/[id]` | Get and update submission |
| POST | `/api/submissions/[id]/submit` | Submit for review |
| POST | `/api/submissions/[id]/status` | Editor status transitions |
| GET/POST/PUT/DELETE | `/api/submissions/[id]/authors` | Author management |
| GET/POST/DELETE | `/api/submissions/[id]/files` | File upload and management |
| POST | `/api/submissions/[id]/decision` | Editorial decision |
| GET/POST | `/api/submissions/[id]/reviews` | List and invite reviewers |
| GET/POST | `/api/submissions/[id]/desk-review` | AI desk review |
| GET | `/api/submissions/[id]/match-reviewers` | AI reviewer matching |
| GET/POST/PATCH | `/api/submissions/[id]/copyedit` | Copyediting workflow |
| GET/POST/PATCH | `/api/submissions/[id]/production` | Production pipeline |

### Reviews
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/reviews/respond` | Token-based accept/decline |
| GET | `/api/reviews/[id]` | Get review assignment with form |
| POST | `/api/reviews/[id]/submit` | Submit completed review |
| POST | `/api/reviews/[id]/cancel` | Cancel review assignment |

### Articles & Users
| Method | Route | Description |
|---|---|---|
| GET | `/api/articles/[id]/cite` | Citation export (BibTeX/RIS/APA/MLA/Chicago) |
| GET | `/api/articles/[id]/jats` | JATS XML download |
| GET | `/api/articles/[id]/pdf` | PDF generation |
| GET | `/api/search` | Full-text article search |
| GET | `/api/users/me` | Current user profile |
| PATCH | `/api/users/me/update` | Update profile |
| POST | `/api/cron/reminders` | Process deadline reminders |

## Environment Variables

See [`apps/web/.env.local.example`](./apps/web/.env.local.example) for all configuration options:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | App URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `ORCID_CLIENT_ID` | No | ORCID OAuth client ID |
| `RESEND_API_KEY` | No | Resend API key for transactional email |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for LLM features |
| `OPENAI_API_KEY` | No | OpenAI API key for LLM/embeddings |
| `CROSSREF_USERNAME` | No | Crossref deposit credentials |
| `S3_BUCKET` | No | S3 bucket for file storage (defaults to local) |
| `CRON_SECRET` | No | Secret for cron endpoint authentication |

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run 526 tests
pnpm dev              # Start dev server with hot reload
pnpm clean            # Clean all dist directories
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development guide.

## License

[MIT](./LICENSE) — [Ahmed Allem](https://kingallem.com)
