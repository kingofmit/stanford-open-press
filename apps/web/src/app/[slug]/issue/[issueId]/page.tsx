import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

type Params = { params: Promise<{ slug: string; issueId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { issueId } = await params;
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { volume: true, journal: { select: { name: true } } },
  });
  if (!issue) return {};
  return {
    title: `${issue.volume ? `Vol. ${issue.volume.number}, ` : ""}Issue ${issue.number}${issue.title ? `: ${issue.title}` : ""}`,
  };
}

export default async function IssuePage({ params }: Params) {
  const { slug, issueId } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      volume: true,
      journal: { select: { slug: true } },
    },
  });

  if (!issue || !issue.publishedAt || issue.journal.slug !== slug) notFound();

  let articles: any[] = [];
  if (issue.articleIds.length > 0) {
    articles = await prisma.submission.findMany({
      where: { id: { in: issue.articleIds }, status: "Published" },
      include: {
        authors: { orderBy: { sortOrder: "asc" }, select: { givenName: true, familyName: true } },
      },
    });
    const orderMap = new Map(issue.articleIds.map((id, i) => [id, i]));
    articles.sort((a: any, b: any) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <Link href={`/${slug}/issues`} className="text-sm text-gray-500 hover:text-navy-950 transition-colors">
          &larr; All Issues
        </Link>
        <h1 className="text-2xl font-heading font-bold text-navy-950 mt-2">
          {issue.volume ? `Volume ${issue.volume.number}, ` : ""}Issue {issue.number}
          {issue.title ? `: ${issue.title}` : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Published {issue.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long" })}
        </p>
        {issue.description && <p className="text-gray-600 mt-3 font-body">{issue.description}</p>}
      </div>

      <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Table of Contents
      </h2>

      {articles.length === 0 ? (
        <p className="text-gray-400">No articles in this issue.</p>
      ) : (
        <div className="space-y-6">
          {articles.map((article: any) => (
            <article key={article.id} className="border-b border-gray-100 pb-6 last:border-0">
              <Link href={`/${slug}/article/${article.id}`} className="group">
                <h3 className="text-lg font-heading font-semibold text-navy-950 group-hover:text-brand-500 transition-colors">
                  {article.title}
                </h3>
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                {article.authors.map((a: any) => `${a.givenName} ${a.familyName}`).join(", ")}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                {article.firstPage && (
                  <span>pp. {article.firstPage}{article.lastPage ? `\u2013${article.lastPage}` : ""}</span>
                )}
                {article.doi && (
                  <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-500">
                    {article.doi}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
