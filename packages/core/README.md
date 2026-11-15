# @stanford-press/core

Journal configuration, multi-journal support, role system, permissions, and workflow event system for Stanford Open Press.

## Features

- **Journal Configuration** — Name, ISSN, DOI prefix, sections, review type defaults
- **Multi-Journal Support** — Registry for hosting multiple journals in a single instance
- **Role System** — Editor-in-Chief, Section Editor, Reviewer, Author, Copyeditor, Proofreader
- **Permission Model** — Fine-grained permissions scoped to roles, actions, resources, and workflow stages
- **Event Bus** — Decoupled event system for workflow transitions

## Usage

```typescript
import { createJournal, JournalRegistry, EventBus, EventType, hasPermission, DEFAULT_PERMISSIONS, Role, Action, Resource } from "@stanford-press/core";

// Create a journal
const journal = createJournal({
  name: "Journal of Open Science",
  slug: "jos",
  issn: "1234-5678",
  doiPrefix: "10.1234",
  sections: ["Research Articles", "Reviews"],
});

// Multi-journal registry
const registry = new JournalRegistry();
registry.register(journal);

// Check permissions
const canPublish = hasPermission(DEFAULT_PERMISSIONS, Role.EditorInChief, Action.Publish, Resource.Issue);

// Listen to workflow events
const bus = new EventBus();
bus.on(EventType.SubmissionCreated, (event) => {
  console.log("New submission:", event.submissionId);
});
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
