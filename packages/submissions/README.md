# @stanford-press/submissions

Submission workflow state machine, file management, and author dashboard for Stanford Open Press.

## Features

- **Submission Model** — Title, abstract, authors, keywords, files, cover letter, metadata
- **Workflow State Machine** — Draft, Submitted, UnderReview, Revision, Accepted, Rejected, Published
- **File Management** — Manuscript versions, supplementary materials, figures
- **Validation** — Ensure submissions are complete before submission
- **Author Dashboard** — Track submission status and respond to reviews

## Usage

```typescript
import { createSubmission, SubmissionWorkflow, addFile, FileCategory } from "@stanford-press/submissions";

// Create a submission
const submission = createSubmission({
  journalId: "j_123",
  title: "A Novel Approach to Open Access Publishing",
  abstract: "We present a modern platform...",
  authors: [{ name: "Jane Doe", email: "jane@mit.edu", corresponding: true }],
  submitterId: "user_456",
});

// Track workflow state
const workflow = new SubmissionWorkflow();
workflow.transitionTo("submitted", "user_456");
workflow.transitionTo("under-review", "editor_789");
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
