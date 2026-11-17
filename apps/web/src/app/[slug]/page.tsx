import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, FileText, Send } from "lucide-react";

type Params = { params: Promise<{ slug: string }> };

export default async function JournalHomePage({ params }: Params) {
  const { slug } = await params;
  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) notFound();

  // Get latest published issue
  const latestIssue = await prisma.issue.findFirst({
    where: { journalId: journal.id, publishedAt: { not: null } },
    include: { volume: true },
    orderBy: { publishedAt: "desc" },
  });

  // Get articles for latest issue, or recent published articles
  let articles;
  if (latestIssue && latestIssue.articleIds.length > 0) {
    articles = await prisma.submission.findMany({
      where: { id: { in: latestIssue.articleIds }, status: "Published" },
      include: {
        authors: { orderBy: { sortOrder: "asc" }, select: { givenName: true, familyName: true } },
      },
    });
    const orderMap = new Map(latestIssue.articleIds.map((id, i) => [id, i]));
    articles.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  } else {
    articles = await prisma.submission.findMany({
      where: { journalId: journal.id, status: "Published" },
      include: {
        authors: { orderBy: { sortOrder: "asc" }, select: { givenName: true, familyName: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });
  }

  const totalArticles = await prisma.submission.count({
    where: { journalId: journal.id, status: "Published" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Journal description */}
      {journal.description && (
        <div className="mb-10 max-w-3xl">
          <p className="text-gray-600 font-body text-lg leading-relaxed">{journal.description}</p>
        </div>
      )}

      {/* Quick stats bar */}
      <div className="flex flex-wrap gap-6 mb-10 text-sm text-cool-grey">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>{journal.peerReviewType.replace("-", " ")} peer review</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>{journal.licenseType}</span>
        </div>
        {journal.issn && (
          <div>ISSN: {journal.issn}</div>
        )}
      </div>

      {/* Current Issue / Recent Articles */}
      <section>
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-6">
          {latestIssue
            ? `${latestIssue.volume ? `Volume ${latestIssue.volume.number}, ` : ""}Issue ${latestIssue.number}${latestIssue.title ? `: ${latestIssue.title}` : ""}`
            : "Recent Articles"}
        </h2>

        {articles.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
            <div className="flex justify-center mb-4">
              <FileText className="h-12 w-12 text-gray-300" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-gray-500">No published articles yet</h3>
            <p className="mt-2 text-sm text-gray-400 max-w-sm mx-auto">
              This journal is accepting submissions. Be among the first to publish.
            </p>
            <Link
              href="/submissions/new"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-digital-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-cardinal transition-colors"
            >
              <Send className="h-4 w-4" />
              Submit a Manuscript
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <article key={article.id} className="border-b border-gray-100 pb-6 last:border-0">
                <Link
                  href={`/${slug}/article/${article.id}`}
                  className="group"
                >
                  <h3 className="text-lg font-heading font-semibold text-cardinal group-hover:text-digital-red transition-colors">
                    {article.title}
                  </h3>
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  {article.authors.map((a) => `${a.givenName} ${a.familyName}`).join(", ")}
                </p>
                {article.abstract && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3 font-body leading-relaxed">
                    {article.abstract}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  {article.doi && (
                    <a
                      href={`https://doi.org/${article.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-digital-red transition-colors"
                    >
                      DOI: {article.doi}
                    </a>
                  )}
                  {article.firstPage && (
                    <span>pp. {article.firstPage}{article.lastPage ? `\u2013${article.lastPage}` : ""}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
