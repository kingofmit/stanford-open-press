import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) {
    return new NextResponse("Not found", { status: 404 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const articles = await prisma.submission.findMany({
    where: { journalId: journal.id, status: "Published" },
    include: {
      authors: { orderBy: { sortOrder: "asc" }, select: { givenName: true, familyName: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  const items = articles.map((a) => `
    <item>
      <title>${escXml(a.title)}</title>
      <link>${baseUrl}/${slug}/article/${a.id}</link>
      <guid isPermaLink="true">${baseUrl}/${slug}/article/${a.id}</guid>
      <pubDate>${a.publishedAt ? a.publishedAt.toUTCString() : ""}</pubDate>
      <description>${escXml(a.abstract?.slice(0, 500) || "")}</description>
      <dc:creator>${escXml(a.authors.map((au) => `${au.givenName} ${au.familyName}`).join(", "))}</dc:creator>
      ${a.doi ? `<guid isPermaLink="false">doi:${escXml(a.doi)}</guid>` : ""}
    </item>`).join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(journal.name)}</title>
    <link>${baseUrl}/${slug}</link>
    <description>${escXml(journal.description || "")}</description>
    <language>${journal.primaryLocale}</language>
    <atom:link href="${baseUrl}/${slug}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
