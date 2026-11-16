import { NextRequest, NextResponse } from "next/server";
import { prisma, type SubmissionStatus } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";

type Params = { params: Promise<{ submissionId: string }> };

const VALID_TRANSITIONS: Record<string, string[]> = {
  Submitted: ["DeskReview", "UnderReview", "Rejected"],
  DeskReview: ["UnderReview", "Rejected"],
  UnderReview: ["RevisionRequested", "Accepted", "Rejected"],
  RevisionRequested: ["RevisionSubmitted"],
  RevisionSubmitted: ["UnderReview", "Accepted", "Rejected"],
  Accepted: ["InCopyediting"],
  InCopyediting: ["InProduction"],
  InProduction: ["Scheduled", "Published"],
  Scheduled: ["Published"],
};

const transitionSchema = z.object({
  status: z.string(),
  comment: z.string().optional(),
});

// POST /api/submissions/[submissionId]/status
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const data = validate(transitionSchema, body);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { status: true, journalId: true, submitterId: true },
      });

      if (!submission) return apiError("Submission not found", 404);

      // Check editor permission
      const isEditor = await prisma.roleAssignment.findFirst({
        where: {
          userId: ctx.user.id,
          journalId: submission.journalId,
          role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor", "GuestEditor"] },
        },
      });

      // Authors can only submit revisions
      const isAuthor = submission.submitterId === ctx.user.id;
      if (!isEditor && !(isAuthor && submission.status === "RevisionRequested" && data.status === "RevisionSubmitted")) {
        return apiError("Access denied", 403);
      }

      // Validate transition
      const allowed = VALID_TRANSITIONS[submission.status] || [];
      if (!allowed.includes(data.status)) {
        return apiError(`Cannot transition from ${submission.status} to ${data.status}`, 400);
      }

      // Map status to workflow stage
      const stageMap: Record<string, string> = {
        DeskReview: "DeskReview",
        UnderReview: "PeerReview",
        RevisionRequested: "Revision",
        RevisionSubmitted: "Revision",
        Accepted: "EditorialDecision",
        InCopyediting: "Copyediting",
        InProduction: "Production",
        Published: "Published",
        Rejected: "Rejected",
      };

      const updated = await prisma.$transaction(async (tx) => {
        const sub = await tx.submission.update({
          where: { id: submissionId },
          data: {
            status: data.status as SubmissionStatus,
            stage: (stageMap[data.status] || submission.status) as never,
            ...(data.status === "Accepted" ? { acceptedAt: new Date() } : {}),
            ...(data.status === "Published" ? { publishedAt: new Date() } : {}),
          },
        });

        await tx.statusChange.create({
          data: {
            submissionId,
            fromStatus: submission.status as SubmissionStatus,
            toStatus: data.status as SubmissionStatus,
            actorId: ctx.user.id,
            comment: data.comment,
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
