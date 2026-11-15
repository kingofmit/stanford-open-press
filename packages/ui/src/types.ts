/** Props for the ArticlePage component */
export interface ArticlePageProps {
  title: string;
  authors: Array<{
    name: string;
    affiliation?: string;
    orcid?: string;
  }>;
  abstract: string;
  keywords: string[];
  doi?: string;
  publishedDate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  body?: string;
  references?: Array<{ id: string; text: string }>;
  figures?: Array<{ id: string; src: string; caption: string }>;
}

/** Props for the ArticleCard component */
export interface ArticleCardProps {
  title: string;
  authors: string[];
  abstract: string;
  doi?: string;
  publishedDate?: string;
  href: string;
  keywords?: string[];
}

/** Props for the SubmissionWizard component */
export interface SubmissionWizardProps {
  journalId: string;
  sections: Array<{ id: string; name: string }>;
  onSubmit: (data: SubmissionWizardData) => void | Promise<void>;
  onSaveDraft?: (data: Partial<SubmissionWizardData>) => void;
}

/** Data collected by the submission wizard */
export interface SubmissionWizardData {
  title: string;
  abstract: string;
  keywords: string[];
  sectionId: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation?: string;
    orcid?: string;
    corresponding: boolean;
  }>;
  coverLetter: string;
  files: File[];
  metadata: {
    conflictOfInterest?: string;
    funding?: string;
    dataAvailability?: string;
    ethicsApproval?: string;
  };
}

/** Wizard step definition */
export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  /** Whether this step is optional */
  optional?: boolean;
}

/** Props for the ReviewInterface component */
export interface ReviewInterfaceProps {
  submissionTitle: string;
  manuscriptUrl: string;
  criteria: Array<{
    id: string;
    label: string;
    description?: string;
    minScore: number;
    maxScore: number;
  }>;
  onSubmit: (review: ReviewFormData) => void | Promise<void>;
}

/** Data from the review form */
export interface ReviewFormData {
  scores: Array<{ criterionId: string; score: number; comment?: string }>;
  commentsToAuthor: string;
  commentsToEditor?: string;
  decision: string;
}

/** Props for the EditorialDashboard component */
export interface EditorialDashboardProps {
  stats: {
    totalActive: number;
    awaitingDecision: number;
    overdueReviews: number;
    acceptanceRate: number;
  };
  submissions: Array<{
    id: string;
    title: string;
    status: string;
    authors: string[];
    submittedAt: string;
  }>;
  onSelect: (submissionId: string) => void;
}

/** Props for the TableOfContents component */
export interface TableOfContentsProps {
  issue: {
    title: string;
    volume?: string;
    number?: string;
    publishedDate?: string;
  };
  articles: ArticleCardProps[];
}

/** Props for the SearchResults component */
export interface SearchResultsProps {
  query: string;
  results: ArticleCardProps[];
  totalResults: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Theme configuration */
export interface JournalTheme {
  /** Primary brand color */
  primaryColor: string;
  /** Secondary/accent color */
  accentColor: string;
  /** Font family for headings */
  headingFont: string;
  /** Font family for body text */
  bodyFont: string;
  /** Logo URL */
  logoUrl?: string;
  /** Dark mode enabled */
  darkMode: boolean;
}
