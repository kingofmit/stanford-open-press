import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

type Params = { params: Promise<{ submissionId: string }> };

const startCopyeditSchema = z.object({
  copyeditorId: z.string().min(1),
});

const updateCopyeditSchema = z.object({
  status: z.enum(["InProgress", "AuthorReview", "Completed"]).optional(),
  notes: z.array(z.object({
    text: z.string(),
    location: z.string().optional(),
    resolved: z.boolean().default(false),
  })).optional(),
});

// GET /api/submissions/[submissionId]/copyedit
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
      const records = await prisma.copyeditRecord.findMany({
        where: { submissionId },
        include: {
          copyeditor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { assignedAt: "desc" },
      });
      return NextResponse.json(records);
    } catch (error) {
      return handleError(error);
    }
  });
}

// POST /api/submissions/[submissionId]/copyedit — start copyediting
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const data = validate(startCopyeditSchema, body);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { journalId: true, status: true },
      });
      if (!submission) return apiError("Submission not found", 404);
      if (!(await isJournalEditor(ctx.user.id, submission.journalId))) {
        return apiError("Only editors can assign copyediting", 403);
      }
      // Verify copyeditor exists and has appropriate role
      const copyeditor = await prisma.user.findUnique({ where: { id: data.copyeditorId } });
      if (!copyeditor) return apiError("Copyeditor not found", 404);
      if (submission.status !== "Accepted" && submission.status !== "InCopyediting") {
        return apiError("Submission must be accepted before copyediting", 400);
      }

      const record = await prisma.$transaction(async (tx) => {
        const rec = await tx.copyeditRecord.create({
          data: {
            submissionId,
            copyeditorId: data.copyeditorId,
            status: "Assigned",
            notes: [],
          },
        });

        if (submission.status === "Accepted") {
          await tx.submission.update({
            where: { id: submissionId },
            data: { status: "InCopyediting", stage: "Copyediting" },
          });
          await tx.statusChange.create({
            data: {
              submissionId,
              fromStatus: "Accepted",
              toStatus: "InCopyediting",
              actorId: ctx.user.id,
              comment: "Copyediting started",
            },
          });
        }

        return rec;
      });

      return NextResponse.json(record, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}

// PATCH /api/submissions/[submissionId]/copyedit — update copyedit record
export async function PATCH(request: NextRequest, { params }: Params) {
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
      const body = await request.json();
      const data = validate(updateCopyeditSchema, body);

      const record = await prisma.copyeditRecord.findFirst({
        where: { submissionId },
        orderBy: { assignedAt: "desc" },
      });
      if (!record) return apiError("No copyedit record found", 404);

      const updated = await prisma.copyeditRecord.update({
        where: { id: record.id },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
          ...(data.status === "Completed" ? { completedAt: new Date() } : {}),
        },
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
