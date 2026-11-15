# @stanford-press/editorial

Editorial workflow, copyediting, production pipeline, email templates, and dashboard for Stanford Open Press.

## Features

- **Editorial Decisions** — Accept, minor revision, major revision, reject, desk reject
- **Copyediting** — Track changes, notes, and author review workflow
- **Production Pipeline** — Typesetting, galley proofs, author proofing, final check
- **Email Templates** — Customizable notifications with placeholder variables
- **Dashboard Stats** — Submissions by stage, acceptance rate, average decision time

## Usage

```typescript
import {
  createDecision,
  startCopyediting,
  createProductionPipeline,
  createDefaultTemplates,
  renderTemplate,
  EditorialDecisionType,
} from "@stanford-press/editorial";

// Make a decision
const decision = createDecision({
  submissionId: "sub_123",
  editorId: "editor_456",
  decision: EditorialDecisionType.MinorRevision,
  commentsToAuthor: "Please address the reviewer comments.",
  round: 1,
});

// Start copyediting
const copyedit = startCopyediting("sub_123", "copyeditor_789");

// Create production tasks
const tasks = createProductionPipeline("sub_123");
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
