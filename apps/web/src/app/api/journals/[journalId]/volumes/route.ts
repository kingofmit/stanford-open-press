import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

type Params = { params: Promise<{ journalId: string }> };

const createVolumeSchema = z.object({
  number: z.number().int().positive(),
  year: z.number().int().min(1900).max(2100),
  title: z.string().max(255).optional(),
});

// GET /api/journals/[journalId]/volumes
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { journalId } = await params;
    const volumes = await prisma.volume.findMany({
      where: { journalId },
      include: {
        issues: {
          orderBy: { number: "desc" },
          select: { id: true, number: true, title: true, publishedAt: true, articleIds: true },
        },
      },
      orderBy: { number: "desc" },
    });
    return NextResponse.json(volumes);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/journals/[journalId]/volumes
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId } = await params;
      const body = await request.json();
      const data = validate(createVolumeSchema, body);

      if (!(await isJournalEditor(ctx.user.id, journalId))) {
        return apiError("Only editors can create volumes", 403);
      }

      const volume = await prisma.volume.create({
        data: { journalId, ...data },
      });

      return NextResponse.json(volume, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
