# @stanford-press/migrate

OJS 3.x database importer with migration planning, data mapping, reporting, and rollback support for Stanford Open Press.

## Features

- **OJS 3.x Importer** — Reads OJS MySQL/PostgreSQL schema directly
- **Data Mapping** — Maps OJS data models to Stanford Open Press models
- **Preserves Everything** — Journals, submissions, reviews, users, issues, files
- **Migration Planning** — Analyze before you migrate, see what needs manual attention
- **Migration Report** — Detailed success/failure reporting with ID mapping
- **Rollback Support** — Undo a migration within the rollback window (7 days)

## Usage

```typescript
import { OJSImporter } from "@stanford-press/migrate";

const importer = new OJSImporter({
  source: {
    host: "localhost",
    database: "ojs",
    user: "ojs",
    password: "***",
    type: "mysql",
  },
});

// Analyze the source database
const plan = await importer.analyze();
console.log(`Found ${plan.journals} journals, ${plan.submissions} submissions`);

// Execute the migration
const report = await importer.execute(plan);
console.log(`Migrated: ${report.success} records, ${report.warnings} warnings`);

// Rollback if needed
const rollback = await importer.rollback(plan.id);
console.log(`Rolled back ${rollback.recordsRemoved} records`);
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
