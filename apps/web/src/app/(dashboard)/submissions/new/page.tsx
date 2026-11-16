import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import { SubmissionWizard } from "./wizard";

export const metadata = { title: "New Submission" };

export default async function NewSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ journalId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { journalId } = await searchParams;

  // Get journals the user can submit to
  const journals = await prisma.journal.findMany({
    include: {
      sections: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <h1 className="text-lg font-heading font-bold text-navy-950">
            New Submission
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <SubmissionWizard
          journals={journals}
          defaultJournalId={journalId}
          userName={session.user.name || ""}
          userEmail={session.user.email || ""}
        />
      </main>
    </div>
  );
}
