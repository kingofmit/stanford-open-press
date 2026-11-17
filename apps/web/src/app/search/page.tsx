import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { GlobalSearchForm } from "./search-form";

export const metadata = { title: "Search" };

export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; journalId?: string }>;
}) {
  const { q, page: pageStr, journalId } = await searchParams;
  const page = parseInt(pageStr || "1") || 1;
  const limit = 20;

  const journals = await prisma.journal.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  let results: any[] = [];
  let total = 0;

  if (q && q.length >= 2) {
    const where: Record<string, unknown> = {
      status: "Published" as const,
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { abstract: { contains: q, mode: "insensitive" as const } },
        { keywords: { has: q } },
        {
          authors: {
            some: {
              OR: [
                { givenName: { contains: q, mode: "insensitive" as const } },
                { familyName: { contains: q, mode: "insensitive" as const } },
              ],
            },
          },
        },
      ],
    };

    if (journalId) where.journalId = journalId;

    [results, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        select: {
          id: true,
          title: true,
          abstract: true,
          keywords: true,
          doi: true,
          publishedAt: true,
          volume: true,
          issue: true,
          journal: { select: { name: true, slug: true } },
          authors: {
            orderBy: { sortOrder: "asc" },
            select: { givenName: true, familyName: true },
          },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-navy-950">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Link href="/" className="text-xl font-heading font-bold text-white">
            Stanford Open Press
          </Link>
          <h1 className="text-white/70 text-sm mt-1">Search Published Articles</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <GlobalSearchForm
          initialQuery={q || ""}
          initialJournalId={journalId || ""}
          journals={journals}
        />

        {q && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-4">
              {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
              {journalId && journals.find((j) => j.id === journalId)
                ? ` in ${journals.find((j) => j.id === journalId)!.name}`
                : " across all journals"}
            </p>

            {results.length > 0 ? (
              <div className="space-y-6">
                {results.map((article: any) => (
                  <article key={article.id} className="border-b border-gray-100 pb-6 last:border-0">
                    <Link
                      href={`/${article.journal.slug}/article/${article.id}`}
                      className="group"
                    >
                      <h3 className="text-lg font-heading font-semibold text-navy-950 group-hover:text-brand-500 transition-colors">
                        {article.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {article.authors.map((a: any) => `${a.givenName} ${a.familyName}`).join(", ")}
                      <span className="text-gray-300 mx-2">|</span>
                      <Link href={`/${article.journal.slug}`} className="text-brand-500 hover:text-brand-700">
                        {article.journal.name}
                      </Link>
                    </p>
                    {article.abstract && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-3 font-body">
                        {article.abstract.slice(0, 300)}{article.abstract.length > 300 ? "..." : ""}
                      </p>
                    )}
                    <div className="mt-2 flex gap-4 text-xs text-gray-400">
                      {article.doi && <span>DOI: {article.doi}</span>}
                      {article.publishedAt && (
                        <span>{new Date(article.publishedAt).getFullYear()}</span>
                      )}
                      {article.volume && <span>Vol. {article.volume}</span>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 py-8">No articles found.</p>
            )}

            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}${journalId ? `&journalId=${journalId}` : ""}&page=${page - 1}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-sm text-gray-500">Page {page} of {pages}</span>
                {page < pages && (
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}${journalId ? `&journalId=${journalId}` : ""}&page=${page + 1}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
