import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, handleError, apiError } from "@/lib/api";

type Params = { params: Promise<{ submissionId: string }> };

const updateSubmissionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  abstract: z.string().max(5000).optional(),
  keywords: z.array(z.string()).max(10).optional(),
  sectionId: z.string().optional(),
  coverLetter: z.string().max(5000).optional(),
  conflictOfInterest: z.string().max(2000).optional(),
  funding: z.string().max(2000).optional(),
  dataAvailability: z.string().max(2000).optional(),
  ethicsApproval: z.string().max(2000).optional(),
  suggestedReviewers: z.array(z.string()).optional(),
  opposedReviewers: z.array(z.string()).optional(),
});

// GET /api/submissions/[submissionId]
export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          journal: { select: { id: true, name: true, slug: true } },
          section: { select: { id: true, name: true } },
          authors: { orderBy: { sortOrder: "asc" } },
          files: { orderBy: { uploadedAt: "desc" } },
          reviews: {
            include: {
              reviewer: { select: { id: true, name: true } },
            },
          },
          decisions: {
            include: {
              editor: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          statusHistory: { orderBy: { createdAt: "desc" } },
          _count: { select: { reviews: true, files: true } },
        },
      });

      if (!submission) return apiError("Submission not found", 404);

      // Check access: submitter, editor, or reviewer
      const isSubmitter = submission.submitterId === ctx.user.id;
      const isEditor = await prisma.roleAssignment.findFirst({
        where: {
          userId: ctx.user.id,
          journalId: submission.journalId,
          role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor", "GuestEditor"] },
        },
      });
      const isReviewer = submission.reviews.some((r) => r.reviewerId === ctx.user.id);

      if (!isSubmitter && !isEditor && !isReviewer) {
        return apiError("Access denied", 403);
      }

      // Strip confidential info from reviews if user is the author
      if (isSubmitter && !isEditor) {
        submission.reviews = submission.reviews.map((r) => ({
          ...r,
          commentsToEditor: null,
          reviewer: { id: "", name: "Anonymous Reviewer" },
        }));
      }

      return NextResponse.json(submission);
    } catch (error) {
      return handleError(error);
    }
  });
}

// PATCH /api/submissions/[submissionId] — update draft
export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const data = validate(updateSubmissionSchema, body);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { submitterId: true, status: true, journalId: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (submission.submitterId !== ctx.user.id) return apiError("Access denied", 403);
      if (submission.status !== "Draft" && submission.status !== "RevisionRequested") {
        return apiError("Can only edit drafts or revisions", 400);
      }

      if (data.sectionId) {
        const section = await prisma.journalSection.findUnique({
          where: { id: data.sectionId },
        });
        if (!section || section.journalId !== submission.journalId) {
          return apiError("Section does not belong to this journal", 400);
        }
      }

      const updated = await prisma.submission.update({
        where: { id: submissionId },
        data,
        include: {
          authors: { orderBy: { sortOrder: "asc" } },
          files: true,
        },
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
