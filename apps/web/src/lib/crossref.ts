import { prisma } from "@stanford-press/database";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

interface DepositResult {
  success: boolean;
  doi: string;
  batchId: string;
  error?: string;
}

/**
 * Build Crossref deposit XML for a published article
 */
export function buildCrossrefDepositXML(article: {
  title: string;
  doi: string;
  authors: { givenName: string; familyName: string; orcid?: string | null }[];
  journal: { name: string; issn?: string | null; eissn?: string | null };
  publishedAt: Date;
  volume?: number | null;
  issue?: number | null;
  firstPage?: string | null;
  lastPage?: string | null;
  abstract?: string | null;
  url: string;
}): string {
  const batchId = `sop-${Date.now()}`;
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);

  const authorsXml = article.authors.map((a, i) => `
            <person_name sequence="${i === 0 ? "first" : "additional"}" contributor_role="author">
              <given_name>${escapeXml(a.givenName)}</given_name>
              <surname>${escapeXml(a.familyName)}</surname>
              ${a.orcid ? `<ORCID>https://orcid.org/${escapeXml(a.orcid)}</ORCID>` : ""}
            </person_name>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1"
  xmlns="http://www.crossref.org/schema/5.3.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
  <head>
    <doi_batch_id>${batchId}</doi_batch_id>
    <timestamp>${timestamp}</timestamp>
    <depositor>
      <depositor_name>${escapeXml(process.env.CROSSREF_DEPOSITOR_NAME || "Stanford Open Press")}</depositor_name>
      <email_address>${escapeXml(process.env.CROSSREF_DEPOSITOR_EMAIL || "press@stanford.edu")}</email_address>
    </depositor>
    <registrant>${escapeXml(process.env.CROSSREF_REGISTRANT || "Stanford University")}</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata>
        <full_title>${escapeXml(article.journal.name)}</full_title>
        ${article.journal.issn ? `<issn media_type="print">${escapeXml(article.journal.issn)}</issn>` : ""}
        ${article.journal.eissn ? `<issn media_type="electronic">${escapeXml(article.journal.eissn)}</issn>` : ""}
      </journal_metadata>
      ${article.volume || article.issue ? `
      <journal_issue>
        ${article.volume ? `<journal_volume><volume>${article.volume}</volume></journal_volume>` : ""}
        ${article.issue ? `<issue>${article.issue}</issue>` : ""}
      </journal_issue>` : ""}
      <journal_article publication_type="full_text">
        <titles>
          <title>${escapeXml(article.title)}</title>
        </titles>
        <contributors>${authorsXml}
        </contributors>
        <publication_date media_type="online">
          <month>${String(article.publishedAt.getMonth() + 1).padStart(2, "0")}</month>
          <day>${String(article.publishedAt.getDate()).padStart(2, "0")}</day>
          <year>${article.publishedAt.getFullYear()}</year>
        </publication_date>
        ${article.firstPage ? `<pages><first_page>${escapeXml(article.firstPage)}</first_page>${article.lastPage ? `<last_page>${escapeXml(article.lastPage)}</last_page>` : ""}</pages>` : ""}
        <doi_data>
          <doi>${escapeXml(article.doi)}</doi>
          <resource>${escapeXml(article.url)}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>`;
}

/**
 * Deposit a DOI with Crossref
 */
export async function depositDOI(articleId: string): Promise<DepositResult> {
  const article = await prisma.submission.findUnique({
    where: { id: articleId },
    include: {
      authors: { orderBy: { sortOrder: "asc" } },
      journal: { select: { name: true, issn: true, eissn: true, slug: true } },
    },
  });

  if (!article || !article.doi || !article.publishedAt) {
    return { success: false, doi: "", batchId: "", error: "Article not published or no DOI" };
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = `${baseUrl}/${article.journal.slug}/article/${articleId}`;

  const xml = buildCrossrefDepositXML({
    title: article.title,
    doi: article.doi,
    authors: article.authors,
    journal: article.journal,
    publishedAt: article.publishedAt,
    volume: article.volume,
    issue: article.issue,
    firstPage: article.firstPage,
    lastPage: article.lastPage,
    abstract: article.abstract,
    url,
  });

  const crossrefUser = process.env.CROSSREF_USERNAME;
  const crossrefPass = process.env.CROSSREF_PASSWORD;

  if (!crossrefUser || !crossrefPass) {
    // In development, just log the XML
    if (process.env.NODE_ENV === "development") {
      console.log("\n=== CROSSREF DEPOSIT XML ===\n", xml, "\n===========================\n");
      return { success: true, doi: article.doi, batchId: `dev-${Date.now()}` };
    }
    return { success: false, doi: article.doi, batchId: "", error: "Crossref credentials not configured" };
  }

  // Deposit via Crossref API
  const formData = new FormData();
  formData.append("operation", "doMDUpload");
  formData.append("login_id", crossrefUser);
  formData.append("login_passwd", crossrefPass);
  formData.append("fname", new Blob([xml], { type: "application/xml" }), "deposit.xml");

  const res = await fetch("https://doi.crossref.org/servlet/deposit", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown");
    return { success: false, doi: article.doi, batchId: "", error: `Crossref error: ${res.status} ${body}` };
  }

  return { success: true, doi: article.doi, batchId: `sop-${Date.now()}` };
}
