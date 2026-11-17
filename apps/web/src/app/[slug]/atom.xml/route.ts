import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) return new NextResponse("Not found", { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const articles = await prisma.submission.findMany({
    where: { journalId: journal.id, status: "Published" },
    include: {
      authors: { orderBy: { sortOrder: "asc" }, select: { givenName: true, familyName: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  const entries = articles.map((a) => `
  <entry>
    <title>${escapeXml(a.title)}</title>
    <link href="${baseUrl}/${slug}/article/${a.id}"/>
    <id>urn:doi:${a.doi || a.id}</id>
    <updated>${(a.publishedAt || a.createdAt).toISOString()}</updated>
    <summary>${escapeXml(a.abstract || "")}</summary>
    ${a.authors.map((au) => `<author><name>${escapeXml(`${au.givenName} ${au.familyName}`)}</name></author>`).join("\n    ")}
  </entry>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(journal.name)}</title>
  <link href="${baseUrl}/${slug}"/>
  <link href="${baseUrl}/${slug}/atom.xml" rel="self" type="application/atom+xml"/>
  <id>${baseUrl}/${slug}</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle>${escapeXml(journal.description || "")}</subtitle>
  ${entries}
</feed>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
