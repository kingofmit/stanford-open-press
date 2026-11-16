import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        include: {
          journal: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  const submissions = await prisma.submission.findMany({
    where: { submitterId: session.user.id },
    include: {
      journal: { select: { id: true, name: true, slug: true } },
      authors: { orderBy: { sortOrder: "asc" }, take: 3 },
      _count: { select: { reviews: true, files: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const editorJournals = user?.roles
    .filter((r) =>
      ["EditorInChief", "ManagingEditor", "SectionEditor", "GuestEditor"].includes(r.role)
    )
    .map((r) => r.journal) || [];

  const actionRequired = submissions.filter((s) =>
    s.status === "RevisionRequested" || s.status === "Draft"
  );

  const active = submissions.filter((s) =>
    !["Published", "Rejected", "Withdrawn", "Draft"].includes(s.status)
  );

  const completed = submissions.filter((s) =>
    ["Published", "Rejected", "Withdrawn"].includes(s.status)
  );

  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-heading font-bold text-navy-950">
            Stanford Open Press
          </Link>
          <div className="flex items-center gap-4">
            {editorJournals.length > 0 && (
              <Link
                href={`/editorial/${editorJournals[0].slug}`}
                className="text-sm text-gray-500 hover:text-navy-950 transition-colors"
              >
                Editorial Dashboard
              </Link>
            )}
            <span className="text-sm text-gray-400">{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-navy-950">
              My Submissions
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {submissions.length} total submissions
            </p>
          </div>
          <Link
            href="/submissions/new"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            New Submission
          </Link>
        </div>

        {/* Action Required */}
        {actionRequired.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-heading font-semibold text-orange-700 uppercase tracking-wide mb-3">
              Action Required ({actionRequired.length})
            </h2>
            <div className="space-y-3">
              {actionRequired.map((sub) => (
                <Link
                  key={sub.id}
                  href={sub.status === "Draft" ? `/submissions/new?draft=${sub.id}` : `/submissions/${sub.id}`}
                  className="flex items-center justify-between rounded-xl border-2 border-orange-200 bg-orange-50 p-4 hover:bg-orange-100 transition-colors"
                >
                  <div>
                    <p className="font-heading font-semibold text-navy-950">{sub.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {sub.journal.name} &middot; Updated {timeAgo(sub.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sub.status} />
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Active Submissions */}
        {active.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">
              In Progress ({active.length})
            </h2>
            <div className="space-y-3">
              {active.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/submissions/${sub.id}`}
                  className="flex items-center justify-between rounded-xl border bg-white p-4 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-heading font-medium text-navy-950">{sub.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sub.journal.name} &middot; {sub.authors.map((a) => `${a.givenName} ${a.familyName}`).join(", ")}
                      {sub._count.reviews > 0 && ` \u00b7 ${sub._count.reviews} reviews`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sub.status} />
                    <span className="text-gray-300">&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Completed ({completed.length})
            </h2>
            <div className="space-y-3">
              {completed.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/submissions/${sub.id}`}
                  className="flex items-center justify-between rounded-xl border bg-white p-4 hover:shadow-md transition-shadow opacity-75"
                >
                  <div>
                    <p className="font-heading font-medium text-navy-950">{sub.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sub.journal.name}
                      {sub.doi && ` \u00b7 DOI: ${sub.doi}`}
                    </p>
                  </div>
                  <StatusBadge status={sub.status} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {submissions.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">&#128221;</div>
            <h3 className="text-lg font-heading font-semibold text-gray-900">No submissions yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Start by submitting your first manuscript.
            </p>
            <Link
              href="/submissions/new"
              className="mt-4 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Submit a Manuscript
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
