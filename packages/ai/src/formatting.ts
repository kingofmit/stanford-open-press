import type { FormattingIssue } from "./types";
import { FormattingIssueType } from "./types";

/**
 * Check abstract quality and return a quality score with suggestions.
 */
export function scoreAbstract(
  abstract: string,
  keywords: string[],
): { overall: number; readability: number; structure: number; keywordCoverage: number; suggestions: string[] } {
  const suggestions: string[] = [];

  // Readability: sentence length and complexity
  const sentences = abstract.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? abstract.split(/\s+/).length / sentences.length
    : 0;

  let readability = 80;
  if (avgSentenceLength > 30) {
    readability -= 20;
    suggestions.push("Consider breaking up long sentences for better readability");
  } else if (avgSentenceLength > 25) {
    readability -= 10;
    suggestions.push("Some sentences may benefit from being shorter");
  }
  if (sentences.length < 3) {
    readability -= 20;
    suggestions.push("Abstract may be too brief — consider expanding");
  }

  // Structure: check for key sections
  const lower = abstract.toLowerCase();
  const hasBackground = lower.includes("background") || lower.includes("introduction") || lower.includes("purpose");
  const hasMethods = lower.includes("method") || lower.includes("approach") || lower.includes("design");
  const hasResults = lower.includes("result") || lower.includes("finding") || lower.includes("show");
  const hasConclusion = lower.includes("conclusion") || lower.includes("implication") || lower.includes("suggest");

  let structure = 0;
  const sections = [hasBackground, hasMethods, hasResults, hasConclusion];
  structure = Math.round((sections.filter(Boolean).length / 4) * 100);

  if (!hasBackground) suggestions.push("Consider adding background/context to the abstract");
  if (!hasMethods) suggestions.push("Consider mentioning the methodology");
  if (!hasResults) suggestions.push("Consider summarizing key results");
  if (!hasConclusion) suggestions.push("Consider adding conclusions or implications");

  // Keyword coverage
  const abstractWords = new Set(lower.split(/\s+/));
  const matchedKeywords = keywords.filter((k) =>
    k.toLowerCase().split(/\s+/).some((w) => abstractWords.has(w)),
  );
  const keywordCoverage = keywords.length > 0
    ? Math.round((matchedKeywords.length / keywords.length) * 100)
    : 0;

  if (keywordCoverage < 50) {
    suggestions.push("Several keywords do not appear in the abstract — consider revising for better discoverability");
  }

  const overall = Math.round((readability + structure + keywordCoverage) / 3);

  return { overall, readability, structure, keywordCoverage, suggestions };
}

/**
 * Detect common formatting issues in manuscript text.
 */
export function detectFormattingIssues(text: string): FormattingIssue[] {
  const issues: FormattingIssue[] = [];

  // Check for unreferenced figures
  const figureRefs = text.match(/Figure\s+\d+/gi) ?? [];
  const figureLabels = text.match(/Fig\.\s*\d+/gi) ?? [];
  if (figureRefs.length === 0 && figureLabels.length === 0 && text.length > 5000) {
    issues.push({
      type: FormattingIssueType.FigureMissing,
      severity: "warning",
      location: "document",
      message: "No figure references found in the manuscript",
      suggestion: "If the manuscript contains figures, ensure they are referenced in the text",
    });
  }

  // Check for incomplete references (e.g., "et al" without year)
  const etAlWithoutYear = text.match(/et al\.(?!\s*[,(]\s*\d{4})/g);
  if (etAlWithoutYear && etAlWithoutYear.length > 0) {
    issues.push({
      type: FormattingIssueType.ReferenceIncomplete,
      severity: "warning",
      location: "references",
      message: `Found ${etAlWithoutYear.length} "et al." citation(s) without an accompanying year`,
      suggestion: "Ensure all in-text citations include the publication year",
    });
  }

  // Check for unresolved citation placeholders
  const placeholders = text.match(/\[?\?\??\]?/g) ?? [];
  const questionCitations = text.match(/\[\?\]/g) ?? [];
  if (questionCitations.length > 0) {
    issues.push({
      type: FormattingIssueType.ReferenceUnresolved,
      severity: "error",
      location: "document",
      message: `Found ${questionCitations.length} unresolved citation placeholder(s) [?]`,
      suggestion: "Resolve all citation placeholders before submission",
    });
  }

  // Check abstract length
  const abstractMatch = text.match(/abstract[:\s]+([\s\S]{0,3000}?)(?=\n\n|introduction|keywords)/i);
  if (abstractMatch) {
    const abstractWords = abstractMatch[1].trim().split(/\s+/).length;
    if (abstractWords > 300) {
      issues.push({
        type: FormattingIssueType.AbstractLength,
        severity: "warning",
        location: "abstract",
        message: `Abstract is ${abstractWords} words — most journals require under 300`,
        suggestion: "Consider shortening the abstract to meet journal guidelines",
      });
    }
  }

  return issues;
}
