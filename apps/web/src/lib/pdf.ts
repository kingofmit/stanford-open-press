import { prisma } from "@stanford-press/database";

/**
 * Generate HTML for PDF rendering of a published article.
 * This HTML is designed to be rendered by Puppeteer into a branded PDF.
 */
export async function generateArticlePDFHtml(articleId: string): Promise<string> {
  const article = await prisma.submission.findUnique({
    where: { id: articleId },
    include: {
      authors: { orderBy: { sortOrder: "asc" } },
      journal: true,
    },
  });

  if (!article || article.status !== "Published") {
    throw new Error("Article not found or not published");
  }

  function isValidCssColor(color: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(color) || /^(rgb|hsl)a?\([^)]+\)$/.test(color) || /^[a-zA-Z]+$/.test(color);
  }

  const primaryColor = isValidCssColor(article.journal.primaryColor) ? article.journal.primaryColor : '#1a1a2e';

  const pubDate = article.publishedAt
    ? article.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const authorList = article.authors
    .map((a) => {
      let name = `${a.givenName} ${a.familyName}`;
      if (a.corresponding) name += "*";
      if (a.affiliation) name += ` <span class="affiliation">(${esc(a.affiliation)})</span>`;
      return name;
    })
    .join(", ");

  return `<!DOCTYPE html>
<html lang="${article.locale}">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2.5cm 2cm;
      @top-center { content: "${esc(article.journal.name)}"; font-size: 9pt; color: #666; }
      @bottom-center { content: counter(page); font-size: 9pt; color: #666; }
      @bottom-left { content: "${article.doi ? `DOI: ${esc(article.doi)}` : ''}"; font-size: 8pt; color: #999; }
    }
    body {
      font-family: "Source Serif Pro", Georgia, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      max-width: 100%;
    }
    .header {
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .journal-name {
      font-size: 10pt;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .article-title {
      font-family: Inter, Helvetica, sans-serif;
      font-size: 20pt;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 12px 0;
    }
    .authors {
      font-size: 10pt;
      color: #333;
      margin-bottom: 8px;
    }
    .affiliation { color: #666; font-size: 9pt; }
    .meta {
      font-size: 9pt;
      color: #666;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .abstract {
      background: #f8f9fa;
      padding: 16px 20px;
      border-radius: 4px;
      margin: 24px 0;
    }
    .abstract h2 {
      font-family: Inter, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
      color: #666;
    }
    .abstract p { margin: 0; font-size: 10pt; }
    .keywords {
      font-size: 9pt;
      color: #666;
      margin: 16px 0;
    }
    .keywords strong { color: #333; }
    .section h2 {
      font-family: Inter, Helvetica, sans-serif;
      font-size: 13pt;
      font-weight: 600;
      margin: 24px 0 8px 0;
      color: #1a1a2e;
    }
    .disclosures {
      border-top: 1px solid #ddd;
      padding-top: 16px;
      margin-top: 32px;
      font-size: 9pt;
      color: #666;
    }
    .disclosures h3 {
      font-family: Inter, Helvetica, sans-serif;
      font-size: 10pt;
      font-weight: 600;
      color: #333;
      margin: 12px 0 4px 0;
    }
    .corresponding {
      font-size: 9pt;
      color: #666;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="journal-name">${esc(article.journal.name)}</div>
    <h1 class="article-title">${esc(article.title)}</h1>
    <div class="authors">${authorList}</div>
    <div class="meta">
      ${pubDate ? `<span>Published: ${pubDate}</span>` : ""}
      ${article.doi ? `<span>DOI: ${esc(article.doi)}</span>` : ""}
      ${article.volume ? `<span>Volume ${article.volume}` + (article.issue ? `, Issue ${article.issue}` : "") + "</span>" : ""}
      ${article.firstPage ? `<span>Pages ${esc(article.firstPage)}${article.lastPage ? `\u2013${esc(article.lastPage)}` : ""}</span>` : ""}
    </div>
  </div>

  ${article.abstract ? `
  <div class="abstract">
    <h2>Abstract</h2>
    <p>${esc(article.abstract)}</p>
  </div>` : ""}

  ${article.keywords.length > 0 ? `
  <div class="keywords">
    <strong>Keywords:</strong> ${article.keywords.map(esc).join(", ")}
  </div>` : ""}

  <div class="section">
    <p><em>Full text available at the article's online version.</em></p>
  </div>

  <div class="disclosures">
    ${article.funding ? `<h3>Funding</h3><p>${esc(article.funding)}</p>` : ""}
    ${article.conflictOfInterest ? `<h3>Conflict of Interest</h3><p>${esc(article.conflictOfInterest)}</p>` : ""}
    ${article.dataAvailability ? `<h3>Data Availability</h3><p>${esc(article.dataAvailability)}</p>` : ""}
    ${article.authors.some((a) => a.corresponding) ? `
    <div class="corresponding">
      <strong>* Corresponding author:</strong>
      ${article.authors.filter((a) => a.corresponding).map((a) => `${a.givenName} ${a.familyName} (${esc(a.email)})`).join(", ")}
    </div>` : ""}
  </div>

  <div style="margin-top: 24px; font-size: 8pt; color: #999; text-align: center;">
    &copy; ${article.publishedAt ? article.publishedAt.getFullYear() : new Date().getFullYear()} The Authors. Published by Stanford Open Press under ${esc(article.articleLicense || article.journal.licenseType)} license.
  </div>
</body>
</html>`;
}
