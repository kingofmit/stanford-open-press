import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, apiError, handleError } from "@/lib/api";

type Params = { params: Promise<{ submissionId: string }> };

// POST /api/submissions/[submissionId]/submit
export async function POST(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          authors: true,
          files: { where: { category: "Manuscript" } },
        },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (submission.submitterId !== ctx.user.id) return apiError("Access denied", 403);
      if (submission.status !== "Draft") return apiError("Can only submit drafts", 400);

      // Validate required fields
      const errors: string[] = [];
      if (!submission.title) errors.push("Title is required");
      if (!submission.abstract) errors.push("Abstract is required");
      if (submission.authors.length === 0) errors.push("At least one author is required");
      if (submission.files.length === 0) errors.push("Manuscript file is required");
      if (!submission.authors.some((a) => a.corresponding)) {
        errors.push("A corresponding author must be designated");
      }

      if (errors.length > 0) {
        return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
      }

      // Transition to Submitted
      const updated = await prisma.$transaction(async (tx) => {
        const sub = await tx.submission.update({
          where: { id: submissionId },
          data: {
            status: "Submitted",
            stage: "Submission",
            submittedAt: new Date(),
          },
        });

        await tx.statusChange.create({
          data: {
            submissionId,
            fromStatus: "Draft",
            toStatus: "Submitted",
            actorId: ctx.user.id,
          },
        });

        return sub;
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
