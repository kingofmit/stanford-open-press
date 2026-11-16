import { NextRequest, NextResponse } from "next/server";
import { prisma, type SubmissionStatus } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";
import { notifyDecision, notifyRevisionRequested } from "@/lib/email";

type Params = { params: Promise<{ submissionId: string }> };

const decisionSchema = z.object({
  decision: z.enum(["Accept", "MinorRevision", "MajorRevision", "Reject", "DeskReject", "Resubmit"]),
  commentsToAuthor: z.string().max(10000).optional(),
  internalNotes: z.string().max(5000).optional(),
  revisionDeadlineDays: z.number().int().min(7).max(180).optional(),
});

// POST /api/submissions/[submissionId]/decision
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const data = validate(decisionSchema, body);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { journalId: true, status: true },
      });

      if (!submission) return apiError("Submission not found", 404);

      if (!(await isJournalEditor(ctx.user.id, submission.journalId))) {
        return apiError("Only editors can make decisions", 403);
      }

      // Validate decision is appropriate for current status
      const allowedFrom: Record<string, string[]> = {
        Submitted: ["DeskReject"],
        DeskReview: ["DeskReject"],
        UnderReview: ["Accept", "MinorRevision", "MajorRevision", "Reject", "Resubmit"],
        RevisionSubmitted: ["Accept", "MinorRevision", "MajorRevision", "Reject"],
      };

      const allowed = allowedFrom[submission.status] || [];
      if (!allowed.includes(data.decision)) {
        return apiError(`Cannot make "${data.decision}" decision on a "${submission.status}" submission`, 400);
      }

      // Map decision to new submission status
      const statusMap: Record<string, SubmissionStatus> = {
        Accept: "Accepted",
        MinorRevision: "RevisionRequested",
        MajorRevision: "RevisionRequested",
        Reject: "Rejected",
        DeskReject: "Rejected",
        Resubmit: "Rejected",
      };

      const stageMap: Record<string, string> = {
        Accept: "EditorialDecision",
        MinorRevision: "Revision",
        MajorRevision: "Revision",
        Reject: "Rejected",
        DeskReject: "Rejected",
        Resubmit: "Rejected",
      };

      // Get current round
      const latestDecision = await prisma.editorialDecision.findFirst({
        where: { submissionId },
        orderBy: { round: "desc" },
      });
      const round = (latestDecision?.round || 0) + 1;

      const result = await prisma.$transaction(async (tx) => {
        // Create decision record
        const decision = await tx.editorialDecision.create({
          data: {
            submissionId,
            editorId: ctx.user.id,
            decision: data.decision,
            round,
            commentsToAuthor: data.commentsToAuthor,
            internalNotes: data.internalNotes,
          },
        });

        // Update submission status
        const newStatus = statusMap[data.decision];
        await tx.submission.update({
          where: { id: submissionId },
          data: {
            status: newStatus,
            stage: stageMap[data.decision] as never,
            ...(data.decision === "Accept" ? { acceptedAt: new Date() } : {}),
          },
        });

        // Record status change
        await tx.statusChange.create({
          data: {
            submissionId,
            fromStatus: submission.status as SubmissionStatus,
            toStatus: newStatus,
            actorId: ctx.user.id,
            comment: `Decision: ${data.decision}`,
          },
        });

        return decision;
      });

      // Send notifications (non-blocking)
      if (data.decision === "MinorRevision" || data.decision === "MajorRevision") {
        const deadlineDays = data.revisionDeadlineDays || (data.decision === "MinorRevision" ? 30 : 60);
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + deadlineDays);
        notifyRevisionRequested(submissionId, deadline, data.commentsToAuthor || "").catch(console.error);
      } else {
        notifyDecision(submissionId, data.decision, data.commentsToAuthor).catch(console.error);
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
