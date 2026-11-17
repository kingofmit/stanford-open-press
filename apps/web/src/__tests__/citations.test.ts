import { describe, it, expect } from "vitest";
import { formatBibTeX, formatRIS, formatAPA, formatChicago, formatMLA, formatCitation } from "@/lib/citations";

const sampleData = {
  title: "Machine Learning for Drug Discovery",
  authors: [
    { givenName: "Jane", familyName: "Doe" },
    { givenName: "John", familyName: "Smith" },
  ],
  journalName: "Journal of Computational Biology",
  volume: 12,
  issue: 3,
  firstPage: "45",
  lastPage: "67",
  year: 2026,
  doi: "10.1234/jcb.2026.001",
};

describe("Citations", () => {
  describe("formatBibTeX", () => {
    it("generates valid BibTeX", () => {
      const result = formatBibTeX(sampleData);
      expect(result).toContain("@article{Doe2026,");
      expect(result).toContain("title = {Machine Learning for Drug Discovery}");
      expect(result).toContain("author = {Doe, Jane and Smith, John}");
      expect(result).toContain("journal = {Journal of Computational Biology}");
      expect(result).toContain("year = {2026}");
      expect(result).toContain("volume = {12}");
      expect(result).toContain("number = {3}");
      expect(result).toContain("pages = {45--67}");
      expect(result).toContain("doi = {10.1234/jcb.2026.001}");
    });

    it("handles single author", () => {
      const result = formatBibTeX({ ...sampleData, authors: [sampleData.authors[0]] });
      expect(result).toContain("author = {Doe, Jane}");
    });

    it("handles missing optional fields", () => {
      const result = formatBibTeX({ ...sampleData, volume: null, issue: null, doi: null });
      expect(result).not.toContain("volume");
      expect(result).not.toContain("number");
      expect(result).not.toContain("doi");
    });
  });

  describe("formatRIS", () => {
    it("generates valid RIS", () => {
      const result = formatRIS(sampleData);
      expect(result).toContain("TY  - JOUR");
      expect(result).toContain("TI  - Machine Learning for Drug Discovery");
      expect(result).toContain("AU  - Doe, Jane");
      expect(result).toContain("AU  - Smith, John");
      expect(result).toContain("PY  - 2026");
      expect(result).toContain("VL  - 12");
      expect(result).toContain("DO  - 10.1234/jcb.2026.001");
      expect(result).toContain("ER  - ");
    });
  });

  describe("formatAPA", () => {
    it("formats with two authors correctly", () => {
      const result = formatAPA(sampleData);
      expect(result).toContain("Doe, J.");
      expect(result).toContain("& Smith, J.");
      expect(result).toContain("(2026)");
      expect(result).toContain("*Journal of Computational Biology*");
      expect(result).toContain("https://doi.org/10.1234/jcb.2026.001");
    });

    it("formats single author", () => {
      const result = formatAPA({ ...sampleData, authors: [sampleData.authors[0]] });
      expect(result).toContain("Doe, J. (2026)");
      expect(result).not.toContain("&");
    });
  });

  describe("formatChicago", () => {
    it("generates Chicago format", () => {
      const result = formatChicago(sampleData);
      expect(result).toContain("Doe, Jane");
      expect(result).toContain("John Smith");
      expect(result).toContain('"Machine Learning for Drug Discovery."');
      expect(result).toContain("(2026)");
    });
  });

  describe("formatMLA", () => {
    it("generates MLA format", () => {
      const result = formatMLA(sampleData);
      expect(result).toContain("Doe, Jane");
      expect(result).toContain("John Smith");
      expect(result).toContain("vol. 12");
      expect(result).toContain("no. 3");
      expect(result).toContain("pp. 45");
    });
  });

  describe("formatCitation", () => {
    it("dispatches to correct formatter", () => {
      expect(formatCitation(sampleData, "bibtex")).toContain("@article");
      expect(formatCitation(sampleData, "ris")).toContain("TY  - JOUR");
      expect(formatCitation(sampleData, "apa")).toContain("(2026)");
      expect(formatCitation(sampleData, "chicago")).toContain('"Machine Learning');
      expect(formatCitation(sampleData, "mla")).toContain("vol. 12");
    });
  });
});
