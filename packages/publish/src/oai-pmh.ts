import type { OAIPMHRecord } from "./types";

/**
 * Build an OAI-PMH record from article metadata for harvesting by indexers.
 */
export function buildOAIPMHRecord(metadata: {
  identifier: string;
  title: string;
  creators: string[];
  subjects: string[];
  description: string;
  publisher: string;
  date: string;
  language?: string;
  rights?: string;
}): OAIPMHRecord {
  return {
    identifier: `oai:stanford-open-press:${metadata.identifier}`,
    datestamp: new Date().toISOString(),
    metadata: {
      title: metadata.title,
      creators: metadata.creators,
      subjects: metadata.subjects,
      description: metadata.description,
      publisher: metadata.publisher,
      date: metadata.date,
      type: "info:eu-repo/semantics/article",
      format: "application/pdf",
      identifier: metadata.identifier,
      language: metadata.language,
      rights: metadata.rights,
    },
  };
}

/**
 * Generate OAI-PMH XML response for a ListRecords request.
 */
export function generateOAIPMHListRecords(records: OAIPMHRecord[]): string {
  const recordsXML = records
    .map(
      (r) => `    <record>
      <header>
        <identifier>${escapeXML(r.identifier)}</identifier>
        <datestamp>${r.datestamp}</datestamp>${r.setSpec ? r.setSpec.map((s) => `\n        <setSpec>${escapeXML(s)}</setSpec>`).join("") : ""}
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>${escapeXML(r.metadata.title)}</dc:title>
${r.metadata.creators.map((c) => `          <dc:creator>${escapeXML(c)}</dc:creator>`).join("\n")}
${r.metadata.subjects.map((s) => `          <dc:subject>${escapeXML(s)}</dc:subject>`).join("\n")}
          <dc:description>${escapeXML(r.metadata.description)}</dc:description>
          <dc:publisher>${escapeXML(r.metadata.publisher)}</dc:publisher>
          <dc:date>${r.metadata.date}</dc:date>
          <dc:type>${r.metadata.type}</dc:type>
          <dc:format>${r.metadata.format}</dc:format>
          <dc:identifier>${escapeXML(r.metadata.identifier)}</dc:identifier>${r.metadata.language ? `\n          <dc:language>${r.metadata.language}</dc:language>` : ""}${r.metadata.rights ? `\n          <dc:rights>${escapeXML(r.metadata.rights)}</dc:rights>` : ""}
        </oai_dc:dc>
      </metadata>
    </record>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>${new Date().toISOString()}</responseDate>
  <ListRecords>
${recordsXML}
  </ListRecords>
</OAI-PMH>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
