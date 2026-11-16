import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";

type Params = { params: Promise<{ submissionId: string }> };

const addAuthorSchema = z.object({
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  email: z.string().email(),
  affiliation: z.string().optional(),
  orcid: z.string().optional(),
  corresponding: z.boolean().default(false),
});

const reorderSchema = z.object({
  authorIds: z.array(z.string()),
});

// GET /api/submissions/[submissionId]/authors
export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async () => {
    try {
      const { submissionId } = await params;
      const authors = await prisma.author.findMany({
        where: { submissionId },
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json(authors);
    } catch (error) {
      return handleError(error);
    }
  });
}

// POST /api/submissions/[submissionId]/authors — add author
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const data = validate(addAuthorSchema, body);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { submitterId: true, status: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (submission.submitterId !== ctx.user.id) return apiError("Access denied", 403);
      if (submission.status !== "Draft" && submission.status !== "RevisionRequested") {
        return apiError("Can only edit authors on drafts or revisions", 400);
      }

      // Get next sort order
      const maxOrder = await prisma.author.aggregate({
        where: { submissionId },
        _max: { sortOrder: true },
      });

      // Link to existing user if email matches
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      const author = await prisma.author.create({
        data: {
          ...data,
          submissionId,
          userId: existingUser?.id,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });

      return NextResponse.json(author, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}

// PUT /api/submissions/[submissionId]/authors — reorder authors
export async function PUT(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const { authorIds } = validate(reorderSchema, body);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { submitterId: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (submission.submitterId !== ctx.user.id) return apiError("Access denied", 403);

      const existingAuthors = await prisma.author.findMany({
        where: { submissionId },
        select: { id: true },
      });
      const validIds = new Set(existingAuthors.map((a) => a.id));
      if (!authorIds.every((id) => validIds.has(id))) {
        return apiError("Invalid author ID for this submission", 400);
      }

      await prisma.$transaction(
        authorIds.map((id, index) =>
          prisma.author.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      );

      const authors = await prisma.author.findMany({
        where: { submissionId },
        orderBy: { sortOrder: "asc" },
      });

      return NextResponse.json(authors);
    } catch (error) {
      return handleError(error);
    }
  });
}

// DELETE /api/submissions/[submissionId]/authors?authorId=xxx
export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const authorId = new URL(request.url).searchParams.get("authorId");
      if (!authorId) return apiError("authorId is required");

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { submitterId: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (submission.submitterId !== ctx.user.id) return apiError("Access denied", 403);

      const author = await prisma.author.findUnique({ where: { id: authorId } });
      if (!author || author.submissionId !== submissionId) {
        return apiError("Author not found in this submission", 404);
      }

      await prisma.author.delete({ where: { id: authorId } });
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error);
    }
  });
}
