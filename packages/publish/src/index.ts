// Types
export type {
  DOI,
  DOIMetadata,
  Volume,
  Issue,
  Citation,
  JATSArticle,
  OAIPMHRecord,
} from "./types";

export { DOIProvider, CitationFormat } from "./types";

// DOI
export { generateDOISuffix, buildDOI, buildCrossrefXML, createDOIRecord } from "./doi";
export type { DOIRegistrationConfig } from "./doi";

// JATS XML
export { generateJATSXML } from "./jats";

// Citations
export { formatCitation } from "./citations";

// Issues
export { createVolume, createIssue, addArticleToIssue, publishIssue, removeArticleFromIssue } from "./issues";

// OAI-PMH
export { buildOAIPMHRecord, generateOAIPMHListRecords } from "./oai-pmh";
