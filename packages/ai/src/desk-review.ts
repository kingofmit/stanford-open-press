import type { DeskReviewResult, DeskReviewCheck } from "./types";
import type { ID } from "@stanford-press/core";

/**
 * Perform an automated desk review on a submission.
 * Checks completeness, formatting, and basic quality indicators.
 */
export function performDeskReview(
  submissionId: ID,
  submission: {
    title: string;
    abstract: string;
    keywords: string[];
    authorCount: number;
    hasManuscript: boolean;
    hasCoverLetter: boolean;
    wordCount?: number;
    referenceCount?: number;
  },
): DeskReviewResult {
  const checks: DeskReviewCheck[] = [];

  // Title check
  checks.push(
    submission.title.length >= 10
      ? { name: "Title present", status: "pass", message: "Title is adequate length" }
      : { name: "Title present", status: "fail", message: "Title is too short or missing" },
  );

  // Abstract check
  if (submission.abstract.length >= 100) {
    checks.push({ name: "Abstract length", status: "pass", message: "Abstract meets minimum length" });
  } else if (submission.abstract.length >= 50) {
    checks.push({ name: "Abstract length", status: "warn", message: "Abstract is shorter than recommended (100+ words)" });
  } else {
    checks.push({ name: "Abstract length", status: "fail", message: "Abstract is too short" });
  }

  // Abstract structure check
  const hasStructure =
    submission.abstract.toLowerCase().includes("method") ||
    submission.abstract.toLowerCase().includes("result") ||
    submission.abstract.toLowerCase().includes("conclusion");
  checks.push(
    hasStructure
      ? { name: "Abstract structure", status: "pass", message: "Abstract contains key structural elements" }
      : { name: "Abstract structure", status: "warn", message: "Abstract may lack structured sections (methods, results, conclusions)" },
  );

  // Keywords check
  checks.push(
    submission.keywords.length >= 3
      ? { name: "Keywords", status: "pass", message: `${submission.keywords.length} keywords provided` }
      : { name: "Keywords", status: "warn", message: "Fewer than 3 keywords — consider adding more" },
  );

  // Author check
  checks.push(
    submission.authorCount >= 1
      ? { name: "Authors", status: "pass", message: `${submission.authorCount} author(s) listed` }
      : { name: "Authors", status: "fail", message: "No authors listed" },
  );

  // Manuscript file check
  checks.push(
    submission.hasManuscript
      ? { name: "Manuscript file", status: "pass", message: "Manuscript file uploaded" }
      : { name: "Manuscript file", status: "fail", message: "No manuscript file attached" },
  );

  // Cover letter check
  checks.push(
    submission.hasCoverLetter
      ? { name: "Cover letter", status: "pass", message: "Cover letter included" }
      : { name: "Cover letter", status: "warn", message: "No cover letter — recommended for most journals" },
  );

  // Word count check
  if (submission.wordCount !== undefined) {
    if (submission.wordCount >= 2000 && submission.wordCount <= 12000) {
      checks.push({ name: "Word count", status: "pass", message: `${submission.wordCount} words — within typical range` });
    } else if (submission.wordCount < 2000) {
      checks.push({ name: "Word count", status: "warn", message: `${submission.wordCount} words — shorter than typical` });
    } else {
      checks.push({ name: "Word count", status: "warn", message: `${submission.wordCount} words — longer than typical` });
    }
  }

  // Reference count check
  if (submission.referenceCount !== undefined) {
    checks.push(
      submission.referenceCount >= 10
        ? { name: "References", status: "pass", message: `${submission.referenceCount} references cited` }
        : { name: "References", status: "warn", message: `Only ${submission.referenceCount} references — may need more` },
    );
  }

  // Determine overall assessment
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  let assessment: "pass" | "flag" | "reject";
  if (failCount >= 2) {
    assessment = "reject";
  } else if (failCount >= 1 || warnCount >= 3) {
    assessment = "flag";
  } else {
    assessment = "pass";
  }

  const confidence = Math.round(
    (checks.filter((c) => c.status === "pass").length / checks.length) * 100,
  );

  const summary =
    assessment === "pass"
      ? "Submission passes automated desk review. Ready for peer review assignment."
      : assessment === "flag"
        ? `Submission flagged for editor attention: ${failCount} critical issue(s), ${warnCount} warning(s).`
        : `Submission does not meet minimum requirements: ${failCount} critical issue(s).`;

  return {
    submissionId,
    assessment,
    checks,
    confidence,
    summary,
  };
}
