import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Submission Details" };

type Params = { params: Promise<{ submissionId: string }> };

export default async function SubmissionDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { submissionId } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      journal: { select: { id: true, name: true, slug: true } },
      section: { select: { name: true } },
      authors: { orderBy: { sortOrder: "asc" } },
      files: { orderBy: { uploadedAt: "desc" } },
      decisions: {
        include: { editor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!submission) redirect("/dashboard");
  if (submission.submitterId !== session.user.id) redirect("/dashboard");

  function formatDate(date: Date | null): string {
    if (!date) return "\u2014";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-navy-950 transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-heading font-bold text-navy-950">{submission.title}</h1>
            <StatusBadge status={submission.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {submission.journal.name}
            {submission.section && ` \u00b7 ${submission.section.name}`}
            {" \u00b7 "}Submitted {formatDate(submission.submittedAt)}
          </p>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Timeline
          </h2>
          <div className="space-y-3">
            {submission.statusHistory.map((change, i) => (
              <div key={change.id} className="flex items-start gap-3">
                <div className={`mt-1.5 h-2 w-2 rounded-full ${i === 0 ? "bg-brand-500" : "bg-gray-300"}`} />
                <div>
                  <p className="text-sm text-gray-900">
                    Status changed to <span className="font-medium">{change.toStatus}</span>
                  </p>
                  {change.comment && (
                    <p className="text-xs text-gray-500 mt-0.5">{change.comment}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(change.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Decision */}
        {submission.decisions.length > 0 && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Latest Decision
            </h2>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={submission.decisions[0].decision} />
                <span className="text-xs text-gray-400">
                  by {submission.decisions[0].editor.name} on {formatDate(submission.decisions[0].createdAt)}
                </span>
              </div>
              {submission.decisions[0].commentsToAuthor && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">
                  {submission.decisions[0].commentsToAuthor}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Authors */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Authors
          </h2>
          <div className="space-y-2">
            {submission.authors.map((author) => (
              <div key={author.id} className="text-sm">
                <span className="font-medium text-gray-900">
                  {author.givenName} {author.familyName}
                </span>
                {author.corresponding && <span className="text-brand-500 ml-1">*</span>}
                {author.affiliation && <span className="text-gray-400"> &mdash; {author.affiliation}</span>}
                {author.orcid && <span className="text-gray-400"> &middot; ORCID: {author.orcid}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Files */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Files ({submission.files.length})
          </h2>
          <div className="space-y-2">
            {submission.files.map((file) => (
              <div key={file.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                <span className="text-gray-900">{file.filename}</span>
                <span className="text-xs text-gray-400">
                  {file.category} &middot; v{file.version}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Abstract */}
        {submission.abstract && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Abstract
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {submission.abstract}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
