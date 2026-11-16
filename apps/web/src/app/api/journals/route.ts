import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, handleError, apiError } from "@/lib/api";

const createJournalSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  abbreviation: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
  issn: z.string().regex(/^\d{4}-\d{3}[\dX]$/).optional(),
  eissn: z.string().regex(/^\d{4}-\d{3}[\dX]$/).optional(),
  doiPrefix: z.string().optional(),
  peerReviewType: z.enum(["single-blind", "double-blind", "open"]).default("double-blind"),
  licenseType: z.string().default("CC-BY-4.0"),
  sections: z.array(z.string().min(1)).optional(),
});

// GET /api/journals — list all journals (public)
export async function GET() {
  try {
    const journals = await prisma.journal.findMany({
      include: {
        sections: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        _count: { select: { submissions: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(journals);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/journals — create a journal (authenticated, will check admin role later)
export async function POST(request: NextRequest) {
  return withAuth(async (ctx) => {
    // First journal can be created by anyone (bootstrap). After that, require editor role.
    const journalCount = await prisma.journal.count();
    if (journalCount > 0) {
      const { isAnyEditor } = await import("@/lib/authorization");
      if (!(await isAnyEditor(ctx.user.id))) {
        return apiError("Only editors can create journals", 403);
      }
    }

    try {
      const body = await request.json();
      const data = validate(createJournalSchema, body);

      const journal = await prisma.journal.create({
        data: {
          name: data.name,
          slug: data.slug,
          abbreviation: data.abbreviation,
          description: data.description,
          issn: data.issn,
          eissn: data.eissn,
          doiPrefix: data.doiPrefix,
          peerReviewType: data.peerReviewType,
          licenseType: data.licenseType,
          sections: data.sections
            ? {
                create: data.sections.map((name, i) => ({
                  name,
                  sortOrder: i,
                })),
              }
            : undefined,
          // Auto-assign creator as editor-in-chief
          roles: {
            create: {
              userId: ctx.user.id,
              role: "EditorInChief",
            },
          },
        },
        include: {
          sections: true,
        },
      });

      return NextResponse.json(journal, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
