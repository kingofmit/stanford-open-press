import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

type Params = { params: Promise<{ assignmentId: string }> };

// POST /api/reviews/[assignmentId]/cancel
export async function POST(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { assignmentId } = await params;

      const assignment = await prisma.reviewAssignment.findUnique({
        where: { id: assignmentId },
        include: { submission: { select: { journalId: true } } },
      });

      if (!assignment) return apiError("Assignment not found", 404);

      if (!(await isJournalEditor(ctx.user.id, assignment.submission.journalId))) {
        return apiError("Only editors can cancel reviews", 403);
      }

      if (assignment.status === "Completed") {
        return apiError("Cannot cancel a completed review", 400);
      }

      await prisma.reviewAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "Cancelled",
          invitationToken: null,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error);
    }
  });
}
