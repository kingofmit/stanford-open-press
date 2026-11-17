import Link from "next/link";
import { prisma } from "@stanford-press/database";

export const metadata = { title: "Search — Stanford Open Press" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; journal?: string; page?: string }>;
}) {
  const { q, journal, page: pageStr } = await searchParams;
  const query = q || "";
  const page = parseInt(pageStr || "1") || 1;

  let results: any[] = [];
  let total = 0;
  let pages = 0;

  if (query.trim()) {
    const where: Record<string, unknown> = {
      status: "Published",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { abstract: { contains: query, mode: "insensitive" } },
        { keywords: { hasSome: query.toLowerCase().split(/\s+/) } },
      ],
    };

    if (journal) {
      const j = await prisma.journal.findUnique({ where: { slug: journal }, select: { id: true } });
      if (j) where.journalId = j.id;
    }

    [results, total] = await Promise.all([
      prisma.submission.findMany({
        where: where as any,
        select: {
          id: true, title: true, abstract: true, keywords: true, doi: true,
          publishedAt: true,
          authors: { orderBy: { sortOrder: "asc" }, select: { givenName: true, familyName: true } },
          journal: { select: { name: true, slug: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.submission.count({ where: where as any }),
    ]);
    pages = Math.ceil(total / 20);
  }

  const journals = await prisma.journal.findMany({
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Link href="/" className="text-xl font-heading font-bold text-navy-950">Stanford Open Press</Link>
          <form className="mt-4 flex gap-3" action="/search" method="GET">
            <input
              type="text" name="q" defaultValue={query} placeholder="Search articles, authors, keywords..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
            <select name="journal" defaultValue={journal || ""}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none">
              <option value="">All Journals</option>
              {journals.map((j) => <option key={j.slug} value={j.slug}>{j.name}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {query && (
          <p className="text-sm text-gray-500 mb-6">
            {total} result{total !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}

        {results.length > 0 ? (
          <div className="space-y-6">
            {results.map((article: any) => (
              <article key={article.id} className="border-b border-gray-100 pb-6">
                <Link href={`/${article.journal.slug}/article/${article.id}`} className="group">
                  <h2 className="text-lg font-heading font-semibold text-navy-950 group-hover:text-brand-500 transition-colors">
                    {article.title}
                  </h2>
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  {article.authors.map((a: any) => `${a.givenName} ${a.familyName}`).join(", ")}
                  {" \u2014 "}<span className="text-brand-500">{article.journal.name}</span>
                </p>
                {article.abstract && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{article.abstract}</p>
                )}
                {article.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.keywords.slice(0, 5).map((kw: string, i: number) => (
                      <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{kw}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : query ? (
          <p className="text-gray-400 py-12 text-center">No articles found matching your search.</p>
        ) : (
          <p className="text-gray-400 py-12 text-center">Enter a search query to find published articles.</p>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/search?q=${encodeURIComponent(query)}${journal ? `&journal=${journal}` : ""}&page=${p}`}
                className={`rounded-lg px-3 py-1.5 text-sm ${p === page ? "bg-brand-500 text-white" : "border text-gray-600 hover:bg-gray-50"}`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
