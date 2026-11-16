import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

type Params = { params: Promise<{ assignmentId: string }> };

// GET /api/reviews/[assignmentId] — get review assignment with form
export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { assignmentId } = await params;

      const assignment = await prisma.reviewAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          submission: {
            select: {
              id: true,
              title: true,
              abstract: true,
              keywords: true,
              journalId: true,
              submitterId: true,
              files: {
                where: { category: { in: ["Manuscript", "Supplementary", "Figure", "Table"] } },
                select: { id: true, filename: true, category: true, storagePath: true, version: true },
                orderBy: { uploadedAt: "desc" },
              },
              authors: {
                orderBy: { sortOrder: "asc" },
                select: { givenName: true, familyName: true, affiliation: true },
              },
            },
          },
          form: {
            include: {
              criteria: { orderBy: { sortOrder: "asc" } },
            },
          },
          reviewScores: true,
          reviewer: { select: { id: true, name: true } },
        },
      });

      if (!assignment) return apiError("Review assignment not found", 404);

      const isReviewer = assignment.reviewerId === ctx.user.id;
      const isEditor = await isJournalEditor(ctx.user.id, assignment.submission.journalId);

      if (!isReviewer && !isEditor) return apiError("Access denied", 403);

      // For double-blind reviews, strip author info for the reviewer
      if (assignment.reviewType === "DoubleBlind" && isReviewer && !isEditor) {
        assignment.submission.authors = [];
      }

      return NextResponse.json(assignment);
    } catch (error) {
      return handleError(error);
    }
  });
}
