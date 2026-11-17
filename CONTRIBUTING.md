# Contributing to Stanford Open Press

Thanks for your interest in making scholarly publishing better. This guide covers everything you need to contribute.

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`npm install -g pnpm`)
- **PostgreSQL** 14+ (for database)
- **Git**

## Setup

```bash
# Clone and install
git clone https://github.com/kingofmit/stanford-open-press.git
cd stanford-open-press
pnpm install

# Set up database
cp packages/database/.env.example packages/database/.env
# Edit packages/database/.env with your PostgreSQL URL:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stanford_press"

# Generate Prisma client and push schema
pnpm --filter @stanford-press/database db:push
pnpm --filter @stanford-press/database db:seed

# Set up web app
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local with DATABASE_URL and NEXTAUTH_SECRET

# Build and test
pnpm build
pnpm test     # 526 tests should pass

# Start development
pnpm dev      # → http://localhost:3000
```

## Project Structure

```
stanford-open-press/
├── apps/
│   └── web/                        Next.js 15 web application
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/         Login, verify, error pages
│       │   │   ├── (dashboard)/    Dashboard, editorial, submissions, reviews
│       │   │   ├── [slug]/         Public journal pages (articles, issues, search)
│       │   │   └── api/            35 API route handlers
│       │   ├── components/         Shared React components
│       │   ├── lib/
│       │   │   ├── ai/             LLM client, desk review, reviewer matching
│       │   │   ├── storage/        S3 + local file storage adapters
│       │   │   ├── auth.ts         NextAuth v5 configuration
│       │   │   ├── authorization.ts Role-based access helpers
│       │   │   ├── email.ts        Email service with templates
│       │   │   ├── citations.ts    Citation formatting (5 formats)
│       │   │   ├── crossref.ts     Crossref DOI deposit
│       │   │   ├── jats.ts         JATS XML generation
│       │   │   ├── pdf.ts          PDF generation
│       │   │   └── reminders.ts    Deadline reminder processing
│       │   └── types/              TypeScript augmentations
│       └── vitest.config.ts
├── packages/
│   ├── core/                       Roles, permissions, events, journal config
│   ├── database/                   Prisma schema + client
│   │   └── prisma/
│   │       ├── schema.prisma       25 models, 11 enums
│   │       └── seed.ts             Demo journal seeder
│   ├── submissions/                Workflow state machine
│   ├── review/                     Review forms and scoring
│   ├── editorial/                  Decisions, copyediting, production
│   ├── publish/                    DOI, JATS, citations, OAI-PMH
│   ├── ai/                         AI matching and desk review
│   ├── ui/                         Theme utilities and validation
│   └── migrate/                    OJS 3.x importer + CLI
├── turbo.json                      Turborepo task config
├── pnpm-workspace.yaml             Workspace packages
└── tsconfig.json                   Root TypeScript config
```

## Commands

| Command | Description |
|---|---|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all 10 packages |
| `pnpm test` | Run all 526 tests |
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm clean` | Remove all dist directories |
| `pnpm --filter @stanford-press/database db:push` | Push schema to database |
| `pnpm --filter @stanford-press/database db:seed` | Seed demo data |
| `pnpm --filter @stanford-press/database db:studio` | Open Prisma Studio |
| `pnpm --filter @stanford-press/web build` | Build web app only |
| `pnpm --filter @stanford-press/web test` | Run web app tests only |
| `pnpm changeset` | Create a version changeset |

## Making Changes

### Adding a new API route

1. Create the route file in `apps/web/src/app/api/your-route/route.ts`
2. Use the `withAuth` wrapper from `@/lib/api` for authenticated routes
3. Use `validate()` with Zod schemas for input validation
4. Use `isJournalEditor()` / `isJournalAdmin()` from `@/lib/authorization` for role checks
5. Use `handleError()` for consistent error responses

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

const mySchema = z.object({
  name: z.string().min(1).max(255),
});

export async function POST(request: NextRequest) {
  return withAuth(async (ctx) => {
    try {
      const body = await request.json();
      const data = validate(mySchema, body);
      // ... your logic
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
```

### Adding a new page

1. Create the page in the appropriate route group:
   - `(auth)/` — login-related pages
   - `(dashboard)/` — authenticated pages (dashboard, editorial, reviews)
   - `[slug]/` — public journal pages
2. Add `loading.tsx` for async pages
3. Use `auth()` from `@/lib/auth` for session checks in server components

### Modifying the database schema

1. Edit `packages/database/prisma/schema.prisma`
2. Run `pnpm --filter @stanford-press/database db:push` to apply changes
3. Run `pnpm --filter @stanford-press/database exec prisma generate` to regenerate the client
4. Update any affected API routes or pages
5. For production: use `prisma migrate dev --name describe-your-change`

### Adding a new library package

1. Create directory: `packages/my-package/`
2. Add `package.json` with name `@stanford-press/my-package`
3. Add `tsconfig.json` extending root
4. Add `tsup.config.ts` for CJS + ESM builds
5. Create `src/index.ts` with exports
6. Add tests in `__tests__/`
7. The package is auto-discovered by pnpm workspace

### Writing tests

All packages use **Vitest**. Tests live in `__tests__/` directories alongside `src/`.

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../src";

describe("myFunction", () => {
  it("does the thing", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

For web app tests that depend on Prisma, mock the database:

```typescript
import { vi } from "vitest";

vi.mock("@stanford-press/database", () => ({
  prisma: {
    submission: { findUnique: vi.fn() },
  },
}));
```

Run tests: `pnpm test` (all) or `pnpm --filter @stanford-press/core test` (single package).

## Conventions

- **TypeScript strict mode** everywhere
- **Zod** for all API input validation
- **Authorization** on every mutating endpoint (use `isJournalEditor` / `isJournalAdmin`)
- **HTML escaping** in all email templates and XML output (`escapeHtml()` from `@/lib/email`)
- **Prisma transactions** for multi-step mutations
- **Status transitions** go through the state machine — never set status directly
- **No `any` types** unless interfacing with external APIs (and document why)
- **Accessible forms** — every input needs a label (`<label htmlFor>` or `aria-label`)

## Pull Request Process

1. Fork and clone the repo
2. Create a branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Add or update tests
5. Run `pnpm build && pnpm test` — all 526+ tests must pass
6. Create a changeset: `pnpm changeset`
7. Open a PR against `main`

### PR checklist
- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] New API routes have auth checks
- [ ] New forms have accessible labels
- [ ] Database changes have migration
- [ ] Changeset created for user-facing changes

## Security

If you find a security vulnerability, please email **press@stanford.edu** instead of opening a public issue.

Key security patterns in this codebase:
- Path traversal prevention in file storage (`safePath()` in `local.ts`)
- Authorization on all API routes (`withAuth` + `isJournalEditor` / `isJournalAdmin`)
- HTML escaping in emails (`escapeHtml()`)
- XML escaping in feeds and JATS (`escapeXml()`)
- CSS color validation in PDF generation
- Prisma parameterized queries (no raw SQL)
- Token-based reviewer invitations (single-use, invalidated after response)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
