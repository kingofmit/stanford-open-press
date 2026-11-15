# @stanford-press/publish

DOI registration, JATS XML generation, citation export, issue management, and OAI-PMH for Stanford Open Press.

## Features

- **DOI Registration** — Crossref and DataCite API integration with XML deposit generation
- **JATS XML** — Standards-compliant XML for PubMed Central, DOAJ, and other indexers
- **Citation Export** — BibTeX, RIS, APA, MLA, Chicago formats
- **Issue Management** — Organize articles into volumes and issues
- **OAI-PMH** — Metadata harvesting protocol for indexers and aggregators

## Usage

```typescript
import {
  createDOIRecord,
  generateJATSXML,
  formatCitation,
  createVolume,
  createIssue,
  CitationFormat,
  DOIProvider,
} from "@stanford-press/publish";

// Register a DOI
const doi = createDOIRecord("10.1234", "jos.001", {
  title: "A Novel Approach",
  authors: [{ given: "Jane", family: "Doe" }],
  journalTitle: "Journal of Open Science",
  publicationDate: "2026-01-15",
});

// Export citation
const bibtex = formatCitation({
  title: "A Novel Approach",
  authors: [{ given: "Jane", family: "Doe" }],
  journalTitle: "Journal of Open Science",
  year: 2026,
  doi: "10.1234/jos.001",
}, CitationFormat.BibTeX);
```

## License

[MIT](../../LICENSE) - [Ahmed Allem](https://kingallem.com)
