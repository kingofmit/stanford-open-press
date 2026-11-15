# @stanford-press/ui

Journal theme components, submission wizard, review interface, editorial dashboard, and reader components for Stanford Open Press.

## Features

- **Article Page Layout** — Title, authors, abstract, body, references, figures
- **Submission Wizard** — Multi-step form for authors with validation
- **Review Interface** — Side-by-side manuscript and review form
- **Editorial Dashboard** — Kanban board of submissions by stage
- **Reader Components** — Table of contents, article cards, search results, pagination
- **Theming** — Customizable colors, fonts, dark mode support
- **Mobile-First** — Responsive design throughout

## Usage

```typescript
import {
  DEFAULT_WIZARD_STEPS,
  DEFAULT_THEME,
  validateWizardStep,
  formatAuthorList,
  truncateAbstract,
  groupByStatus,
} from "@stanford-press/ui";

// Format author list for display
const display = formatAuthorList([
  { name: "Jane Doe" },
  { name: "John Smith" },
  { name: "Alice Johnson" },
]);
// "Jane Doe, John Smith, and Alice Johnson"

// Validate wizard step
const errors = validateWizardStep("metadata", {
  title: "My Article",
  abstract: "",
  keywords: [],
});
// ["Abstract is required", "At least one keyword is required", ...]

// Group submissions for kanban
const grouped = groupByStatus(submissions);
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
