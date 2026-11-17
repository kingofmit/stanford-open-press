import { prisma } from "@stanford-press/database";

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate JATS Publishing DTD v1.3 XML for a published article.
 */
export async function generateJATSXML(articleId: string): Promise<string> {
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

  const pubDate = article.publishedAt || new Date();

  const authorsXml = article.authors.map((a, i) => {
    const affId = `aff${i + 1}`;
    return `
        <contrib contrib-type="author"${a.corresponding ? ' corresp="yes"' : ''}>
          ${a.orcid ? `<contrib-id contrib-id-type="orcid">https://orcid.org/${esc(a.orcid)}</contrib-id>` : ''}
          <name>
            <surname>${esc(a.familyName)}</surname>
            <given-names>${esc(a.givenName)}</given-names>
          </name>
          ${a.affiliation ? `<xref ref-type="aff" rid="${affId}"/>` : ''}
          ${a.corresponding ? `<email>${esc(a.email)}</email>` : ''}
        </contrib>`;
  }).join("");

  const affiliationsXml = article.authors
    .map((a, i) =>
      a.affiliation
        ? `\n        <aff id="aff${i + 1}">${esc(a.affiliation)}</aff>`
        : ''
    )
    .filter(Boolean)
    .join("");

  const keywordsXml = article.keywords.length > 0
    ? `
      <kwd-group>
        ${article.keywords.map((k) => `<kwd>${esc(k)}</kwd>`).join("\n        ")}
      </kwd-group>`
    : "";

  const fundingXml = article.funding
    ? `
      <funding-group>
        <funding-statement>${esc(article.funding)}</funding-statement>
      </funding-group>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Publishing DTD v1.3 20210610//EN"
  "JATS-journalpublishing1-3.dtd">
<article article-type="research-article" xml:lang="${esc(article.locale)}"
  dtd-version="1.3"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  <front>
    <journal-meta>
      <journal-id journal-id-type="publisher-id">${esc(article.journal.slug)}</journal-id>
      <journal-title-group>
        <journal-title>${esc(article.journal.name)}</journal-title>
        ${article.journal.abbreviation ? `<abbrev-journal-title>${esc(article.journal.abbreviation)}</abbrev-journal-title>` : ''}
      </journal-title-group>
      ${article.journal.issn ? `<issn publication-format="print">${esc(article.journal.issn)}</issn>` : ''}
      ${article.journal.eissn ? `<issn publication-format="electronic">${esc(article.journal.eissn)}</issn>` : ''}
      <publisher>
        <publisher-name>Stanford Open Press</publisher-name>
      </publisher>
    </journal-meta>
    <article-meta>
      ${article.doi ? `<article-id pub-id-type="doi">${esc(article.doi)}</article-id>` : ''}
      <article-id pub-id-type="publisher-id">${esc(article.id)}</article-id>
      <title-group>
        <article-title>${esc(article.title)}</article-title>
      </title-group>
      <contrib-group>${authorsXml}${affiliationsXml}
      </contrib-group>
      <pub-date publication-format="electronic" date-type="pub">
        <day>${String(pubDate.getDate()).padStart(2, '0')}</day>
        <month>${String(pubDate.getMonth() + 1).padStart(2, '0')}</month>
        <year>${pubDate.getFullYear()}</year>
      </pub-date>
      ${article.volume ? `<volume>${article.volume}</volume>` : ''}
      ${article.issue ? `<issue>${article.issue}</issue>` : ''}
      ${article.firstPage ? `<fpage>${esc(article.firstPage)}</fpage>` : ''}
      ${article.lastPage ? `<lpage>${esc(article.lastPage)}</lpage>` : ''}
      <permissions>
        <license license-type="open-access"
          xlink:href="https://creativecommons.org/licenses/by/4.0/">
          <license-p>${esc(article.articleLicense || article.journal.licenseType)}</license-p>
        </license>
      </permissions>
      ${article.abstract ? `
      <abstract>
        <p>${esc(article.abstract)}</p>
      </abstract>` : ''}
      ${keywordsXml}
      ${fundingXml}
    </article-meta>
  </front>
  <body>
    <sec>
      <p>[Full text not available in JATS format. See published article.]</p>
    </sec>
  </body>
</article>`;
}
