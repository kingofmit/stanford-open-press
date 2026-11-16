import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, handleError, apiError } from "@/lib/api";

const updateJournalSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  abbreviation: z.string().max(20).optional(),
  issn: z.string().regex(/^\d{4}-\d{3}[\dX]$/).optional(),
  eissn: z.string().regex(/^\d{4}-\d{3}[\dX]$/).optional(),
  doiPrefix: z.string().optional(),
  peerReviewType: z.enum(["single-blind", "double-blind", "open"]).optional(),
  licenseType: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
});

type Params = { params: Promise<{ journalId: string }> };

// GET /api/journals/[journalId]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { journalId } = await params;
    const journal = await prisma.journal.findUnique({
      where: { id: journalId },
      include: {
        sections: { orderBy: { sortOrder: "asc" } },
        _count: {
          select: {
            submissions: true,
            roles: true,
          },
        },
      },
    });

    if (!journal) {
      return apiError("Journal not found", 404);
    }

    return NextResponse.json(journal);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/journals/[journalId]
export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId } = await params;

      const { isJournalAdmin } = await import("@/lib/authorization");
      if (!(await isJournalAdmin(ctx.user.id, journalId))) {
        return apiError("Only journal admins can update settings", 403);
      }

      const body = await request.json();
      const data = validate(updateJournalSchema, body);

      const journal = await prisma.journal.update({
        where: { id: journalId },
        data,
        include: { sections: true },
      });

      return NextResponse.json(journal);
    } catch (error) {
      return handleError(error);
    }
  });
}
