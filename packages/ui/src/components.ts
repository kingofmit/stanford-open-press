import type {
  ArticlePageProps,
  ArticleCardProps,
  SubmissionWizardProps,
  ReviewInterfaceProps,
  EditorialDashboardProps,
  TableOfContentsProps,
  SearchResultsProps,
  WizardStep,
  JournalTheme,
} from "./types";

/**
 * Default submission wizard steps.
 */
export const DEFAULT_WIZARD_STEPS: WizardStep[] = [
  { id: "metadata", title: "Article Details", description: "Title, abstract, and keywords" },
  { id: "authors", title: "Authors", description: "Author information and order" },
  { id: "files", title: "Files", description: "Upload manuscript and supplementary files" },
  { id: "cover-letter", title: "Cover Letter", description: "Write a cover letter to the editor" },
  { id: "disclosures", title: "Disclosures", description: "Conflicts, funding, ethics" },
  { id: "review", title: "Review & Submit", description: "Review your submission before sending" },
];

/**
 * Default journal theme configuration.
 */
export const DEFAULT_THEME: JournalTheme = {
  primaryColor: "#1a1a2e",
  accentColor: "#e94560",
  headingFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  bodyFont: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  darkMode: false,
};

/**
 * Validate submission wizard data completeness for a given step.
 */
export function validateWizardStep(
  stepId: string,
  data: Partial<{
    title: string;
    abstract: string;
    keywords: string[];
    sectionId: string;
    authors: Array<{ name: string; email: string; corresponding: boolean }>;
    coverLetter: string;
    files: unknown[];
  }>,
): string[] {
  const errors: string[] = [];

  switch (stepId) {
    case "metadata":
      if (!data.title?.trim()) errors.push("Title is required");
      if (!data.abstract?.trim()) errors.push("Abstract is required");
      if (!data.keywords || data.keywords.length === 0) errors.push("At least one keyword is required");
      if (!data.sectionId) errors.push("Please select a journal section");
      break;
    case "authors":
      if (!data.authors || data.authors.length === 0) errors.push("At least one author is required");
      if (data.authors && !data.authors.some((a) => a.corresponding)) {
        errors.push("A corresponding author must be designated");
      }
      if (data.authors) {
        data.authors.forEach((a, i) => {
          if (!a.name?.trim()) errors.push(`Author ${i + 1}: name is required`);
          if (!a.email?.trim()) errors.push(`Author ${i + 1}: email is required`);
        });
      }
      break;
    case "files":
      if (!data.files || data.files.length === 0) errors.push("A manuscript file is required");
      break;
    case "cover-letter":
      // Optional step — no required fields
      break;
    case "disclosures":
      // Optional step — no required fields
      break;
    case "review":
      // Final validation happens on submission
      break;
  }

  return errors;
}

/**
 * Format an author list for display.
 * Example: "Jane Doe, John Smith, and Alice Johnson"
 */
export function formatAuthorList(authors: Array<{ name: string }>): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0].name;
  if (authors.length === 2) return `${authors[0].name} and ${authors[1].name}`;
  return `${authors.slice(0, -1).map((a) => a.name).join(", ")}, and ${authors[authors.length - 1].name}`;
}

/**
 * Truncate abstract text for display in cards.
 */
export function truncateAbstract(abstract: string, maxLength: number = 200): string {
  if (abstract.length <= maxLength) return abstract;
  const truncated = abstract.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}...`;
}

/**
 * Group articles by their status for the editorial dashboard kanban board.
 */
export function groupByStatus<T extends { status: string }>(
  items: T[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    if (!groups[item.status]) {
      groups[item.status] = [];
    }
    groups[item.status].push(item);
  }
  return groups;
}

/**
 * Calculate pagination info.
 */
export function getPagination(totalResults: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(totalResults / pageSize);
  return {
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    startIndex: (page - 1) * pageSize,
    endIndex: Math.min(page * pageSize, totalResults),
  };
}
