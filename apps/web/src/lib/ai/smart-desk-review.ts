import { prisma } from "@stanford-press/database";
import { callLLM } from "./llm";
import { performDeskReview, type DeskReviewResult } from "./desk-review";

/**
 * Enhanced desk review using LLM for scope analysis and methodology screening.
 * Falls back to rule-based review if no LLM is configured.
 */
export async function performSmartDeskReview(submissionId: string): Promise<DeskReviewResult> {
  // Always run the rule-based checks first
  const baseResult = await performDeskReview(submissionId);

  // Try LLM enhancement
  const hasLLM = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  if (!hasLLM) return baseResult;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      journal: { select: { name: true, description: true } },
    },
  });

  if (!submission || !submission.abstract) return baseResult;

  try {
    const response = await callLLM([
      {
        role: "system",
        content: `You are a desk review assistant for an academic journal. Analyze submissions for scope fit, methodology quality, and completeness. Be constructive and specific. Respond in JSON format with this structure:
{
  "scopeFit": { "score": 1-10, "explanation": "..." },
  "methodologyFlags": ["list of concerns or empty"],
  "languageQuality": { "score": 1-10, "explanation": "..." },
  "overallRecommendation": "pass" | "flag" | "reject",
  "summary": "2-3 sentence summary"
}`
      },
      {
        role: "user",
        content: `Journal: ${submission.journal.name}
Journal scope: ${submission.journal.description || "Not specified"}

Submission title: ${submission.title}
Abstract: ${submission.abstract}
Keywords: ${submission.keywords.join(", ")}

Please evaluate this submission for desk review.`
      },
    ], { maxTokens: 800, temperature: 0.2 });

    // Parse LLM response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return baseResult;

    let llmAnalysis: any;
    try {
      llmAnalysis = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse LLM response as JSON");
      return baseResult;
    }

    // Merge LLM checks with rule-based checks
    if (llmAnalysis.scopeFit) {
      const existing = baseResult.checks.findIndex((c) => c.name === "Scope Fit");
      const scopeCheck = {
        name: "Scope Fit (AI)",
        status: (llmAnalysis.scopeFit.score >= 7 ? "pass" : llmAnalysis.scopeFit.score >= 4 ? "warn" : "fail") as "pass" | "warn" | "fail",
        message: llmAnalysis.scopeFit.explanation,
      };
      if (existing >= 0) baseResult.checks[existing] = scopeCheck;
      else baseResult.checks.push(scopeCheck);
    }

    if (llmAnalysis.methodologyFlags?.length > 0) {
      baseResult.checks.push({
        name: "Methodology (AI)",
        status: "warn",
        message: llmAnalysis.methodologyFlags.join("; "),
      });
    }

    if (llmAnalysis.languageQuality) {
      baseResult.checks.push({
        name: "Language Quality (AI)",
        status: llmAnalysis.languageQuality.score >= 7 ? "pass" : llmAnalysis.languageQuality.score >= 4 ? "warn" : "fail",
        message: llmAnalysis.languageQuality.explanation,
      });
    }

    // Update summary with LLM insight
    if (llmAnalysis.summary) {
      baseResult.summary = llmAnalysis.summary;
    }

    // Recalculate assessment
    const failCount = baseResult.checks.filter((c) => c.status === "fail").length;
    const warnCount = baseResult.checks.filter((c) => c.status === "warn").length;

    if (failCount >= 2) baseResult.assessment = "reject";
    else if (failCount >= 1 || warnCount >= 3) baseResult.assessment = "flag";
    else baseResult.assessment = "pass";

    // Update the database record
    try {
      await prisma.deskReviewLog.updateMany({
        where: { submissionId },
        data: {
          assessment: baseResult.assessment,
          checks: baseResult.checks as any,
          summary: baseResult.summary,
        },
      });
    } catch (err) {
      console.error("Failed to update desk review log:", err);
    }

    return baseResult;
  } catch (err) {
    console.error("LLM desk review failed, using rule-based result:", err);
    return baseResult;
  }
}
