import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { NotificationBell } from "@/components/notification-bell";

export const metadata = { title: "Editorial Dashboard" };

type Params = { params: Promise<{ slug: string }> };

export default async function EditorialDashboardPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;

  const journal = await prisma.journal.findUnique({
    where: { slug },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });

  if (!journal) redirect("/dashboard");

  // Verify editor access
  const role = await prisma.roleAssignment.findFirst({
    where: {
      userId: session.user.id,
      journalId: journal.id,
      role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor", "GuestEditor"] },
    },
  });

  if (!role) redirect("/dashboard");

  // Get submission counts by status
  const statusCounts = await prisma.submission.groupBy({
    by: ["status"],
    where: { journalId: journal.id, status: { not: "Draft" } },
    _count: true,
  });

  const countMap: Record<string, number> = {};
  statusCounts.forEach((s) => { countMap[s.status] = s._count; });

  // Submissions needing attention
  const needsAction = await prisma.submission.findMany({
    where: {
      journalId: journal.id,
      status: { in: ["Submitted", "DeskReview", "RevisionSubmitted"] },
    },
    include: {
      authors: { orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { reviews: true } },
    },
    orderBy: { submittedAt: "asc" },
    take: 20,
  });

  // Overdue reviews
  const overdueReviews = await prisma.reviewAssignment.findMany({
    where: {
      submission: { journalId: journal.id },
      status: { in: ["Accepted", "InProgress"] },
      deadline: { lt: new Date() },
    },
    include: {
      reviewer: { select: { name: true, email: true } },
      submission: { select: { id: true, title: true } },
    },
    take: 10,
  });

  // Pending decisions (all reviews completed)
  const underReview = await prisma.submission.findMany({
    where: {
      journalId: journal.id,
      status: "UnderReview",
    },
    include: {
      authors: { orderBy: { sortOrder: "asc" }, take: 1 },
      reviews: {
        select: { status: true, recommendation: true },
      },
    },
  });

  const pendingDecision = underReview.filter((s) => {
    const completed = s.reviews.filter((r) => r.status === "Completed");
    return completed.length >= 2;
  });

  // Stats
  const totalActive = Object.entries(countMap)
    .filter(([k]) => !["Published", "Rejected", "Withdrawn"].includes(k))
    .reduce((sum, [, v]) => sum + v, 0);

  const published = countMap["Published"] || 0;
  const rejected = countMap["Rejected"] || 0;
  const acceptanceRate = published + rejected > 0
    ? Math.round((published / (published + rejected)) * 100)
    : 0;

  function daysAgo(date: Date | null): string {
    if (!date) return "\u2014";
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-lg font-heading font-bold text-navy-950">
              Stanford Open Press
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-600">{journal.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/profile" className="text-sm text-gray-400 hover:text-navy-950 transition-colors">
              {session.user.name}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 font-medium">Active</p>
            <p className="text-2xl font-heading font-bold text-navy-950">{totalActive}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 font-medium">Needs Action</p>
            <p className="text-2xl font-heading font-bold text-orange-600">{needsAction.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 font-medium">Overdue Reviews</p>
            <p className="text-2xl font-heading font-bold text-red-600">{overdueReviews.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 font-medium">Acceptance Rate</p>
            <p className="text-2xl font-heading font-bold text-navy-950">{acceptanceRate}%</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* New submissions */}
            <div>
              <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">
                New Submissions ({(countMap["Submitted"] || 0) + (countMap["DeskReview"] || 0)})
              </h2>
              {needsAction.filter((s) => s.status === "Submitted" || s.status === "DeskReview").length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No new submissions</p>
              ) : (
                <div className="space-y-2">
                  {needsAction
                    .filter((s) => s.status === "Submitted" || s.status === "DeskReview")
                    .map((sub) => {
                      const firstAuthor = sub.authors[0];
                      return (
                        <Link
                          key={sub.id}
                          href={`/editorial/${slug}/submissions/${sub.id}`}
                          className="flex items-center justify-between rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-heading font-medium text-navy-950 truncate">{sub.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {firstAuthor ? `${firstAuthor.givenName} ${firstAuthor.familyName}` : "\u2014"}
                              {" \u00b7 "}Submitted {daysAgo(sub.submittedAt)}
                            </p>
                          </div>
                          <StatusBadge status={sub.status} />
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Pending decisions */}
            {pendingDecision.length > 0 && (
              <div>
                <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Ready for Decision ({pendingDecision.length})
                </h2>
                <div className="space-y-2">
                  {pendingDecision.map((sub) => {
                    const completed = sub.reviews.filter((r) => r.status === "Completed");
                    const recommendations = completed.map((r) => r.recommendation).filter(Boolean);
                    return (
                      <Link
                        key={sub.id}
                        href={`/editorial/${slug}/submissions/${sub.id}`}
                        className="flex items-center justify-between rounded-lg border-2 border-purple-200 bg-purple-50 p-4 hover:bg-purple-100 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-heading font-medium text-navy-950 truncate">{sub.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {completed.length} reviews: {recommendations.join(", ")}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-purple-700 bg-purple-100 rounded-full px-2 py-0.5">
                          Decision needed
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Revisions received */}
            {needsAction.filter((s) => s.status === "RevisionSubmitted").length > 0 && (
              <div>
                <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Revisions Received
                </h2>
                <div className="space-y-2">
                  {needsAction
                    .filter((s) => s.status === "RevisionSubmitted")
                    .map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/editorial/${slug}/submissions/${sub.id}`}
                        className="flex items-center justify-between rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
                      >
                        <div>
                          <p className="font-heading font-medium text-navy-950 truncate">{sub.title}</p>
                        </div>
                        <StatusBadge status={sub.status} />
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Overdue reviews */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-heading font-semibold text-red-600 mb-3">
                Overdue Reviews ({overdueReviews.length})
              </h3>
              {overdueReviews.length === 0 ? (
                <p className="text-xs text-gray-400">No overdue reviews</p>
              ) : (
                <div className="space-y-3">
                  {overdueReviews.map((r) => {
                    const daysOverdue = Math.floor((Date.now() - r.deadline.getTime()) / 86400000);
                    return (
                      <div key={r.id} className="text-sm">
                        <p className="font-medium text-gray-900 truncate">{r.submission.title}</p>
                        <p className="text-xs text-gray-500">
                          {r.reviewer.name} &middot;{" "}
                          <span className="text-red-500">{daysOverdue}d overdue</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pipeline overview */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-heading font-semibold text-navy-950 mb-3">Pipeline</h3>
              <div className="space-y-2">
                {[
                  ["Submitted", countMap["Submitted"] || 0],
                  ["Under Review", countMap["UnderReview"] || 0],
                  ["Revision", (countMap["RevisionRequested"] || 0) + (countMap["RevisionSubmitted"] || 0)],
                  ["Accepted", countMap["Accepted"] || 0],
                  ["In Production", (countMap["InCopyediting"] || 0) + (countMap["InProduction"] || 0)],
                  ["Published", published],
                  ["Rejected", rejected],
                ].map(([label, count]) => (
                  <div key={label as string} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-navy-950">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-heading font-semibold text-navy-950 mb-3">Quick Links</h3>
              <div className="space-y-1">
                <Link href={`/editorial/${slug}/settings`} className="block text-sm text-brand-500 hover:text-brand-700">
                  Journal Settings
                </Link>
                <Link href={`/editorial/${slug}/reviewers`} className="block text-sm text-brand-500 hover:text-brand-700">
                  Reviewer Pool
                </Link>
                <Link href={`/editorial/${slug}/templates`} className="block text-sm text-brand-500 hover:text-brand-700">
                  Email Templates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
