import type { JATSArticle } from "./types";

/**
 * Generate JATS XML from article metadata.
 * Produces standards-compliant XML suitable for PubMed Central, DOAJ, and other indexers.
 */
export function generateJATSXML(article: JATSArticle): string {
  const authors = article.authors
    .map(
      (a) => `        <contrib contrib-type="author">
          <name>
            <surname>${escapeXML(a.family)}</surname>
            <given-names>${escapeXML(a.given)}</given-names>
          </name>${a.affiliation ? `\n          <aff>${escapeXML(a.affiliation)}</aff>` : ""}${a.orcid ? `\n          <contrib-id contrib-id-type="orcid">${a.orcid}</contrib-id>` : ""}
        </contrib>`,
    )
    .join("\n");

  const keywords = article.keywords
    .map((k) => `        <kwd>${escapeXML(k)}</kwd>`)
    .join("\n");

  const references = (article.references ?? [])
    .map(
      (r) => `      <ref id="${escapeXML(r.id)}">
        <mixed-citation>${escapeXML(r.citation)}</mixed-citation>
      </ref>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD v1.3 20210610//EN" "JATS-archivearticle1-3.dtd">
<article article-type="${escapeXML(article.articleType)}" xml:lang="en">
  <front>
    <journal-meta>
      <journal-title-group>
        <journal-title>${escapeXML(article.journalMeta.journalTitle)}</journal-title>
      </journal-title-group>${article.journalMeta.issn ? `\n      <issn>${article.journalMeta.issn}</issn>` : ""}
      <publisher>
        <publisher-name>${escapeXML(article.journalMeta.publisherName)}</publisher-name>
      </publisher>
    </journal-meta>
    <article-meta>${article.articleMeta.doi ? `\n      <article-id pub-id-type="doi">${article.articleMeta.doi}</article-id>` : ""}
      <title-group>
        <article-title>${escapeXML(article.title)}</article-title>
      </title-group>
      <contrib-group>
${authors}
      </contrib-group>
      <pub-date pub-type="epub">
        <year>${article.articleMeta.publicationDate.slice(0, 4)}</year>
      </pub-date>${article.articleMeta.volume ? `\n      <volume>${article.articleMeta.volume}</volume>` : ""}${article.articleMeta.issue ? `\n      <issue>${article.articleMeta.issue}</issue>` : ""}${article.articleMeta.fpage ? `\n      <fpage>${article.articleMeta.fpage}</fpage>` : ""}${article.articleMeta.lpage ? `\n      <lpage>${article.articleMeta.lpage}</lpage>` : ""}
      <abstract>
        <p>${escapeXML(article.abstract)}</p>
      </abstract>
      <kwd-group>
${keywords}
      </kwd-group>
    </article-meta>
  </front>${article.body ? `\n  <body>\n    <p>${escapeXML(article.body)}</p>\n  </body>` : ""}${references.length > 0 ? `\n  <back>\n    <ref-list>\n${references}\n    </ref-list>\n  </back>` : ""}
</article>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
