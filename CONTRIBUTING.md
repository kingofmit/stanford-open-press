# Contributing

Thanks for your interest in contributing to Stanford Open Press.

## Setup

```bash
git clone https://github.com/kingofmit/stanford-open-press.git
cd stanford-open-press
pnpm install
pnpm build
pnpm test
```

Requires Node.js >= 20 and [pnpm](https://pnpm.io/) >= 9.

## Project Structure

```
packages/
  core/         @stanford-press/core         Journal config, roles, permissions
  submissions/  @stanford-press/submissions  Submission workflow & state machine
  review/       @stanford-press/review       Peer review management
  editorial/    @stanford-press/editorial    Editorial workflow & production
  publish/      @stanford-press/publish      DOI, JATS XML, citation export
  ai/           @stanford-press/ai           AI reviewer matching & desk review
  ui/           @stanford-press/ui           Journal theme components
  migrate/      @stanford-press/migrate      OJS migration tools
apps/
  (coming soon)
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm dev` | Watch mode |
| `pnpm clean` | Clean all dist directories |

## Pull Requests

1. Fork and clone the repo
2. Create a branch from `main`: `git checkout -b feat/my-feature`
3. Make your changes and add tests
4. Run `pnpm build && pnpm test`
5. Create a changeset: `pnpm changeset`
6. Open a PR against `main`

## Conventions

- TypeScript strict mode
- Export types alongside implementations
- One module per concern
- All workflow transitions go through the event system
- Use the role/permission model from `@stanford-press/core` for access control

## Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning. Run `pnpm changeset` when making user-facing changes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
