import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";
import Link from "next/link";

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
    // Sort by issue order
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Journal description */}
      {journal.description && (
        <div className="mb-10 max-w-3xl">
          <p className="text-gray-600 font-body leading-relaxed">{journal.description}</p>
        </div>
      )}

      {/* Current Issue */}
      <section>
        <h2 className="text-lg font-heading font-semibold text-navy-950 mb-6">
          {latestIssue
            ? `${latestIssue.volume ? `Volume ${latestIssue.volume.number}, ` : ""}Issue ${latestIssue.number}${latestIssue.title ? `: ${latestIssue.title}` : ""}`
            : "Recent Articles"}
        </h2>

        {articles.length === 0 ? (
          <p className="text-gray-400 py-8">No published articles yet.</p>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <article key={article.id} className="border-b border-gray-100 pb-6 last:border-0">
                <Link
                  href={`/${slug}/article/${article.id}`}
                  className="group"
                >
                  <h3 className="text-lg font-heading font-semibold text-navy-950 group-hover:text-brand-500 transition-colors">
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
                      className="hover:text-brand-500 transition-colors"
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
