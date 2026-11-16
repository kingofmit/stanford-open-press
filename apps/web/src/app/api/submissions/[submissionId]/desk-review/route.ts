import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";
import { performDeskReview } from "@/lib/ai/desk-review";

type Params = { params: Promise<{ submissionId: string }> };

// POST /api/submissions/[submissionId]/desk-review — run desk review
export async function POST(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { journalId: true, status: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (!(await isJournalEditor(ctx.user.id, submission.journalId))) {
        return apiError("Only editors can run desk review", 403);
      }

      const result = await performDeskReview(submissionId);

      // Optionally transition to DeskReview status
      if (submission.status === "Submitted") {
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: "DeskReview", stage: "DeskReview" },
        });
      }

      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  });
}

// GET /api/submissions/[submissionId]/desk-review — get latest desk review
export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { journalId: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (!(await isJournalEditor(ctx.user.id, submission.journalId))) {
        return apiError("Access denied", 403);
      }

      const review = await prisma.deskReviewLog.findFirst({
        where: { submissionId },
        orderBy: { reviewedAt: "desc" },
      });

      if (!review) return apiError("No desk review found", 404);

      return NextResponse.json(review);
    } catch (error) {
      return handleError(error);
    }
  });
}
