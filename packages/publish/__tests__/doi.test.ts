import { describe, it, expect } from "vitest";
import { generateDOISuffix, buildDOI, buildCrossrefXML, createDOIRecord } from "../src/doi";
import { DOIProvider } from "../src/types";
import type { DOIMetadata } from "../src/types";

function makeMetadata(overrides: Partial<DOIMetadata> = {}): DOIMetadata {
  return {
    title: "A Study on Unit Testing",
    authors: [
      { given: "Jane", family: "Smith" },
      { given: "John", family: "Doe" },
    ],
    journalTitle: "Journal of Software Engineering",
    issn: "1234-5678",
    volume: "10",
    issue: "2",
    pages: "50-65",
    publicationDate: "2024-06-15",
    ...overrides,
  };
}

describe("generateDOISuffix", () => {
  it("combines journal slug and article id with a dot", () => {
    expect(generateDOISuffix("jos", "art_001")).toBe("jos.art_001");
  });

  it("works with various slug formats", () => {
    expect(generateDOISuffix("my-journal", "12345")).toBe("my-journal.12345");
  });
});

describe("buildDOI", () => {
  it("combines prefix and suffix with a slash", () => {
    expect(buildDOI("10.1234", "jos.001")).toBe("10.1234/jos.001");
  });

  it("produces a valid DOI format", () => {
    const doi = buildDOI("10.5678", "test.article");
    expect(doi).toMatch(/^10\.\d+\//);
  });
});

describe("buildCrossrefXML", () => {
  it("produces valid XML with xml declaration", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  });

  it("includes doi_batch root element", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain("<doi_batch");
    expect(xml).toContain("</doi_batch>");
  });

  it("includes depositor information", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain("<depositor_name>Stanford Open Press</depositor_name>");
    expect(xml).toContain("<email_address>press@stanford-open-press.org</email_address>");
  });

  it("includes journal title", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain("<full_title>Journal of Software Engineering</full_title>");
  });

  it("includes ISSN when provided", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain("<issn>1234-5678</issn>");
  });

  it("omits ISSN when not provided", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata({ issn: undefined }));
    expect(xml).not.toContain("<issn>");
  });

  it("includes article title", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain("<title>A Study on Unit Testing</title>");
  });

  it("includes first author as sequence=first", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain('sequence="first"');
    expect(xml).toContain("<given_name>Jane</given_name>");
    expect(xml).toContain("<surname>Smith</surname>");
  });

  it("includes second author as sequence=additional", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain('sequence="additional"');
    expect(xml).toContain("<given_name>John</given_name>");
    expect(xml).toContain("<surname>Doe</surname>");
  });

  it("includes ORCID when provided", () => {
    const xml = buildCrossrefXML(
      "10.1234/test.001",
      makeMetadata({
        authors: [{ given: "Jane", family: "Smith", orcid: "0000-0001-2345-6789" }],
      }),
    );
    expect(xml).toContain("<ORCID>https://orcid.org/0000-0001-2345-6789</ORCID>");
  });

  it("includes publication year", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain("<year>2024</year>");
  });

  it("includes DOI data", () => {
    const xml = buildCrossrefXML("10.1234/test.001", makeMetadata());
    expect(xml).toContain("<doi>10.1234/test.001</doi>");
    expect(xml).toContain("<resource>https://doi.org/10.1234/test.001</resource>");
  });

  it("escapes XML special characters in title", () => {
    const xml = buildCrossrefXML(
      "10.1234/test.001",
      makeMetadata({ title: "A & B < C > D" }),
    );
    expect(xml).toContain("A &amp; B &lt; C &gt; D");
    expect(xml).not.toContain("<title>A & B");
  });
});

describe("createDOIRecord", () => {
  it("creates a DOI record with correct doi string", () => {
    const record = createDOIRecord("10.1234", "jos.001", makeMetadata());
    expect(record.doi).toBe("10.1234/jos.001");
  });

  it("creates a DOI URL", () => {
    const record = createDOIRecord("10.1234", "jos.001", makeMetadata());
    expect(record.url).toBe("https://doi.org/10.1234/jos.001");
  });

  it("defaults provider to Crossref", () => {
    const record = createDOIRecord("10.1234", "jos.001", makeMetadata());
    expect(record.provider).toBe(DOIProvider.Crossref);
  });

  it("allows overriding provider to DataCite", () => {
    const record = createDOIRecord("10.1234", "jos.001", makeMetadata(), DOIProvider.DataCite);
    expect(record.provider).toBe(DOIProvider.DataCite);
  });

  it("sets registeredAt to current timestamp", () => {
    const before = new Date().toISOString();
    const record = createDOIRecord("10.1234", "jos.001", makeMetadata());
    expect(record.registeredAt >= before).toBe(true);
  });

  it("stores the metadata", () => {
    const metadata = makeMetadata();
    const record = createDOIRecord("10.1234", "jos.001", metadata);
    expect(record.metadata).toBe(metadata);
  });
});
