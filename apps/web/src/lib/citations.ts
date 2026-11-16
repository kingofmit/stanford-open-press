interface CitationData {
  title: string;
  authors: { givenName: string; familyName: string }[];
  journalName: string;
  volume?: number | null;
  issue?: number | null;
  firstPage?: string | null;
  lastPage?: string | null;
  year: number;
  doi?: string | null;
}

export function formatBibTeX(data: CitationData): string {
  const key = `${data.authors[0]?.familyName || "unknown"}${data.year}`;
  const authorStr = data.authors.map((a) => `${a.familyName}, ${a.givenName}`).join(" and ");
  const lines = [
    `@article{${key},`,
    `  title = {${data.title}},`,
    `  author = {${authorStr}},`,
    `  journal = {${data.journalName}},`,
    `  year = {${data.year}},`,
  ];
  if (data.volume) lines.push(`  volume = {${data.volume}},`);
  if (data.issue) lines.push(`  number = {${data.issue}},`);
  if (data.firstPage) lines.push(`  pages = {${data.firstPage}${data.lastPage ? `--${data.lastPage}` : ""}},`);
  if (data.doi) lines.push(`  doi = {${data.doi}},`);
  lines.push("}");
  return lines.join("\n");
}

export function formatRIS(data: CitationData): string {
  const lines = [
    "TY  - JOUR",
    `TI  - ${data.title}`,
  ];
  data.authors.forEach((a) => lines.push(`AU  - ${a.familyName}, ${a.givenName}`));
  lines.push(`JO  - ${data.journalName}`);
  lines.push(`PY  - ${data.year}`);
  if (data.volume) lines.push(`VL  - ${data.volume}`);
  if (data.issue) lines.push(`IS  - ${data.issue}`);
  if (data.firstPage) lines.push(`SP  - ${data.firstPage}`);
  if (data.lastPage) lines.push(`EP  - ${data.lastPage}`);
  if (data.doi) lines.push(`DO  - ${data.doi}`);
  lines.push("ER  - ");
  return lines.join("\n");
}

export function formatAPA(data: CitationData): string {
  const authors = data.authors.map((a, i) => {
    const name = `${a.familyName}, ${a.givenName[0]}.`;
    if (i === data.authors.length - 1 && data.authors.length > 1) return `& ${name}`;
    return name;
  }).join(", ").replace(", &", " &");

  let citation = `${authors} (${data.year}). ${data.title}. *${data.journalName}*`;
  if (data.volume) citation += `, *${data.volume}*`;
  if (data.issue) citation += `(${data.issue})`;
  if (data.firstPage) citation += `, ${data.firstPage}${data.lastPage ? `\u2013${data.lastPage}` : ""}`;
  citation += ".";
  if (data.doi) citation += ` https://doi.org/${data.doi}`;
  return citation;
}

export function formatChicago(data: CitationData): string {
  const authors = data.authors.map((a, i) => {
    if (i === 0) return `${a.familyName}, ${a.givenName}`;
    return `${a.givenName} ${a.familyName}`;
  }).join(", ");

  let citation = `${authors}. "${data.title}." *${data.journalName}*`;
  if (data.volume) citation += ` ${data.volume}`;
  if (data.issue) citation += `, no. ${data.issue}`;
  citation += ` (${data.year})`;
  if (data.firstPage) citation += `: ${data.firstPage}${data.lastPage ? `\u2013${data.lastPage}` : ""}`;
  citation += ".";
  if (data.doi) citation += ` https://doi.org/${data.doi}`;
  return citation;
}

export function formatMLA(data: CitationData): string {
  const authors = data.authors.map((a, i) => {
    if (i === 0) return `${a.familyName}, ${a.givenName}`;
    return `${a.givenName} ${a.familyName}`;
  }).join(", ");

  let citation = `${authors}. "${data.title}." *${data.journalName}*`;
  if (data.volume) citation += `, vol. ${data.volume}`;
  if (data.issue) citation += `, no. ${data.issue}`;
  citation += `, ${data.year}`;
  if (data.firstPage) citation += `, pp. ${data.firstPage}${data.lastPage ? `\u2013${data.lastPage}` : ""}`;
  citation += ".";
  if (data.doi) citation += ` https://doi.org/${data.doi}`;
  return citation;
}

export type CitationFormat = "bibtex" | "ris" | "apa" | "chicago" | "mla";

export function formatCitation(data: CitationData, format: CitationFormat): string {
  switch (format) {
    case "bibtex": return formatBibTeX(data);
    case "ris": return formatRIS(data);
    case "apa": return formatAPA(data);
    case "chicago": return formatChicago(data);
    case "mla": return formatMLA(data);
  }
}
