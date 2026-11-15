# @stanford-press/review

Peer review management, reviewer assignment, review forms, and performance tracking for Stanford Open Press.

## Features

- **Review Types** — Single-blind, double-blind, and open review
- **Review Form Builder** — Customizable criteria with weighted scoring rubrics
- **Reviewer Invitations** — Accept/decline workflow with deadline tracking
- **Review Decisions** — Accept, minor revision, major revision, reject
- **Performance Tracking** — Response time, quality score, expertise areas
- **Overdue Detection** — Automatic detection of late reviews

## Usage

```typescript
import {
  createReviewForm,
  inviteReviewer,
  acceptInvitation,
  calculateWeightedScore,
  ReviewType,
} from "@stanford-press/review";

// Create a review form
const form = createReviewForm({
  journalId: "j_123",
  name: "Research Article Review",
  criteria: [
    { label: "Originality", minScore: 1, maxScore: 5, required: true, weight: 2 },
    { label: "Methodology", minScore: 1, maxScore: 5, required: true, weight: 3 },
  ],
});

// Invite a reviewer
const assignment = inviteReviewer({
  submissionId: "sub_456",
  reviewerId: "user_789",
  assignedBy: "editor_001",
  reviewType: ReviewType.DoubleBlind,
  formId: form.id,
  deadlineDays: 21,
});

// Reviewer accepts
const accepted = acceptInvitation(assignment);
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
