import type { Citation } from "./types";
import { CitationFormat } from "./types";

/**
 * Format a citation in the specified style.
 */
export function formatCitation(citation: Citation, format: CitationFormat): string {
  switch (format) {
    case CitationFormat.BibTeX:
      return formatBibTeX(citation);
    case CitationFormat.RIS:
      return formatRIS(citation);
    case CitationFormat.APA:
      return formatAPA(citation);
    case CitationFormat.MLA:
      return formatMLA(citation);
    case CitationFormat.Chicago:
      return formatChicago(citation);
  }
}

function formatBibTeX(c: Citation): string {
  const key = `${c.authors[0]?.family ?? "unknown"}${c.year}`;
  const authors = c.authors.map((a) => `${a.family}, ${a.given}`).join(" and ");

  let bib = `@article{${key},\n`;
  bib += `  title = {${c.title}},\n`;
  bib += `  author = {${authors}},\n`;
  bib += `  journal = {${c.journalTitle}},\n`;
  bib += `  year = {${c.year}},\n`;
  if (c.volume) bib += `  volume = {${c.volume}},\n`;
  if (c.issue) bib += `  number = {${c.issue}},\n`;
  if (c.pages) bib += `  pages = {${c.pages}},\n`;
  if (c.doi) bib += `  doi = {${c.doi}},\n`;
  if (c.url) bib += `  url = {${c.url}},\n`;
  bib += `}`;
  return bib;
}

function formatRIS(c: Citation): string {
  let ris = `TY  - JOUR\n`;
  for (const a of c.authors) {
    ris += `AU  - ${a.family}, ${a.given}\n`;
  }
  ris += `TI  - ${c.title}\n`;
  ris += `JO  - ${c.journalTitle}\n`;
  ris += `PY  - ${c.year}\n`;
  if (c.volume) ris += `VL  - ${c.volume}\n`;
  if (c.issue) ris += `IS  - ${c.issue}\n`;
  if (c.pages) ris += `SP  - ${c.pages}\n`;
  if (c.doi) ris += `DO  - ${c.doi}\n`;
  if (c.url) ris += `UR  - ${c.url}\n`;
  ris += `ER  - `;
  return ris;
}

function formatAPA(c: Citation): string {
  const authors = c.authors
    .map((a, i) => {
      const name = `${a.family}, ${a.given[0]}.`;
      if (i === c.authors.length - 1 && c.authors.length > 1) return `& ${name}`;
      return name;
    })
    .join(", ");

  let apa = `${authors} (${c.year}). ${c.title}. *${c.journalTitle}*`;
  if (c.volume) apa += `, *${c.volume}*`;
  if (c.issue) apa += `(${c.issue})`;
  if (c.pages) apa += `, ${c.pages}`;
  apa += ".";
  if (c.doi) apa += ` https://doi.org/${c.doi}`;
  return apa;
}

function formatMLA(c: Citation): string {
  const firstAuthor = c.authors[0];
  let authors = firstAuthor ? `${firstAuthor.family}, ${firstAuthor.given}` : "";
  for (let i = 1; i < c.authors.length; i++) {
    const a = c.authors[i];
    if (i === c.authors.length - 1) {
      authors += `, and ${a.given} ${a.family}`;
    } else {
      authors += `, ${a.given} ${a.family}`;
    }
  }

  let mla = `${authors}. "${c.title}." *${c.journalTitle}*`;
  if (c.volume) mla += `, vol. ${c.volume}`;
  if (c.issue) mla += `, no. ${c.issue}`;
  mla += `, ${c.year}`;
  if (c.pages) mla += `, pp. ${c.pages}`;
  mla += ".";
  if (c.doi) mla += ` https://doi.org/${c.doi}`;
  return mla;
}

function formatChicago(c: Citation): string {
  const authors = c.authors
    .map((a, i) => {
      if (i === 0) return `${a.family}, ${a.given}`;
      if (i === c.authors.length - 1 && c.authors.length > 1) return `and ${a.given} ${a.family}`;
      return `${a.given} ${a.family}`;
    })
    .join(", ");

  let chi = `${authors}. "${c.title}." *${c.journalTitle}*`;
  if (c.volume) chi += ` ${c.volume}`;
  if (c.issue) chi += `, no. ${c.issue}`;
  chi += ` (${c.year})`;
  if (c.pages) chi += `: ${c.pages}`;
  chi += ".";
  if (c.doi) chi += ` https://doi.org/${c.doi}.`;
  return chi;
}
