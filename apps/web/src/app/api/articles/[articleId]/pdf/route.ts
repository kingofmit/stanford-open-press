import { NextRequest, NextResponse } from "next/server";
import { generateArticlePDFHtml } from "@/lib/pdf";
import { handleError, apiError } from "@/lib/api";

type Params = { params: Promise<{ articleId: string }> };

// GET /api/articles/[articleId]/pdf
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { articleId } = await params;
    const html = await generateArticlePDFHtml(articleId);

    // Try Puppeteer if installed (optional peer dependency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let puppeteer: any = null;
    try {
      // Puppeteer is an optional dependency
      puppeteer = require("puppeteer");
    } catch {
      // Not installed
    }

    if (puppeteer) {
      const args = ["--disable-setuid-sandbox"];
      if (process.env.NODE_ENV === "development" || process.env.PUPPETEER_NO_SANDBOX === "true") {
        args.push("--no-sandbox");
      }
      const browser = await puppeteer.launch({ headless: true, args });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "2.5cm", bottom: "2.5cm", left: "2cm", right: "2cm" },
        });

        return new NextResponse(pdf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="article-${articleId}.pdf"`,
          },
        });
      } finally {
        await browser.close();
      }
    }

    // Fallback: return styled HTML
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="article-${articleId}.html"`,
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes("not found")) {
      return apiError("Article not found or not published", 404);
    }
    return handleError(error);
  }
}
