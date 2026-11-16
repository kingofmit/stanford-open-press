import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";
import { matchReviewers } from "@/lib/ai/reviewer-matching";

type Params = { params: Promise<{ submissionId: string }> };

// GET /api/submissions/[submissionId]/match-reviewers
export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const maxResults = parseInt(new URL(request.url).searchParams.get("limit") || "10");

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { journalId: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (!(await isJournalEditor(ctx.user.id, submission.journalId))) {
        return apiError("Only editors can match reviewers", 403);
      }

      const matches = await matchReviewers({
        submissionId,
        maxResults: Math.min(maxResults, 20),
      });

      return NextResponse.json(matches);
    } catch (error) {
      return handleError(error);
    }
  });
}
