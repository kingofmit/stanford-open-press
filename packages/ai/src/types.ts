import type { ID } from "@stanford-press/core";

/** A match between a submission and a potential reviewer */
export interface ReviewerMatch {
  reviewerId: ID;
  /** Similarity score 0-100 */
  score: number;
  /** Expertise areas that overlap with the submission */
  matchingAreas: string[];
  /** Reason for the match recommendation */
  reason: string;
  /** Potential conflicts of interest detected */
  conflicts: string[];
}

/** Result of an automated desk review */
export interface DeskReviewResult {
  submissionId: ID;
  /** Overall assessment: pass, flag, or reject */
  assessment: "pass" | "flag" | "reject";
  /** Detailed checks performed */
  checks: DeskReviewCheck[];
  /** Overall confidence score 0-100 */
  confidence: number;
  /** Summary for the editor */
  summary: string;
}

/** A single check in the desk review */
export interface DeskReviewCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

/** A formatting issue detected in a manuscript */
export interface FormattingIssue {
  type: FormattingIssueType;
  severity: "error" | "warning" | "info";
  location: string;
  message: string;
  suggestion?: string;
}

/** Types of formatting issues */
export enum FormattingIssueType {
  CitationStyle = "citation-style",
  ReferenceIncomplete = "reference-incomplete",
  ReferenceUnresolved = "reference-unresolved",
  FigureMissing = "figure-missing",
  TableFormatting = "table-formatting",
  HeadingStructure = "heading-structure",
  AbstractLength = "abstract-length",
}

/** Quality score for an abstract */
export interface QualityScore {
  /** Overall quality 0-100 */
  overall: number;
  /** Readability score 0-100 */
  readability: number;
  /** Structural completeness: background, methods, results, conclusion */
  structure: number;
  /** Keyword coverage — how well keywords match the abstract content */
  keywordCoverage: number;
  /** Suggestions for improvement */
  suggestions: string[];
}

/** Result of an abstract translation */
export interface TranslationResult {
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  confidence: number;
}

/** Reviewer expertise profile for matching */
export interface ExpertiseProfile {
  reviewerId: ID;
  areas: string[];
  /** Embedding vector for semantic similarity */
  embedding?: number[];
  /** Keywords from past reviews */
  reviewKeywords: string[];
  /** h-index or similar metric if available */
  scholarMetrics?: { hIndex?: number; citations?: number };
}
