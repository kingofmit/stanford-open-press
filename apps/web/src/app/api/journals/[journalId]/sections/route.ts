import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, handleError, apiError } from "@/lib/api";

const createSectionSchema = z.object({
  name: z.string().min(1).max(255),
  abbreviation: z.string().max(20).optional(),
  description: z.string().max(1000).optional(),
  policy: z.string().max(2000).optional(),
});

type Params = { params: Promise<{ journalId: string }> };

// GET /api/journals/[journalId]/sections
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { journalId } = await params;
    const sections = await prisma.journalSection.findMany({
      where: { journalId },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(sections);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/journals/[journalId]/sections
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId } = await params;

      const { isJournalEditor } = await import("@/lib/authorization");
      if (!(await isJournalEditor(ctx.user.id, journalId))) {
        return apiError("Only journal editors can manage sections", 403);
      }

      const body = await request.json();
      const data = validate(createSectionSchema, body);

      const journal = await prisma.journal.findUnique({ where: { id: journalId } });
      if (!journal) return apiError("Journal not found", 404);

      const maxOrder = await prisma.journalSection.aggregate({
        where: { journalId },
        _max: { sortOrder: true },
      });

      const section = await prisma.journalSection.create({
        data: {
          ...data,
          journalId,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });

      return NextResponse.json(section, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
