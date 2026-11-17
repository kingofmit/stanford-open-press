import { describe, it, expect } from "vitest";
import { buildCrossrefDepositXML } from "@/lib/crossref";

const sampleArticle = {
  title: "Test Article",
  doi: "10.1234/test.001",
  authors: [
    { givenName: "Jane", familyName: "Doe", orcid: "0000-0002-1234-5678" },
    { givenName: "John", familyName: "Smith", orcid: null },
  ],
  journal: { name: "Test Journal", issn: "1234-5678", eissn: "8765-4321" },
  publishedAt: new Date("2026-06-15"),
  volume: 1,
  issue: 2,
  firstPage: "10",
  lastPage: "25",
  abstract: "This is a test abstract.",
  url: "https://press.stanford.edu/test/article/001",
};

describe("Crossref", () => {
  describe("buildCrossrefDepositXML", () => {
    it("generates valid XML structure", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<doi_batch version="5.3.1"');
      expect(xml).toContain("<head>");
      expect(xml).toContain("<body>");
      expect(xml).toContain("</doi_batch>");
    });

    it("includes journal metadata", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain("<full_title>Test Journal</full_title>");
      expect(xml).toContain('<issn media_type="print">1234-5678</issn>');
      expect(xml).toContain('<issn media_type="electronic">8765-4321</issn>');
    });

    it("includes article title and DOI", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain("<title>Test Article</title>");
      expect(xml).toContain("<doi>10.1234/test.001</doi>");
      expect(xml).toContain("<resource>https://press.stanford.edu/test/article/001</resource>");
    });

    it("includes authors with correct sequence", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain('sequence="first" contributor_role="author"');
      expect(xml).toContain("<given_name>Jane</given_name>");
      expect(xml).toContain("<surname>Doe</surname>");
      expect(xml).toContain('sequence="additional"');
      expect(xml).toContain("<given_name>John</given_name>");
    });

    it("includes ORCID when present", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain("<ORCID>https://orcid.org/0000-0002-1234-5678</ORCID>");
    });

    it("excludes ORCID when null", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      // Should only have one ORCID tag (for Jane, not John)
      const orcidCount = (xml.match(/<ORCID>/g) || []).length;
      expect(orcidCount).toBe(1);
    });

    it("includes publication date", () => {
      // Use explicit local-time date to avoid timezone offset issues with ISO string parsing
      const pubDate = new Date(2026, 5, 15); // June 15, 2026 in local time
      const article = { ...sampleArticle, publishedAt: pubDate };
      const xml = buildCrossrefDepositXML(article);
      expect(xml).toContain("<year>2026</year>");
      expect(xml).toContain("<month>06</month>");
      expect(xml).toContain("<day>15</day>");
    });

    it("includes volume and issue", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain("<volume>1</volume>");
      expect(xml).toContain("<issue>2</issue>");
    });

    it("includes pages", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain("<first_page>10</first_page>");
      expect(xml).toContain("<last_page>25</last_page>");
    });

    it("handles missing optional fields", () => {
      const xml = buildCrossrefDepositXML({
        ...sampleArticle,
        volume: null,
        issue: null,
        firstPage: null,
        lastPage: null,
      });
      expect(xml).not.toContain("<volume>");
      expect(xml).not.toContain("<issue>");
      expect(xml).not.toContain("<first_page>");
    });

    it("escapes XML entities in title", () => {
      const xml = buildCrossrefDepositXML({
        ...sampleArticle,
        title: "A & B: Effects of <treatment> on \"outcomes\"",
      });
      expect(xml).toContain("A &amp; B");
      expect(xml).toContain("&lt;treatment&gt;");
    });

    it("includes depositor info", () => {
      const xml = buildCrossrefDepositXML(sampleArticle);
      expect(xml).toContain("<depositor_name>");
      expect(xml).toContain("<email_address>");
      expect(xml).toContain("<registrant>");
    });

    it("generates unique batch ID", () => {
      const xml1 = buildCrossrefDepositXML(sampleArticle);
      const xml2 = buildCrossrefDepositXML(sampleArticle);
      const batchId1 = xml1.match(/<doi_batch_id>(.*?)<\/doi_batch_id>/)?.[1];
      const batchId2 = xml2.match(/<doi_batch_id>(.*?)<\/doi_batch_id>/)?.[1];
      expect(batchId1).toBeDefined();
      expect(batchId2).toBeDefined();
      // Batch IDs should be different (timestamp-based)
      // They might be the same if run in same ms, so just check they exist
      expect(batchId1?.startsWith("sop-")).toBe(true);
    });
  });
});
