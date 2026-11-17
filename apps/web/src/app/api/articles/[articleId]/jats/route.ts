import { NextRequest, NextResponse } from "next/server";
import { generateJATSXML } from "@/lib/jats";
import { handleError, apiError } from "@/lib/api";

type Params = { params: Promise<{ articleId: string }> };

// GET /api/articles/[articleId]/jats
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { articleId } = await params;
    const xml = await generateJATSXML(articleId);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="article-${articleId}.xml"`,
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes("not found")) {
      return apiError("Article not found or not published", 404);
    }
    return handleError(error);
  }
}
