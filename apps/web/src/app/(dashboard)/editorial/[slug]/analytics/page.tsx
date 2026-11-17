import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { StanfordBar } from "@/components/app-header";
import { EditorialNav } from "@/components/editorial-nav";

export const metadata = { title: "Editorial Analytics" };

type Params = { params: Promise<{ slug: string }> };

export default async function AnalyticsPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) redirect("/dashboard");

  const role = await prisma.roleAssignment.findFirst({
    where: {
      userId: session.user.id,
      journalId: journal.id,
      role: { in: ["EditorInChief", "ManagingEditor"] },
    },
  });
  if (!role) redirect("/dashboard");

  // === Compute analytics ===

  // Status counts
  const statusCounts = await prisma.submission.groupBy({
    by: ["status"],
    where: { journalId: journal.id, status: { not: "Draft" } },
    _count: true,
  });
  const countMap: Record<string, number> = {};
  statusCounts.forEach((s) => { countMap[s.status] = s._count; });

  const totalSubmissions = Object.values(countMap).reduce((a, b) => a + b, 0);
  const published = countMap["Published"] || 0;
  const rejected = countMap["Rejected"] || 0;
  const acceptanceRate = published + rejected > 0 ? Math.round((published / (published + rejected)) * 100) : 0;

  // Time-to-decision (avg days from submitted to first decision)
  const decisions = await prisma.editorialDecision.findMany({
    where: {
      submission: { journalId: journal.id },
      round: 1,
    },
    select: {
      createdAt: true,
      decision: true,
      submission: { select: { submittedAt: true } },
    },
  });

  let totalDaysToDecision = 0;
  let decisionCount = 0;
  for (const d of decisions) {
    if (d.submission.submittedAt) {
      const days = Math.floor((d.createdAt.getTime() - d.submission.submittedAt.getTime()) / (1000 * 60 * 60 * 24));
      totalDaysToDecision += days;
      decisionCount++;
    }
  }
  const avgDaysToDecision = decisionCount > 0 ? Math.round(totalDaysToDecision / decisionCount) : 0;

  // Decision breakdown
  const decisionBreakdown = await prisma.editorialDecision.groupBy({
    by: ["decision"],
    where: { submission: { journalId: journal.id } },
    _count: true,
  });
  const decisionMap: Record<string, number> = {};
  decisionBreakdown.forEach((d) => { decisionMap[d.decision] = d._count; });

  // Reviewer stats
  const reviewStats = await prisma.reviewAssignment.aggregate({
    where: { submission: { journalId: journal.id }, status: "Completed" },
    _count: true,
    _avg: { round: true },
  });

  const overdueCount = await prisma.reviewAssignment.count({
    where: {
      submission: { journalId: journal.id },
      status: { in: ["Accepted", "InProgress", "Overdue"] },
      deadline: { lt: new Date() },
    },
  });

  // Avg review turnaround
  const completedReviews = await prisma.reviewAssignment.findMany({
    where: { submission: { journalId: journal.id }, status: "Completed" },
    select: { invitedAt: true, completedAt: true },
  });

  let totalReviewDays = 0;
  let reviewCount = 0;
  for (const r of completedReviews) {
    if (r.completedAt) {
      const days = Math.floor((r.completedAt.getTime() - r.invitedAt.getTime()) / (1000 * 60 * 60 * 24));
      totalReviewDays += days;
      reviewCount++;
    }
  }
  const avgReviewDays = reviewCount > 0 ? Math.round(totalReviewDays / reviewCount) : 0;

  // Submissions by month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const recentSubmissions = await prisma.submission.findMany({
    where: {
      journalId: journal.id,
      submittedAt: { gte: twelveMonthsAgo },
      status: { not: "Draft" },
    },
    select: { submittedAt: true },
  });

  const monthlyData: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = 0;
  }
  for (const s of recentSubmissions) {
    if (s.submittedAt) {
      const key = `${s.submittedAt.getFullYear()}-${String(s.submittedAt.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[key] !== undefined) monthlyData[key]++;
    }
  }

  // Section breakdown
  const sectionCounts = await prisma.submission.groupBy({
    by: ["sectionId"],
    where: { journalId: journal.id, status: { not: "Draft" }, sectionId: { not: null } },
    _count: true,
  });

  const sections = await prisma.journalSection.findMany({
    where: { journalId: journal.id },
    select: { id: true, name: true },
  });
  const sectionNameMap = new Map(sections.map((s) => [s.id, s.name]));

  // Top reviewers
  const topReviewers = await prisma.reviewAssignment.groupBy({
    by: ["reviewerId"],
    where: { submission: { journalId: journal.id }, status: "Completed" },
    _count: true,
    orderBy: { _count: { reviewerId: "desc" } },
    take: 10,
  });

  const reviewerUsers = await prisma.user.findMany({
    where: { id: { in: topReviewers.map((r) => r.reviewerId) } },
    select: { id: true, name: true, qualityScore: true },
  });
  const reviewerNameMap = new Map(reviewerUsers.map((u) => [u.id, u]));

  const maxMonthly = Math.max(...Object.values(monthlyData), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <StanfordBar />
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/editorial/${slug}`} className="hover:text-cardinal transition-colors">{journal.name}</Link>
            <span>/</span>
            <span className="text-cardinal">Analytics</span>
          </div>
        </div>
      </header>
      <EditorialNav slug={slug} active="analytics" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 mb-8">
          {[
            { label: "Total Submissions", value: totalSubmissions, color: "text-cardinal" },
            { label: "Published", value: published, color: "text-green-600" },
            { label: "Acceptance Rate", value: `${acceptanceRate}%`, color: "text-cardinal" },
            { label: "Avg Days to Decision", value: avgDaysToDecision, color: avgDaysToDecision > 60 ? "text-red-600" : "text-cardinal" },
            { label: "Avg Review Days", value: avgReviewDays, color: "text-cardinal" },
            { label: "Overdue Reviews", value: overdueCount, color: overdueCount > 0 ? "text-red-600" : "text-cardinal" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <p className={`text-2xl font-heading font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Submissions over time (bar chart) */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Submissions (Last 12 Months)
            </h2>
            <div className="flex items-end gap-1 h-40">
              {Object.entries(monthlyData).map(([month, count]) => (
                <div key={month} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-digital-red rounded-t"
                    style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? "4px" : "0" }}
                    title={`${month}: ${count}`}
                  />
                  <span className="text-xs text-gray-400 mt-1 -rotate-45 origin-top-left">
                    {new Date(month + "-01").toLocaleDateString("en-US", { month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decision breakdown */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Decision Breakdown
            </h2>
            <div className="space-y-3">
              {[
                { key: "Accept", label: "Accept", color: "bg-green-500" },
                { key: "MinorRevision", label: "Minor Revision", color: "bg-yellow-500" },
                { key: "MajorRevision", label: "Major Revision", color: "bg-orange-500" },
                { key: "Reject", label: "Reject", color: "bg-red-500" },
                { key: "DeskReject", label: "Desk Reject", color: "bg-red-300" },
              ].map((d) => {
                const count = decisionMap[d.key] || 0;
                const totalDecisions = Object.values(decisionMap).reduce((a, b) => a + b, 0);
                const pct = totalDecisions > 0 ? Math.round((count / totalDecisions) * 100) : 0;
                return (
                  <div key={d.key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-28">{d.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className={`${d.color} rounded-full h-3`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section breakdown */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Submissions by Section
            </h2>
            {sectionCounts.length === 0 ? (
              <p className="text-sm text-gray-400">No section data</p>
            ) : (
              <div className="space-y-2">
                {sectionCounts.map((sc) => (
                  <div key={sc.sectionId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{sectionNameMap.get(sc.sectionId!) || "Unknown"}</span>
                    <span className="font-medium text-cardinal">{sc._count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top reviewers */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Top Reviewers
            </h2>
            {topReviewers.length === 0 ? (
              <p className="text-sm text-gray-400">No reviewer data</p>
            ) : (
              <div className="space-y-2">
                {topReviewers.map((tr, i) => {
                  const user = reviewerNameMap.get(tr.reviewerId);
                  return (
                    <div key={tr.reviewerId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                        <span className="text-gray-700">{user?.name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{tr._count} reviews</span>
                        {user?.qualityScore && (
                          <span className="text-xs text-digital-red">Q: {Math.round(user.qualityScore)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline funnel */}
          <div className="rounded-xl border bg-white p-6 lg:col-span-2">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Pipeline Status
            </h2>
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { label: "Submitted", key: "Submitted" },
                { label: "Desk Review", key: "DeskReview" },
                { label: "Under Review", key: "UnderReview" },
                { label: "Revision", key: "RevisionRequested" },
                { label: "Accepted", key: "Accepted" },
                { label: "Copyediting", key: "InCopyediting" },
                { label: "Production", key: "InProduction" },
                { label: "Published", key: "Published" },
              ].map((stage, i) => (
                <div key={stage.key} className="flex items-center">
                  <div className="rounded-lg border bg-gray-50 px-4 py-3 text-center min-w-[100px]">
                    <p className="text-lg font-heading font-bold text-cardinal">
                      {countMap[stage.key] || 0}
                    </p>
                    <p className="text-xs text-gray-500">{stage.label}</p>
                  </div>
                  {i < 7 && <span className="text-gray-300 mx-1">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
