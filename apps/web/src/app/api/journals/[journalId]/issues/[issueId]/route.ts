import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";

type Params = { params: Promise<{ journalId: string; issueId: string }> };

// GET /api/journals/[journalId]/issues/[issueId]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { journalId, issueId } = await params;
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { volume: true },
    });

    if (!issue || issue.journalId !== journalId) {
      return apiError("Issue not found", 404);
    }

    // Fetch articles in order
    let articles: unknown[] = [];
    if (issue.articleIds.length > 0) {
      articles = await prisma.submission.findMany({
        where: { id: { in: issue.articleIds } },
        select: {
          id: true,
          title: true,
          doi: true,
          firstPage: true,
          lastPage: true,
          publishedAt: true,
          authors: {
            orderBy: { sortOrder: "asc" },
            select: { givenName: true, familyName: true, affiliation: true },
          },
        },
      });

      // Sort by articleIds order
      const orderMap = new Map(issue.articleIds.map((id, i) => [id, i]));
      articles.sort((a: any, b: any) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    }

    return NextResponse.json({ ...issue, articles });
  } catch (error) {
    return handleError(error);
  }
}

const updateIssueSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  articleIds: z.array(z.string()).optional(),
  coverImageUrl: z.string().url().optional(),
});

// PATCH /api/journals/[journalId]/issues/[issueId]
export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId, issueId } = await params;
      const body = await request.json();
      const data = validate(updateIssueSchema, body);

      if (!(await isJournalEditor(ctx.user.id, journalId))) {
        return apiError("Only editors can update issues", 403);
      }

      const issue = await prisma.issue.findUnique({ where: { id: issueId } });
      if (!issue || issue.journalId !== journalId) return apiError("Issue not found", 404);

      // Validate articleIds belong to this journal and are accepted
      if (data.articleIds) {
        const articles = await prisma.submission.findMany({
          where: { id: { in: data.articleIds }, journalId },
          select: { id: true, status: true },
        });
        const foundIds = new Set(articles.map((a) => a.id));
        const invalid = data.articleIds.filter((id) => !foundIds.has(id));
        if (invalid.length > 0) return apiError(`Articles not found: ${invalid.join(", ")}`, 400);

        const notReady = articles.filter((a) => !["Accepted", "InCopyediting", "InProduction", "Scheduled", "Published"].includes(a.status));
        if (notReady.length > 0) return apiError("All articles must be accepted or later in workflow", 400);
      }

      const updated = await prisma.issue.update({
        where: { id: issueId },
        data,
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
