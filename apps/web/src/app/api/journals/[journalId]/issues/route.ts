import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

type Params = { params: Promise<{ journalId: string }> };

const createIssueSchema = z.object({
  volumeId: z.string().optional(),
  number: z.number().int().positive(),
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
});

// GET /api/journals/[journalId]/issues
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { journalId } = await params;
    const issues = await prisma.issue.findMany({
      where: { journalId },
      include: {
        volume: { select: { number: true, year: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json(issues);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/journals/[journalId]/issues
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId } = await params;
      const body = await request.json();
      const data = validate(createIssueSchema, body);

      if (!(await isJournalEditor(ctx.user.id, journalId))) {
        return apiError("Only editors can create issues", 403);
      }

      if (data.volumeId) {
        const volume = await prisma.volume.findUnique({ where: { id: data.volumeId } });
        if (!volume || volume.journalId !== journalId) {
          return apiError("Volume not found in this journal", 400);
        }
      }

      const issue = await prisma.issue.create({
        data: { journalId, ...data, articleIds: [] },
      });

      return NextResponse.json(issue, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
