import { describe, it, expect } from "vitest";
import { formatCitation } from "../src/citations";
import { CitationFormat } from "../src/types";
import type { Citation } from "../src/types";

function makeCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    title: "Deep Learning for Natural Language Processing",
    authors: [
      { given: "Jane", family: "Smith" },
      { given: "John", family: "Doe" },
    ],
    journalTitle: "Journal of AI Research",
    volume: "42",
    issue: "3",
    pages: "100-115",
    year: 2024,
    doi: "10.1234/jair.2024.001",
    url: "https://example.com/article",
    ...overrides,
  };
}

function makeSingleAuthorCitation(): Citation {
  return makeCitation({
    authors: [{ given: "Alice", family: "Wang" }],
  });
}

describe("formatCitation - BibTeX", () => {
  it("starts with @article tag", () => {
    const result = formatCitation(makeCitation(), CitationFormat.BibTeX);
    expect(result).toMatch(/^@article\{/);
  });

  it("uses first author family name and year as key", () => {
    const result = formatCitation(makeCitation(), CitationFormat.BibTeX);
    expect(result).toContain("@article{Smith2024,");
  });

  it("includes title field", () => {
    const result = formatCitation(makeCitation(), CitationFormat.BibTeX);
    expect(result).toContain("title = {Deep Learning for Natural Language Processing}");
  });

  it("includes author field with 'and' separator", () => {
    const result = formatCitation(makeCitation(), CitationFormat.BibTeX);
    expect(result).toContain("author = {Smith, Jane and Doe, John}");
  });

  it("includes journal field", () => {
    const result = formatCitation(makeCitation(), CitationFormat.BibTeX);
    expect(result).toContain("journal = {Journal of AI Research}");
  });

  it("includes volume, number, pages, doi, url fields", () => {
    const result = formatCitation(makeCitation(), CitationFormat.BibTeX);
    expect(result).toContain("volume = {42}");
    expect(result).toContain("number = {3}");
    expect(result).toContain("pages = {100-115}");
    expect(result).toContain("doi = {10.1234/jair.2024.001}");
    expect(result).toContain("url = {https://example.com/article}");
  });

  it("omits optional fields when not present", () => {
    const result = formatCitation(
      makeCitation({ volume: undefined, issue: undefined, pages: undefined, doi: undefined, url: undefined }),
      CitationFormat.BibTeX,
    );
    expect(result).not.toContain("volume");
    expect(result).not.toContain("number");
    expect(result).not.toContain("pages");
    expect(result).not.toContain("doi");
    expect(result).not.toContain("url");
  });

  it("ends with closing brace", () => {
    const result = formatCitation(makeCitation(), CitationFormat.BibTeX);
    expect(result.trim()).toMatch(/\}$/);
  });
});

describe("formatCitation - RIS", () => {
  it("starts with TY - JOUR", () => {
    const result = formatCitation(makeCitation(), CitationFormat.RIS);
    expect(result).toMatch(/^TY  - JOUR/);
  });

  it("includes AU tags for each author", () => {
    const result = formatCitation(makeCitation(), CitationFormat.RIS);
    expect(result).toContain("AU  - Smith, Jane");
    expect(result).toContain("AU  - Doe, John");
  });

  it("includes TI tag", () => {
    const result = formatCitation(makeCitation(), CitationFormat.RIS);
    expect(result).toContain("TI  - Deep Learning for Natural Language Processing");
  });

  it("includes JO, PY, VL, IS, SP, DO, UR tags", () => {
    const result = formatCitation(makeCitation(), CitationFormat.RIS);
    expect(result).toContain("JO  - Journal of AI Research");
    expect(result).toContain("PY  - 2024");
    expect(result).toContain("VL  - 42");
    expect(result).toContain("IS  - 3");
    expect(result).toContain("SP  - 100-115");
    expect(result).toContain("DO  - 10.1234/jair.2024.001");
    expect(result).toContain("UR  - https://example.com/article");
  });

  it("ends with ER tag", () => {
    const result = formatCitation(makeCitation(), CitationFormat.RIS);
    expect(result).toContain("ER  - ");
  });
});

describe("formatCitation - APA", () => {
  it("formats single author correctly", () => {
    const result = formatCitation(makeSingleAuthorCitation(), CitationFormat.APA);
    expect(result).toMatch(/^Wang, A\./);
  });

  it("formats multiple authors with ampersand before last", () => {
    const result = formatCitation(makeCitation(), CitationFormat.APA);
    expect(result).toContain("Smith, J., & Doe, J.");
  });

  it("includes year in parentheses", () => {
    const result = formatCitation(makeCitation(), CitationFormat.APA);
    expect(result).toContain("(2024)");
  });

  it("includes title followed by journal in italics markers", () => {
    const result = formatCitation(makeCitation(), CitationFormat.APA);
    expect(result).toContain("Deep Learning for Natural Language Processing. *Journal of AI Research*");
  });

  it("includes DOI as https://doi.org/ URL", () => {
    const result = formatCitation(makeCitation(), CitationFormat.APA);
    expect(result).toContain("https://doi.org/10.1234/jair.2024.001");
  });

  it("includes volume in italics and issue in parens", () => {
    const result = formatCitation(makeCitation(), CitationFormat.APA);
    expect(result).toContain("*42*(3)");
  });
});

describe("formatCitation - MLA", () => {
  it("formats first author as Family, Given", () => {
    const result = formatCitation(makeCitation(), CitationFormat.MLA);
    expect(result).toMatch(/^Smith, Jane/);
  });

  it("formats additional authors as Given Family with 'and'", () => {
    const result = formatCitation(makeCitation(), CitationFormat.MLA);
    expect(result).toContain(", and John Doe");
  });

  it("includes title in quotes", () => {
    const result = formatCitation(makeCitation(), CitationFormat.MLA);
    expect(result).toContain('"Deep Learning for Natural Language Processing."');
  });

  it("includes vol. and no. prefixes", () => {
    const result = formatCitation(makeCitation(), CitationFormat.MLA);
    expect(result).toContain("vol. 42");
    expect(result).toContain("no. 3");
  });

  it("includes pp. prefix for pages", () => {
    const result = formatCitation(makeCitation(), CitationFormat.MLA);
    expect(result).toContain("pp. 100-115");
  });
});

describe("formatCitation - Chicago", () => {
  it("formats first author as Family, Given", () => {
    const result = formatCitation(makeCitation(), CitationFormat.Chicago);
    expect(result).toMatch(/^Smith, Jane/);
  });

  it("formats additional authors with 'and' before last", () => {
    const result = formatCitation(makeCitation(), CitationFormat.Chicago);
    expect(result).toContain("and John Doe");
  });

  it("includes title in quotes", () => {
    const result = formatCitation(makeCitation(), CitationFormat.Chicago);
    expect(result).toContain('"Deep Learning for Natural Language Processing."');
  });

  it("includes year in parentheses", () => {
    const result = formatCitation(makeCitation(), CitationFormat.Chicago);
    expect(result).toContain("(2024)");
  });

  it("includes volume and no. format", () => {
    const result = formatCitation(makeCitation(), CitationFormat.Chicago);
    expect(result).toContain("42, no. 3");
  });

  it("includes pages after colon", () => {
    const result = formatCitation(makeCitation(), CitationFormat.Chicago);
    expect(result).toContain(": 100-115");
  });

  it("includes DOI with trailing period", () => {
    const result = formatCitation(makeCitation(), CitationFormat.Chicago);
    expect(result).toContain("https://doi.org/10.1234/jair.2024.001.");
  });
});

describe("formatCitation - all formats produce output", () => {
  const formats = [
    CitationFormat.BibTeX,
    CitationFormat.RIS,
    CitationFormat.APA,
    CitationFormat.MLA,
    CitationFormat.Chicago,
  ];

  for (const format of formats) {
    it(`produces non-empty output for ${format}`, () => {
      const result = formatCitation(makeCitation(), format);
      expect(result.length).toBeGreaterThan(50);
    });
  }
});
