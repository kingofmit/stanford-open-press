import { NextRequest, NextResponse } from "next/server";
import { prisma, type ProductionTaskType, type ProductionTaskStatus } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

type Params = { params: Promise<{ submissionId: string }> };

const PIPELINE_TASKS: { type: ProductionTaskType; sortOrder: number }[] = [
  { type: "MetadataEntry", sortOrder: 0 },
  { type: "Typesetting", sortOrder: 1 },
  { type: "GalleyProof", sortOrder: 2 },
  { type: "AuthorProofing", sortOrder: 3 },
  { type: "FinalCheck", sortOrder: 4 },
  { type: "DOIRegistration", sortOrder: 5 },
];

const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["InProgress", "AwaitingApproval", "Completed", "Skipped"]),
  assigneeId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

// GET /api/submissions/[submissionId]/production
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
      const tasks = await prisma.productionTask.findMany({
        where: { submissionId },
        include: {
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json(tasks);
    } catch (error) {
      return handleError(error);
    }
  });
}

// POST /api/submissions/[submissionId]/production — create production pipeline
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
        return apiError("Only editors can create production pipeline", 403);
      }

      // Check no existing pipeline
      const existing = await prisma.productionTask.count({ where: { submissionId } });
      if (existing > 0) return apiError("Production pipeline already exists", 409);

      const tasks = await prisma.$transaction(async (tx) => {
        const created = await Promise.all(
          PIPELINE_TASKS.map((t) =>
            tx.productionTask.create({
              data: {
                submissionId,
                type: t.type,
                sortOrder: t.sortOrder,
                status: "Pending",
              },
            })
          )
        );

        if (submission.status !== "InProduction") {
          await tx.submission.update({
            where: { id: submissionId },
            data: { status: "InProduction", stage: "Production" },
          });
          await tx.statusChange.create({
            data: {
              submissionId,
              fromStatus: submission.status as any,
              toStatus: "InProduction",
              actorId: ctx.user.id,
              comment: "Production pipeline created",
            },
          });
        }

        return created;
      });

      return NextResponse.json(tasks, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}

// PATCH /api/submissions/[submissionId]/production — update a task
export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const data = validate(updateTaskSchema, body);

      const task = await prisma.productionTask.findUnique({ where: { id: data.taskId } });
      if (!task || task.submissionId !== submissionId) return apiError("Task not found", 404);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { journalId: true },
      });
      if (!submission) return apiError("Submission not found", 404);
      if (!(await isJournalEditor(ctx.user.id, submission.journalId))) {
        return apiError("Only editors can update production tasks", 403);
      }

      if (data.assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
        if (!assignee) return apiError("Assignee not found", 404);
      }

      const updated = await prisma.productionTask.update({
        where: { id: data.taskId },
        data: {
          status: data.status as ProductionTaskStatus,
          ...(data.assigneeId ? { assigneeId: data.assigneeId } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
          ...(data.status === "Completed" ? { completedAt: new Date() } : {}),
        },
      });

      // Check if all tasks complete → mark submission as ready to schedule
      if (data.status === "Completed") {
        await prisma.$transaction(async (tx) => {
          const allTasks = await tx.productionTask.findMany({ where: { submissionId } });
          const allDone = allTasks.every((t) =>
            t.id === data.taskId ? true : ["Completed", "Skipped"].includes(t.status)
          );
          if (allDone) {
            await tx.submission.update({
              where: { id: submissionId },
              data: { status: "Scheduled" },
            });
          }
        });
      }

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
