import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, apiError, handleError } from "@/lib/api";
import { isJournalAdmin } from "@/lib/authorization";

type Params = { params: Promise<{ journalId: string; issueId: string }> };

// POST /api/journals/[journalId]/issues/[issueId]/publish
export async function POST(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId, issueId } = await params;

      if (!(await isJournalAdmin(ctx.user.id, journalId))) {
        return apiError("Only journal admins can publish issues", 403);
      }

      const issue = await prisma.issue.findUnique({ where: { id: issueId } });
      if (!issue || issue.journalId !== journalId) return apiError("Issue not found", 404);
      if (issue.publishedAt) return apiError("Issue already published", 400);
      if (issue.articleIds.length === 0) return apiError("Cannot publish an empty issue", 400);

      const journal = await prisma.journal.findUnique({
        where: { id: journalId },
        select: { slug: true, doiPrefix: true },
      });

      const now = new Date();

      // Publish issue and all articles in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.issue.update({
          where: { id: issueId },
          data: { publishedAt: now },
        });

        // Update all articles to Published status
        for (let i = 0; i < issue.articleIds.length; i++) {
          const articleId = issue.articleIds[i];
          const doi = journal?.doiPrefix
            ? `${journal.doiPrefix}/${journal.slug}.${articleId.slice(-8)}`
            : undefined;

          await tx.submission.update({
            where: { id: articleId },
            data: {
              status: "Published",
              stage: "Published",
              publishedAt: now,
              volume: issue.volumeId ? undefined : undefined, // Set if volume exists
              issue: issue.number,
              doi,
            },
          });

          await tx.statusChange.create({
            data: {
              submissionId: articleId,
              fromStatus: "Scheduled",
              toStatus: "Published",
              actorId: ctx.user.id,
              comment: `Published in Issue ${issue.number}`,
            },
          });
        }
      });

      return NextResponse.json({ success: true, publishedAt: now });
    } catch (error) {
      return handleError(error);
    }
  });
}
