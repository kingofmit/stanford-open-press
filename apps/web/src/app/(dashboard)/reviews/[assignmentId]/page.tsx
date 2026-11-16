import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import { ReviewFormClient } from "./review-form";

export const metadata = { title: "Submit Review" };

type Params = { params: Promise<{ assignmentId: string }> };

export default async function ReviewPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { assignmentId } = await params;

  const assignment = await prisma.reviewAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      submission: {
        select: {
          id: true,
          title: true,
          abstract: true,
          keywords: true,
          journalId: true,
          files: {
            where: { category: { in: ["Manuscript", "Supplementary", "Figure", "Table"] } },
            select: { id: true, filename: true, category: true, storagePath: true },
            orderBy: { uploadedAt: "desc" },
          },
          authors: {
            orderBy: { sortOrder: "asc" },
            select: { givenName: true, familyName: true, affiliation: true },
          },
          journal: { select: { name: true } },
        },
      },
      form: {
        include: {
          criteria: { orderBy: { sortOrder: "asc" } },
        },
      },
      reviewScores: true,
    },
  });

  if (!assignment) redirect("/dashboard");
  if (assignment.reviewerId !== session.user.id) redirect("/dashboard");
  if (!["Accepted", "InProgress"].includes(assignment.status)) redirect("/dashboard");

  // Strip authors for double-blind
  const authors = assignment.reviewType === "DoubleBlind"
    ? []
    : assignment.submission.authors;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <p className="text-sm text-gray-500">{assignment.submission.journal.name}</p>
          <h1 className="text-lg font-heading font-bold text-navy-950 mt-0.5">
            Review Submission
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Manuscript info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border bg-white p-6">
              <h2 className="font-heading font-semibold text-navy-950 mb-3">
                {assignment.reviewType === "DoubleBlind" ? "[Title hidden for double-blind review]" : assignment.submission.title}
              </h2>
              {authors.length > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  {authors.map((a) => `${a.givenName} ${a.familyName}`).join(", ")}
                </p>
              )}
              {assignment.submission.abstract && assignment.reviewType !== "DoubleBlind" && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-400 uppercase mb-1">Abstract</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{assignment.submission.abstract}</p>
                </div>
              )}
              {assignment.submission.keywords.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-400 uppercase mb-1">Keywords</h3>
                  <div className="flex flex-wrap gap-1">
                    {assignment.submission.keywords.map((k, i) => (
                      <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Files</h3>
                <div className="space-y-1">
                  {assignment.submission.files.map((f) => (
                    <a
                      key={f.id}
                      href={`/api/files/${f.storagePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-700"
                    >
                      <span>&#128196;</span> {f.filename}
                      <span className="text-xs text-gray-400">({f.category})</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                Deadline: {assignment.deadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>

          {/* Review form */}
          <div className="lg:col-span-3">
            <ReviewFormClient
              assignmentId={assignment.id}
              criteria={assignment.form?.criteria || []}
              existingScores={assignment.reviewScores}
              existingComments={assignment.commentsToAuthor || ""}
              existingEditorComments={assignment.commentsToEditor || ""}
              existingRecommendation={assignment.recommendation || ""}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
