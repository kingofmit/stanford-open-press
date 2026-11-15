import type { ID, ISODate } from "@stanford-press/core";

/** DOI registration provider */
export enum DOIProvider {
  Crossref = "crossref",
  DataCite = "datacite",
}

/** A Digital Object Identifier record */
export interface DOI {
  doi: string;
  url: string;
  provider: DOIProvider;
  registeredAt: ISODate;
  metadata: DOIMetadata;
}

/** Metadata required for DOI registration */
export interface DOIMetadata {
  title: string;
  authors: Array<{ given: string; family: string; orcid?: string }>;
  journalTitle: string;
  issn?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publicationDate: string;
  abstract?: string;
  /** License URL (e.g., Creative Commons) */
  licenseUrl?: string;
}

/** A journal volume */
export interface Volume {
  id: ID;
  journalId: ID;
  number: number;
  year: number;
  title?: string;
}

/** A journal issue */
export interface Issue {
  id: ID;
  journalId: ID;
  volumeId: ID;
  number: number;
  title?: string;
  description?: string;
  coverImageUrl?: string;
  publishedAt?: ISODate;
  articleIds: ID[];
}

/** Citation format */
export enum CitationFormat {
  BibTeX = "bibtex",
  RIS = "ris",
  APA = "apa",
  MLA = "mla",
  Chicago = "chicago",
}

/** Citation data for an article */
export interface Citation {
  title: string;
  authors: Array<{ given: string; family: string }>;
  journalTitle: string;
  volume?: string;
  issue?: string;
  pages?: string;
  year: number;
  doi?: string;
  url?: string;
}

/** JATS XML article representation */
export interface JATSArticle {
  articleType: string;
  title: string;
  authors: Array<{
    given: string;
    family: string;
    affiliation?: string;
    orcid?: string;
  }>;
  abstract: string;
  keywords: string[];
  journalMeta: {
    journalTitle: string;
    issn?: string;
    publisherName: string;
  };
  articleMeta: {
    doi?: string;
    volume?: string;
    issue?: string;
    fpage?: string;
    lpage?: string;
    publicationDate: string;
  };
  body?: string;
  references?: Array<{ id: string; citation: string }>;
}

/** OAI-PMH record for harvesting */
export interface OAIPMHRecord {
  identifier: string;
  datestamp: ISODate;
  setSpec?: string[];
  metadata: {
    title: string;
    creators: string[];
    subjects: string[];
    description: string;
    publisher: string;
    date: string;
    type: string;
    format: string;
    identifier: string;
    language?: string;
    rights?: string;
  };
}
