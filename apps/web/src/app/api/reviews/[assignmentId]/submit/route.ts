import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";

type Params = { params: Promise<{ assignmentId: string }> };

const submitReviewSchema = z.object({
  scores: z.array(z.object({
    criterionId: z.string().min(1),
    score: z.number().int().min(1).max(10),
    comment: z.string().max(2000).optional(),
  })),
  commentsToAuthor: z.string().min(1, "Comments to author are required").max(10000),
  commentsToEditor: z.string().max(10000).optional(),
  recommendation: z.enum(["Accept", "MinorRevision", "MajorRevision", "Reject"]),
});

// POST /api/reviews/[assignmentId]/submit
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { assignmentId } = await params;
      const body = await request.json();
      const data = validate(submitReviewSchema, body);

      const assignment = await prisma.reviewAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          form: { include: { criteria: true } },
          submission: { select: { journalId: true } },
        },
      });

      if (!assignment) return apiError("Review assignment not found", 404);
      if (assignment.reviewerId !== ctx.user.id) return apiError("Access denied", 403);
      if (!["Accepted", "InProgress"].includes(assignment.status)) {
        return apiError("Cannot submit review in current status", 400);
      }

      // Validate scores match form criteria
      if (assignment.form) {
        const requiredCriteria = assignment.form.criteria.filter((c) => c.required);
        const scoredIds = new Set(data.scores.map((s) => s.criterionId));
        const missing = requiredCriteria.filter((c) => !scoredIds.has(c.id));
        if (missing.length > 0) {
          return apiError(`Missing scores for: ${missing.map((c) => c.label).join(", ")}`, 400);
        }

        // Validate score ranges
        for (const score of data.scores) {
          const criterion = assignment.form.criteria.find((c) => c.id === score.criterionId);
          if (!criterion) return apiError(`Invalid criterion: ${score.criterionId}`, 400);
          if (score.score < criterion.minScore || score.score > criterion.maxScore) {
            return apiError(`Score for "${criterion.label}" must be ${criterion.minScore}-${criterion.maxScore}`, 400);
          }
        }
      }

      // Save review in a transaction
      const updated = await prisma.$transaction(async (tx) => {
        // Update assignment
        const result = await tx.reviewAssignment.update({
          where: { id: assignmentId },
          data: {
            status: "Completed",
            scores: data.scores,
            commentsToAuthor: data.commentsToAuthor,
            commentsToEditor: data.commentsToEditor,
            recommendation: data.recommendation,
            completedAt: new Date(),
          },
        });

        // Create structured ReviewScore records
        if (data.scores.length > 0) {
          await tx.reviewScore.createMany({
            data: data.scores.map((s) => ({
              assignmentId,
              criterionId: s.criterionId,
              score: s.score,
              comment: s.comment,
            })),
          });
        }

        // Update reviewer metrics
        const reviewerStats = await tx.reviewAssignment.aggregate({
          where: { reviewerId: ctx.user.id, status: "Completed" },
          _count: true,
          _avg: {
            // Calculate avg days from invite to completion
          },
        });

        const completedCount = reviewerStats._count;
        const declinedCount = await tx.reviewAssignment.count({
          where: { reviewerId: ctx.user.id, status: "Declined" },
        });

        await tx.user.update({
          where: { id: ctx.user.id },
          data: {
            totalCompleted: completedCount,
            totalDeclined: declinedCount,
            lastReviewDate: new Date(),
          },
        });

        return result;
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
