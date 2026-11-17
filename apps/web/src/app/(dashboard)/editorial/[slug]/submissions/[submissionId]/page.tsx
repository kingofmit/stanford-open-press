import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { DecisionForm } from "./decision-form";
import { InviteButton } from "./invite-button";
import { StanfordBar } from "@/components/app-header";

export const metadata = { title: "Submission Review" };

type Params = { params: Promise<{ slug: string; submissionId: string }> };

export default async function EditorialSubmissionPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug, submissionId } = await params;

  const journal = await prisma.journal.findUnique({ where: { slug } });
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

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      section: { select: { name: true } },
      authors: { orderBy: { sortOrder: "asc" } },
      files: { orderBy: [{ version: "desc" }, { uploadedAt: "desc" }] },
      reviews: {
        include: {
          reviewer: { select: { id: true, name: true, email: true, affiliation: true } },
          reviewScores: {
            include: { criterion: { select: { label: true, weight: true, maxScore: true } } },
          },
        },
        orderBy: [{ round: "asc" }, { invitedAt: "asc" }],
      },
      decisions: {
        include: { editor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!submission || submission.journalId !== journal.id) redirect(`/editorial/${slug}`);

  const completedReviews = submission.reviews.filter((r) => r.status === "Completed");
  const pendingReviews = submission.reviews.filter((r) => ["Invited", "Accepted", "InProgress"].includes(r.status));
  const canDecide = ["UnderReview", "RevisionSubmitted"].includes(submission.status) && completedReviews.length >= 1;

  // Get available reviewers for invitation
  const reviewers = await prisma.user.findMany({
    where: {
      roles: {
        some: { journalId: journal.id, role: "Reviewer" },
      },
      id: { notIn: submission.reviews.map((r) => r.reviewerId) },
    },
    select: { id: true, name: true, email: true, affiliation: true, expertiseAreas: true, totalCompleted: true, qualityScore: true },
    take: 20,
  });

  // Get review form
  const reviewForm = await prisma.reviewForm.findFirst({
    where: { journalId: journal.id, active: true },
    select: { id: true, name: true },
  });

  function formatDate(date: Date | null): string {
    if (!date) return "\u2014";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StanfordBar />
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/editorial/${slug}`} className="hover:text-cardinal transition-colors">
              {journal.name}
            </Link>
            <span>/</span>
            <span className="text-cardinal">Submission</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-heading font-bold text-cardinal">{submission.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {submission.authors.map((a) => `${a.givenName} ${a.familyName}`).join(", ")}
              {submission.section && ` \u00b7 ${submission.section.name}`}
              {` \u00b7 Submitted ${formatDate(submission.submittedAt)}`}
            </p>
          </div>
          <StatusBadge status={submission.status} />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Abstract */}
            {submission.abstract && (
              <div className="rounded-xl border bg-white p-6">
                <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">Abstract</h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{submission.abstract}</p>
              </div>
            )}

            {/* Reviews */}
            <div className="rounded-xl border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide">
                  Reviews ({completedReviews.length} completed, {pendingReviews.length} pending)
                </h2>
              </div>

              {completedReviews.length === 0 && pendingReviews.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No reviewers assigned yet</p>
              ) : (
                <div className="space-y-6">
                  {submission.reviews.map((review, idx) => (
                    <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-sm font-medium text-cardinal">
                            {review.reviewer.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">{review.reviewer.affiliation}</span>
                          <span className="text-xs text-gray-400 ml-2">Round {review.round}</span>
                        </div>
                        <StatusBadge status={review.status} />
                      </div>

                      {review.status === "Completed" && (
                        <>
                          {/* Scores */}
                          {review.reviewScores.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {review.reviewScores.map((s) => (
                                <div key={s.id} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                                  <span className="text-gray-500">{s.criterion.label}:</span>{" "}
                                  <span className="font-medium text-cardinal">{s.score}/{s.criterion.maxScore}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Recommendation */}
                          {review.recommendation && (
                            <div className="mb-3">
                              <span className="text-xs text-gray-400">Recommendation: </span>
                              <StatusBadge status={review.recommendation} />
                            </div>
                          )}

                          {/* Comments */}
                          {review.commentsToAuthor && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">Comments to Author:</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{review.commentsToAuthor}</p>
                            </div>
                          )}
                          {review.commentsToEditor && (
                            <div>
                              <p className="text-xs font-medium text-orange-600 mb-1">Confidential to Editor:</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-orange-50 rounded-lg p-3">{review.commentsToEditor}</p>
                            </div>
                          )}
                        </>
                      )}

                      {review.status === "Invited" && (
                        <p className="text-xs text-gray-400">Awaiting response &middot; Deadline: {formatDate(review.deadline)}</p>
                      )}
                      {review.status === "Accepted" && (
                        <p className="text-xs text-gray-400">Review in progress &middot; Deadline: {formatDate(review.deadline)}</p>
                      )}
                      {review.status === "Declined" && review.declineReason && (
                        <p className="text-xs text-gray-400">Reason: {review.declineReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decision form */}
            {canDecide && (
              <DecisionForm
                submissionId={submission.id}
                slug={slug}
                currentStatus={submission.status}
                reviewSummary={completedReviews.map((r) => r.recommendation).filter(Boolean) as string[]}
              />
            )}

            {/* Previous decisions */}
            {submission.decisions.length > 0 && (
              <div className="rounded-xl border bg-white p-6">
                <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">Decision History</h2>
                <div className="space-y-4">
                  {submission.decisions.map((d) => (
                    <div key={d.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={d.decision} />
                        <span className="text-xs text-gray-400">
                          Round {d.round} &middot; {d.editor.name} &middot; {formatDate(d.createdAt)}
                        </span>
                      </div>
                      {d.commentsToAuthor && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{d.commentsToAuthor}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Files */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-heading font-semibold text-cardinal mb-3">Files</h3>
              <div className="space-y-1">
                {submission.files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/files/${f.storagePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm text-digital-red hover:text-cardinal-dark py-1"
                  >
                    <span className="truncate">{f.filename}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">v{f.version}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Invite reviewer */}
            {["Submitted", "DeskReview", "UnderReview", "RevisionSubmitted"].includes(submission.status) && (
              <div className="rounded-xl border bg-white p-4">
                <h3 className="text-sm font-heading font-semibold text-cardinal mb-3">Invite Reviewer</h3>
                {reviewers.length === 0 ? (
                  <p className="text-xs text-gray-400">No available reviewers</p>
                ) : (
                  <div className="space-y-2">
                    {reviewers.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.name}</p>
                          <p className="text-xs text-gray-400">
                            {r.affiliation || r.email}
                            {r.totalCompleted > 0 && ` \u00b7 ${r.totalCompleted} reviews`}
                          </p>
                        </div>
                        <InviteButton submissionId={submission.id} reviewerId={r.id} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-heading font-semibold text-cardinal mb-3">Timeline</h3>
              <div className="space-y-2">
                {submission.statusHistory.map((change) => (
                  <div key={change.id} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700">{change.toStatus}</p>
                      <p className="text-xs text-gray-400">{formatDate(change.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
