import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { formatCitation, type CitationFormat } from "@/lib/citations";
import { handleError, apiError } from "@/lib/api";

type Params = { params: Promise<{ articleId: string }> };

// GET /api/articles/[articleId]/cite?format=bibtex|ris|apa|chicago|mla
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { articleId } = await params;
    const format = (new URL(request.url).searchParams.get("format") || "bibtex") as CitationFormat;

    if (!["bibtex", "ris", "apa", "chicago", "mla"].includes(format)) {
      return apiError("Invalid format. Use: bibtex, ris, apa, chicago, mla", 400);
    }

    const article = await prisma.submission.findUnique({
      where: { id: articleId },
      select: {
        title: true,
        doi: true,
        volume: true,
        issue: true,
        firstPage: true,
        lastPage: true,
        publishedAt: true,
        status: true,
        authors: { orderBy: { sortOrder: "asc" }, select: { givenName: true, familyName: true } },
        journal: { select: { name: true } },
      },
    });

    if (!article || article.status !== "Published") {
      return apiError("Article not found", 404);
    }

    const citation = formatCitation(
      {
        title: article.title,
        authors: article.authors,
        journalName: article.journal.name,
        volume: article.volume,
        issue: article.issue,
        firstPage: article.firstPage,
        lastPage: article.lastPage,
        year: article.publishedAt?.getFullYear() || new Date().getFullYear(),
        doi: article.doi,
      },
      format
    );

    const contentTypes: Record<string, string> = {
      bibtex: "application/x-bibtex",
      ris: "application/x-research-info-systems",
      apa: "text/plain",
      chicago: "text/plain",
      mla: "text/plain",
    };

    return new NextResponse(citation, {
      headers: {
        "Content-Type": contentTypes[format] || "text/plain",
        "Content-Disposition": `attachment; filename="citation.${format === "bibtex" ? "bib" : format === "ris" ? "ris" : "txt"}"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
