import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "About" };

export default async function AboutPage({ params }: Params) {
  const { slug } = await params;
  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-heading font-bold text-cardinal mb-6">About {journal.name}</h1>

      {journal.description && (
        <section className="mb-8">
          <p className="text-gray-700 font-body leading-relaxed">{journal.description}</p>
        </section>
      )}

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-heading font-semibold text-cardinal mb-2">Peer Review Policy</h2>
          <p className="text-sm text-gray-600">
            This journal uses <strong>{journal.peerReviewType.replace("-", " ")}</strong> peer review.
            All submitted manuscripts are evaluated by at least two independent reviewers.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-heading font-semibold text-cardinal mb-2">Open Access</h2>
          <p className="text-sm text-gray-600">
            All articles are published under a{" "}
            <a
              href={`https://creativecommons.org/licenses/${journal.licenseType.replace("CC-", "").toLowerCase()}/4.0/`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-digital-red hover:text-cardinal underline"
            >
              {journal.licenseType}
            </a>{" "}
            license.
            {journal.copyrightPolicy === "author-retains" && " Authors retain copyright of their work."}
          </p>
          {(journal.apcAmount ?? 0) > 0 ? (
            <p className="text-sm text-gray-600 mt-1">
              Article processing charge: {journal.apcAmount} {journal.apcCurrency}
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">
              There are no article processing charges (APCs) for this journal.
            </p>
          )}
        </div>

        {journal.issn && (
          <div>
            <h2 className="text-lg font-heading font-semibold text-cardinal mb-2">Identifiers</h2>
            <p className="text-sm text-gray-600">
              ISSN: {journal.issn}
              {journal.eissn && ` | eISSN: ${journal.eissn}`}
              {journal.doiPrefix && ` | DOI prefix: ${journal.doiPrefix}`}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
