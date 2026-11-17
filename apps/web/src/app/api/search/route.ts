import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { handleError } from "@/lib/api";

// GET /api/search?q=query&journalId=xxx&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const journalId = searchParams.get("journalId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], total: 0, query: q || "" });
    }

    // Build where clause — search published articles
    const where: Record<string, unknown> = {
      status: "Published",
    };

    if (journalId) where.journalId = journalId;

    // Use Prisma's contains for search (works across all DBs)
    // For PostgreSQL, this translates to ILIKE which is case-insensitive
    const searchCondition = {
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

    const fullWhere = { ...where, ...searchCondition };

    const [results, total] = await Promise.all([
      prisma.submission.findMany({
        where: fullWhere,
        select: {
          id: true,
          title: true,
          abstract: true,
          keywords: true,
          doi: true,
          publishedAt: true,
          volume: true,
          issue: true,
          firstPage: true,
          lastPage: true,
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
      prisma.submission.count({ where: fullWhere }),
    ]);

    // Highlight matching terms in abstracts
    const highlighted = results.map((r) => ({
      ...r,
      abstractSnippet: r.abstract
        ? highlightSnippet(r.abstract, q, 300)
        : null,
    }));

    return NextResponse.json({
      results: highlighted,
      total,
      query: q,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleError(error);
  }
}

function highlightSnippet(text: string, query: string, maxLength: number): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
  }

  // Extract snippet around the match
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + query.length + 220);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}
