import { prisma } from "@stanford-press/database";

export interface DeskReviewCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface DeskReviewResult {
  submissionId: string;
  assessment: "pass" | "flag" | "reject";
  confidence: number;
  checks: DeskReviewCheck[];
  summary: string;
}

/**
 * Perform automated desk review on a submission.
 * Checks completeness, formatting, and basic quality signals.
 */
export async function performDeskReview(submissionId: string): Promise<DeskReviewResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      authors: true,
      files: true,
      journal: {
        select: { name: true, description: true, peerReviewType: true },
      },
    },
  });

  if (!submission) throw new Error("Submission not found");

  const checks: DeskReviewCheck[] = [];

  // 1. Title check
  if (!submission.title || submission.title.length < 10) {
    checks.push({ name: "Title", status: "fail", message: "Title is too short or missing" });
  } else if (submission.title.length > 300) {
    checks.push({ name: "Title", status: "warn", message: `Title is very long (${submission.title.length} chars). Consider shortening.` });
  } else {
    checks.push({ name: "Title", status: "pass", message: "Title is present and reasonable length" });
  }

  // 2. Abstract check
  if (!submission.abstract) {
    checks.push({ name: "Abstract", status: "fail", message: "Abstract is missing" });
  } else {
    const wordCount = submission.abstract.split(/\s+/).length;
    if (wordCount < 50) {
      checks.push({ name: "Abstract", status: "warn", message: `Abstract is very short (${wordCount} words). Most journals require 150-300 words.` });
    } else if (wordCount > 500) {
      checks.push({ name: "Abstract", status: "warn", message: `Abstract is long (${wordCount} words). Consider condensing to 150-300 words.` });
    } else {
      checks.push({ name: "Abstract", status: "pass", message: `Abstract is ${wordCount} words` });
    }

    // Check for structured abstract indicators
    const hasStructure = /\b(background|objective|method|result|conclusion)\b/i.test(submission.abstract);
    if (hasStructure) {
      checks.push({ name: "Abstract Structure", status: "pass", message: "Abstract appears to have structured sections" });
    }
  }

  // 3. Authors check
  if (submission.authors.length === 0) {
    checks.push({ name: "Authors", status: "fail", message: "No authors listed" });
  } else {
    const hasCorresponding = submission.authors.some((a) => a.corresponding);
    if (!hasCorresponding) {
      checks.push({ name: "Corresponding Author", status: "fail", message: "No corresponding author designated" });
    } else {
      checks.push({ name: "Authors", status: "pass", message: `${submission.authors.length} author(s) listed with corresponding author` });
    }

    // Check for affiliations
    const withoutAffiliation = submission.authors.filter((a) => !a.affiliation);
    if (withoutAffiliation.length > 0) {
      checks.push({ name: "Affiliations", status: "warn", message: `${withoutAffiliation.length} author(s) missing affiliation` });
    } else {
      checks.push({ name: "Affiliations", status: "pass", message: "All authors have affiliations" });
    }
  }

  // 4. Manuscript file check
  const manuscripts = submission.files.filter((f) => f.category === "Manuscript");
  if (manuscripts.length === 0) {
    checks.push({ name: "Manuscript", status: "fail", message: "No manuscript file uploaded" });
  } else {
    const latestMs = manuscripts[0];
    const sizeMB = latestMs.sizeBytes / (1024 * 1024);
    checks.push({ name: "Manuscript", status: "pass", message: `Manuscript uploaded (${sizeMB.toFixed(1)} MB)` });

    if (sizeMB > 20) {
      checks.push({ name: "File Size", status: "warn", message: "Manuscript file is very large. Consider compressing images." });
    }
  }

  // 5. Keywords check
  if (submission.keywords.length === 0) {
    checks.push({ name: "Keywords", status: "warn", message: "No keywords provided" });
  } else if (submission.keywords.length < 3) {
    checks.push({ name: "Keywords", status: "warn", message: `Only ${submission.keywords.length} keyword(s). Most journals recommend 3-6.` });
  } else {
    checks.push({ name: "Keywords", status: "pass", message: `${submission.keywords.length} keywords provided` });
  }

  // 6. Cover letter check
  if (!submission.coverLetter) {
    checks.push({ name: "Cover Letter", status: "warn", message: "No cover letter provided (recommended)" });
  } else {
    checks.push({ name: "Cover Letter", status: "pass", message: "Cover letter present" });
  }

  // 7. Conflict of interest
  if (!submission.conflictOfInterest) {
    checks.push({ name: "Conflict of Interest", status: "warn", message: "No conflict of interest statement" });
  } else {
    checks.push({ name: "Conflict of Interest", status: "pass", message: "COI statement provided" });
  }

  // 8. Ethics approval (check if likely needed based on keywords)
  const ethicsKeywords = /\b(human|patient|clinical|trial|participant|subject|animal|mouse|rat|primate)\b/i;
  const likelyNeedsEthics = ethicsKeywords.test(submission.abstract || "") || ethicsKeywords.test(submission.title);
  if (likelyNeedsEthics && !submission.ethicsApproval) {
    checks.push({ name: "Ethics Approval", status: "warn", message: "Research may involve human/animal subjects but no ethics approval statement provided" });
  } else if (submission.ethicsApproval) {
    checks.push({ name: "Ethics Approval", status: "pass", message: "Ethics approval statement provided" });
  }

  // 9. Data availability
  if (!submission.dataAvailability) {
    checks.push({ name: "Data Availability", status: "warn", message: "No data availability statement" });
  } else {
    checks.push({ name: "Data Availability", status: "pass", message: "Data availability statement provided" });
  }

  // 10. Scope check (basic keyword matching against journal description)
  if (submission.journal.description && submission.abstract) {
    const journalWords = new Set(
      submission.journal.description.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
    );
    const abstractWords = submission.abstract.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const overlap = abstractWords.filter((w) => journalWords.has(w));
    const overlapRatio = journalWords.size > 0 ? overlap.length / abstractWords.length : 0;

    if (overlapRatio < 0.02) {
      checks.push({ name: "Scope Fit", status: "warn", message: "Low keyword overlap with journal description. May be out of scope." });
    } else {
      checks.push({ name: "Scope Fit", status: "pass", message: "Keywords overlap with journal scope" });
    }
  }

  // Calculate assessment
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const passCount = checks.filter((c) => c.status === "pass").length;

  let assessment: "pass" | "flag" | "reject";
  let confidence: number;

  if (failCount >= 2) {
    assessment = "reject";
    confidence = Math.min(95, 60 + failCount * 10);
  } else if (failCount >= 1 || warnCount >= 3) {
    assessment = "flag";
    confidence = Math.min(90, 50 + failCount * 15 + warnCount * 5);
  } else {
    assessment = "pass";
    confidence = Math.min(95, 60 + passCount * 3);
  }

  const summary = assessment === "reject"
    ? `Submission has ${failCount} critical issue(s) that require attention before review.`
    : assessment === "flag"
      ? `Submission has ${failCount} issue(s) and ${warnCount} warning(s) that the editor should review.`
      : `Submission passes automated checks with ${passCount} items verified.`;

  const result: DeskReviewResult = {
    submissionId,
    assessment,
    confidence,
    checks,
    summary,
  };

  // Store result in database
  await prisma.deskReviewLog.create({
    data: {
      submissionId,
      assessment,
      confidence,
      checks: checks as any,
      summary,
    },
  });

  return result;
}
