import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { ReviewerPoolClient } from "./reviewer-pool-client";
import { StanfordBar } from "@/components/app-header";
import { EditorialNav } from "@/components/editorial-nav";

export const metadata = { title: "Reviewer Pool" };

type Params = { params: Promise<{ slug: string }> };

export default async function ReviewerPoolPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) redirect("/dashboard");

  const role = await prisma.roleAssignment.findFirst({
    where: {
      userId: session.user.id,
      journalId: journal.id,
      role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor"] },
    },
  });
  if (!role) redirect("/dashboard");

  // Get all reviewers for this journal
  const reviewerRoles = await prisma.roleAssignment.findMany({
    where: { journalId: journal.id, role: "Reviewer" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          affiliation: true,
          expertiseAreas: true,
          totalCompleted: true,
          totalDeclined: true,
          avgResponseDays: true,
          qualityScore: true,
          reviewerAvailable: true,
          lastReviewDate: true,
        },
      },
    },
  });

  const reviewers = reviewerRoles.map((r) => r.user);

  // Get active assignment counts
  const activeCounts = await prisma.reviewAssignment.groupBy({
    by: ["reviewerId"],
    where: {
      submission: { journalId: journal.id },
      status: { in: ["Invited", "Accepted", "InProgress"] },
    },
    _count: true,
  });
  const activeMap = new Map(activeCounts.map((c) => [c.reviewerId, c._count]));

  // Stats
  const totalReviewers = reviewers.length;
  const availableCount = reviewers.filter((r) => r.reviewerAvailable).length;
  const avgCompleted = totalReviewers > 0
    ? Math.round(reviewers.reduce((s, r) => s + r.totalCompleted, 0) / totalReviewers)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <StanfordBar />
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/editorial/${slug}`} className="hover:text-cardinal">{journal.name}</Link>
            <span>/</span>
            <span className="text-cardinal">Reviewer Pool</span>
          </div>
        </div>
      </header>
      <EditorialNav slug={slug} active="reviewers" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Total Reviewers</p>
            <p className="text-2xl font-heading font-bold text-cardinal">{totalReviewers}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-2xl font-heading font-bold text-green-600">{availableCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Avg Reviews/Reviewer</p>
            <p className="text-2xl font-heading font-bold text-cardinal">{avgCompleted}</p>
          </div>
        </div>

        <ReviewerPoolClient
          reviewers={reviewers.map((r) => ({
            ...r,
            activeAssignments: activeMap.get(r.id) || 0,
            lastReviewDate: r.lastReviewDate?.toISOString() || null,
          }))}
          journalId={journal.id}
          slug={slug}
        />
      </main>
    </div>
  );
}
