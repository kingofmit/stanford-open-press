import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SearchForm } from "./search-form";

export const metadata = { title: "Search" };

type Params = { params: Promise<{ slug: string }> };

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { q, page: pageStr } = await searchParams;

  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) notFound();

  const page = parseInt(pageStr || "1") || 1;
  let results: {
    id: string;
    title: string;
    abstract: string | null;
    keywords: string[];
    doi: string | null;
    publishedAt: Date | null;
    authors: { givenName: string; familyName: string }[];
  }[] = [];
  let total = 0;
  let pages = 0;

  if (q && q.length >= 2) {
    const where = {
      journalId: journal.id,
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
          authors: {
            orderBy: { sortOrder: "asc" },
            select: { givenName: true, familyName: true },
          },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.submission.count({ where }),
    ]);
    pages = Math.ceil(total / 20);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-heading font-bold text-navy-950 mb-6">Search</h1>

      <SearchForm slug={slug} initialQuery={q || ""} />

      {q && (
        <div className="mt-8">
          <p className="text-sm text-gray-500 mb-4">
            {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
          </p>

          {results.length > 0 ? (
            <div className="space-y-6">
              {results.map((article) => (
                <article key={article.id} className="border-b border-gray-100 pb-6 last:border-0">
                  <Link href={`/${slug}/article/${article.id}`} className="group">
                    <h3 className="text-lg font-heading font-semibold text-navy-950 group-hover:text-brand-500 transition-colors">
                      {article.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    {article.authors.map((a) => `${a.givenName} ${a.familyName}`).join(", ")}
                  </p>
                  {article.abstract && (
                    <p className="text-sm text-gray-600 mt-2 font-body">{article.abstract.slice(0, 300)}</p>
                  )}
                  <div className="mt-2 flex gap-4 text-xs text-gray-400">
                    {article.doi && <span>DOI: {article.doi}</span>}
                    {article.publishedAt && (
                      <span>{new Date(article.publishedAt).getFullYear()}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 py-8">No articles found matching your search.</p>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Link
                  href={`/${slug}/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-500">Page {page} of {pages}</span>
              {page < pages && (
                <Link
                  href={`/${slug}/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
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
  );
}
