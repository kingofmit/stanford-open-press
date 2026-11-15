import type { DOI, DOIMetadata } from "./types";
import { DOIProvider } from "./types";

/** Configuration for DOI registration */
export interface DOIRegistrationConfig {
  provider: DOIProvider;
  prefix: string;
  /** API credentials */
  username?: string;
  password?: string;
  /** Whether to use the test/sandbox API */
  sandbox?: boolean;
}

/**
 * Generate a DOI suffix from submission metadata.
 */
export function generateDOISuffix(journalSlug: string, articleId: string): string {
  return `${journalSlug}.${articleId}`;
}

/**
 * Build a full DOI from prefix and suffix.
 */
export function buildDOI(prefix: string, suffix: string): string {
  return `${prefix}/${suffix}`;
}

/**
 * Build the Crossref XML deposit for DOI registration.
 */
export function buildCrossrefXML(doi: string, metadata: DOIMetadata): string {
  const authors = metadata.authors
    .map(
      (a) =>
        `      <person_name contributor_role="author" sequence="${metadata.authors.indexOf(a) === 0 ? "first" : "additional"}">
        <given_name>${escapeXML(a.given)}</given_name>
        <surname>${escapeXML(a.family)}</surname>${a.orcid ? `\n        <ORCID>https://orcid.org/${a.orcid}</ORCID>` : ""}
      </person_name>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1">
  <head>
    <doi_batch_id>${Date.now()}</doi_batch_id>
    <timestamp>${new Date().toISOString()}</timestamp>
    <depositor>
      <depositor_name>Stanford Open Press</depositor_name>
      <email_address>press@stanford-open-press.org</email_address>
    </depositor>
  </head>
  <body>
    <journal>
      <journal_metadata>
        <full_title>${escapeXML(metadata.journalTitle)}</full_title>${metadata.issn ? `\n        <issn>${metadata.issn}</issn>` : ""}
      </journal_metadata>
      <journal_article>
        <titles>
          <title>${escapeXML(metadata.title)}</title>
        </titles>
        <contributors>
${authors}
        </contributors>
        <publication_date>
          <year>${metadata.publicationDate.slice(0, 4)}</year>
        </publication_date>
        <doi_data>
          <doi>${doi}</doi>
          <resource>https://doi.org/${doi}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>`;
}

/**
 * Create a DOI record (local registration — actual API call would go through a service).
 */
export function createDOIRecord(
  prefix: string,
  suffix: string,
  metadata: DOIMetadata,
  provider: DOIProvider = DOIProvider.Crossref,
): DOI {
  const doi = buildDOI(prefix, suffix);
  return {
    doi,
    url: `https://doi.org/${doi}`,
    provider,
    registeredAt: new Date().toISOString(),
    metadata,
  };
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
