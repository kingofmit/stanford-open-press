import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, handleError } from "@/lib/api";

const createSubmissionSchema = z.object({
  journalId: z.string().min(1),
  sectionId: z.string().optional(),
  title: z.string().min(1).max(500),
  abstract: z.string().max(5000).optional(),
  keywords: z.array(z.string()).max(10).optional(),
  locale: z.string().default("en"),
});

// GET /api/submissions — list user's submissions
export async function GET(request: NextRequest) {
  return withAuth(async (ctx) => {
    try {
      const { searchParams } = new URL(request.url);
      const journalId = searchParams.get("journalId");
      const status = searchParams.get("status");
      const role = searchParams.get("role"); // "author" | "editor"
      const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));

      const where: Record<string, unknown> = {};

      if (role === "editor") {
        // Editor sees all submissions for journals they edit
        const editorJournals = await prisma.roleAssignment.findMany({
          where: {
            userId: ctx.user.id,
            role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor", "GuestEditor"] },
          },
          select: { journalId: true },
        });
        where.journalId = { in: editorJournals.map((r) => r.journalId) };
        // Editors don't see drafts
        where.status = { not: "Draft" };
      } else {
        // Author sees their own submissions
        where.submitterId = ctx.user.id;
      }

      if (journalId) where.journalId = journalId;
      if (status) where.status = status;

      const [submissions, total] = await Promise.all([
        prisma.submission.findMany({
          where,
          include: {
            journal: { select: { id: true, name: true, slug: true } },
            section: { select: { id: true, name: true } },
            authors: { orderBy: { sortOrder: "asc" } },
            _count: { select: { reviews: true, files: true } },
          },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.submission.count({ where }),
      ]);

      return NextResponse.json({
        submissions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return handleError(error);
    }
  });
}

// POST /api/submissions — create a new draft submission
export async function POST(request: NextRequest) {
  return withAuth(async (ctx) => {
    try {
      const body = await request.json();
      const data = validate(createSubmissionSchema, body);

      // Verify journal exists
      const journal = await prisma.journal.findUnique({
        where: { id: data.journalId },
      });
      if (!journal) {
        return NextResponse.json({ error: "Journal not found" }, { status: 404 });
      }

      if (data.sectionId) {
        const section = await prisma.journalSection.findUnique({
          where: { id: data.sectionId },
        });
        if (!section || section.journalId !== data.journalId) {
          return NextResponse.json({ error: "Section does not belong to this journal" }, { status: 400 });
        }
      }

      const submission = await prisma.submission.create({
        data: {
          journalId: data.journalId,
          sectionId: data.sectionId,
          title: data.title,
          abstract: data.abstract,
          keywords: data.keywords || [],
          locale: data.locale,
          submitterId: ctx.user.id,
          status: "Draft",
          stage: "Submission",
          // Auto-add submitter as first author
          authors: {
            create: {
              givenName: ctx.user.name?.split(" ")[0] || "",
              familyName: ctx.user.name?.split(" ").slice(1).join(" ") || "",
              email: ctx.user.email,
              userId: ctx.user.id,
              corresponding: true,
              sortOrder: 0,
            },
          },
        },
        include: {
          authors: true,
          journal: { select: { id: true, name: true, slug: true } },
        },
      });

      // Assign author role if not already assigned
      await prisma.roleAssignment.upsert({
        where: {
          userId_journalId_role: {
            userId: ctx.user.id,
            journalId: data.journalId,
            role: "Author",
          },
        },
        update: {},
        create: {
          userId: ctx.user.id,
          journalId: data.journalId,
          role: "Author",
        },
      });

      return NextResponse.json(submission, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
