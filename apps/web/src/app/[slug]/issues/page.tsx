import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "Archives" };

export default async function IssuesPage({ params }: Params) {
  const { slug } = await params;
  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) notFound();

  const volumes = await prisma.volume.findMany({
    where: { journalId: journal.id },
    include: {
      issues: {
        where: { publishedAt: { not: null } },
        orderBy: { number: "desc" },
      },
    },
    orderBy: { number: "desc" },
  });

  // Also get issues without volumes
  const unassignedIssues = await prisma.issue.findMany({
    where: { journalId: journal.id, volumeId: null, publishedAt: { not: null } },
    orderBy: { number: "desc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-heading font-bold text-cardinal mb-8">Archives</h1>

      {volumes.length === 0 && unassignedIssues.length === 0 ? (
        <p className="text-gray-400">No published issues yet.</p>
      ) : (
        <div className="space-y-8">
          {volumes.map((vol) => (
            <div key={vol.id}>
              <h2 className="text-lg font-heading font-semibold text-cardinal mb-3">
                Volume {vol.number} ({vol.year}){vol.title ? `: ${vol.title}` : ""}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vol.issues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/${slug}/issue/${issue.id}`}
                    className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                  >
                    <p className="font-heading font-medium text-cardinal">
                      Issue {issue.number}{issue.title ? `: ${issue.title}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {issue.publishedAt ? new Date(issue.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : ""}
                      {" \u00b7 "}{issue.articleIds.length} articles
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {unassignedIssues.length > 0 && (
            <div>
              <h2 className="text-lg font-heading font-semibold text-cardinal mb-3">Issues</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unassignedIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/${slug}/issue/${issue.id}`}
                    className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                  >
                    <p className="font-heading font-medium text-cardinal">
                      Issue {issue.number}{issue.title ? `: ${issue.title}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {issue.publishedAt ? new Date(issue.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : ""}
                      {" \u00b7 "}{issue.articleIds.length} articles
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
