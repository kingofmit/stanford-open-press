# @stanford-press/ai

AI-powered reviewer matching, automated desk review, smart formatting, abstract quality scoring, and translation for Stanford Open Press.

## Features

- **AI Reviewer Matching** — Semantic similarity and keyword overlap to find the best reviewers
- **Automated Desk Review** — Completeness validation, scope check, quality indicators
- **Formatting Agent** — Detect citation style issues, unresolved references, figure problems
- **Abstract Quality Scoring** — Readability, structure, and keyword coverage analysis
- **Conflict Detection** — Identify institutional and email-domain conflicts of interest
- **Translation** — Multilingual abstract support for discoverability

## Usage

```typescript
import { matchReviewers, performDeskReview, scoreAbstract, detectConflicts } from "@stanford-press/ai";

// Find matching reviewers
const matches = matchReviewers(
  { keywords: ["machine learning", "NLP", "transformers"] },
  reviewerProfiles,
  { maxResults: 5, minScore: 30 },
);

// Automated desk review
const review = performDeskReview("sub_123", {
  title: "Deep Learning for Text Classification",
  abstract: "We present a novel approach...",
  keywords: ["deep learning", "NLP"],
  authorCount: 3,
  hasManuscript: true,
  hasCoverLetter: true,
});

// Score abstract quality
const quality = scoreAbstract(
  "We present a novel approach using transformers...",
  ["deep learning", "NLP", "transformers"],
);
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
