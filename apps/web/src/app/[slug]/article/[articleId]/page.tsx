import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

type Params = { params: Promise<{ slug: string; articleId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, articleId } = await params;
  const article = await prisma.submission.findUnique({
    where: { id: articleId },
    include: {
      authors: { orderBy: { sortOrder: "asc" } },
      journal: { select: { name: true, slug: true, issn: true, eissn: true } },
    },
  });

  if (!article || article.status !== "Published" || article.journal.slug !== slug) return {};

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const pdfFile = await prisma.fileAttachment.findFirst({
    where: { submissionId: articleId, category: "Galley", mimeType: "application/pdf" },
    orderBy: { uploadedAt: "desc" },
  });

  // Highwire Press meta tags for Google Scholar
  const other: Record<string, string | string[]> = {
    "citation_title": article.title,
    "citation_journal_title": article.journal.name,
    "citation_author": article.authors.map((a) => `${a.givenName} ${a.familyName}`),
  };

  if (article.publishedAt) {
    other["citation_publication_date"] = `${article.publishedAt.getFullYear()}/${String(article.publishedAt.getMonth() + 1).padStart(2, "0")}/${String(article.publishedAt.getDate()).padStart(2, "0")}`;
  }
  if (article.doi) other["citation_doi"] = article.doi;
  if (article.journal.issn) other["citation_issn"] = article.journal.issn;
  if (article.volume) other["citation_volume"] = String(article.volume);
  if (article.issue) other["citation_issue"] = String(article.issue);
  if (article.firstPage) other["citation_firstpage"] = article.firstPage;
  if (article.lastPage) other["citation_lastpage"] = article.lastPage;
  if (pdfFile) other["citation_pdf_url"] = `${baseUrl}/api/files/${pdfFile.storagePath}`;

  return {
    title: article.title,
    description: article.abstract?.slice(0, 300),
    other,
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug, articleId } = await params;

  const article = await prisma.submission.findUnique({
    where: { id: articleId },
    include: {
      authors: { orderBy: { sortOrder: "asc" } },
      journal: { select: { name: true, slug: true, issn: true, primaryColor: true, accentColor: true } },
      files: {
        where: { category: { in: ["Galley", "Manuscript", "Supplementary"] } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!article || article.status !== "Published" || article.journal.slug !== slug) {
    notFound();
  }

  const pdfFile = article.files.find((f) => f.mimeType === "application/pdf");
  const suppFiles = article.files.filter((f) => f.category === "Supplementary");

  function formatDate(date: Date | null): string {
    if (!date) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {/* Article header */}
      <article>
        <header className="mb-8">
          <h1 className="text-2xl font-heading font-bold text-navy-950 leading-tight sm:text-3xl">
            {article.title}
          </h1>

          <div className="mt-4 space-y-1">
            {article.authors.map((author, i) => (
              <span key={i} className="text-sm text-gray-700">
                {i > 0 && ", "}
                <span className="font-medium">{author.givenName} {author.familyName}</span>
                {author.corresponding && <sup className="text-brand-500 ml-0.5">*</sup>}
                {author.affiliation && (
                  <span className="text-gray-400"> ({author.affiliation})</span>
                )}
                {author.orcid && (
                  <a
                    href={`https://orcid.org/${author.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block ml-1"
                    title="ORCID"
                  >
                    <svg width="12" height="12" viewBox="0 0 256 256" className="inline">
                      <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0z" fill="#A6CE39"/>
                    </svg>
                  </a>
                )}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {article.publishedAt && <span>Published {formatDate(article.publishedAt)}</span>}
            {article.doi && (
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:text-brand-700 transition-colors"
              >
                https://doi.org/{article.doi}
              </a>
            )}
            {article.volume && <span>Vol. {article.volume}</span>}
            {article.issue && <span>Issue {article.issue}</span>}
            {article.firstPage && (
              <span>pp. {article.firstPage}{article.lastPage ? `\u2013${article.lastPage}` : ""}</span>
            )}
          </div>
        </header>

        {/* Actions bar */}
        <div className="flex flex-wrap gap-3 mb-8 pb-8 border-b">
          {pdfFile && (
            <a
              href={`/api/files/${pdfFile.storagePath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Download PDF
            </a>
          )}
          <div className="flex gap-2">
            {(["bibtex", "ris", "apa", "mla", "chicago"] as const).map((fmt) => (
              <a
                key={fmt}
                href={`/api/articles/${article.id}/cite?format=${fmt}`}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors uppercase"
              >
                {fmt}
              </a>
            ))}
          </div>
        </div>

        {/* Abstract */}
        {article.abstract && (
          <section className="mb-8">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">Abstract</h2>
            <p className="text-gray-700 font-body leading-relaxed whitespace-pre-wrap">{article.abstract}</p>
          </section>
        )}

        {/* Keywords */}
        {article.keywords.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {article.keywords.map((kw, i) => (
                <span key={i} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                  {kw}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Supplementary files */}
        {suppFiles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">Supplementary Materials</h2>
            <div className="space-y-2">
              {suppFiles.map((f) => (
                <a
                  key={f.id}
                  href={`/api/files/${f.storagePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-700 transition-colors"
                >
                  &#128196; {f.filename}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Disclosures */}
        <section className="border-t pt-8 space-y-4 text-sm text-gray-600">
          {article.funding && (
            <div>
              <h3 className="font-heading font-semibold text-gray-900 mb-1">Funding</h3>
              <p>{article.funding}</p>
            </div>
          )}
          {article.conflictOfInterest && (
            <div>
              <h3 className="font-heading font-semibold text-gray-900 mb-1">Conflict of Interest</h3>
              <p>{article.conflictOfInterest}</p>
            </div>
          )}
          {article.dataAvailability && (
            <div>
              <h3 className="font-heading font-semibold text-gray-900 mb-1">Data Availability</h3>
              <p>{article.dataAvailability}</p>
            </div>
          )}
          {article.articleLicense && (
            <div>
              <h3 className="font-heading font-semibold text-gray-900 mb-1">License</h3>
              <p>{article.articleLicense}</p>
            </div>
          )}
          {article.authors.some((a) => a.corresponding) && (
            <div>
              <h3 className="font-heading font-semibold text-gray-900 mb-1">Corresponding Author</h3>
              {article.authors.filter((a) => a.corresponding).map((a, i) => (
                <p key={i}>{a.givenName} {a.familyName} — <a href={`mailto:${a.email}`} className="text-brand-500">{a.email}</a></p>
              ))}
            </div>
          )}
        </section>
      </article>
    </main>
  );
}
