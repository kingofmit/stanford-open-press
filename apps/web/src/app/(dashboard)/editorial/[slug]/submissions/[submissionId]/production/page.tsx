import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ProductionClient } from "./production-client";

export const metadata = { title: "Production Pipeline" };

type Params = { params: Promise<{ slug: string; submissionId: string }> };

export default async function ProductionPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug, submissionId } = await params;

  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) redirect("/dashboard");

  const role = await prisma.roleAssignment.findFirst({
    where: {
      userId: session.user.id,
      journalId: journal.id,
      role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor", "ProductionEditor"] },
    },
  });
  if (!role) redirect("/dashboard");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, title: true, status: true, journalId: true },
  });
  if (!submission || submission.journalId !== journal.id) redirect(`/editorial/${slug}`);

  const tasks = await prisma.productionTask.findMany({
    where: { submissionId },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: { sortOrder: "asc" },
  });

  const copyeditRecords = await prisma.copyeditRecord.findMany({
    where: { submissionId },
    include: { copyeditor: { select: { id: true, name: true } } },
    orderBy: { assignedAt: "desc" },
  });

  // Get available staff for assignment
  const staff = await prisma.roleAssignment.findMany({
    where: {
      journalId: journal.id,
      role: { in: ["Copyeditor", "ProductionEditor", "EditorInChief", "ManagingEditor"] },
    },
    include: { user: { select: { id: true, name: true } } },
  });
  const uniqueStaff = [...new Map(staff.map((s) => [s.user.id, s.user])).values()];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link href={`/editorial/${slug}/submissions/${submissionId}`} className="text-sm text-gray-500 hover:text-navy-950">
            &larr; Back to Submission
          </Link>
          <h1 className="text-lg font-heading font-bold text-navy-950 mt-1">Production Pipeline</h1>
          <p className="text-sm text-gray-500">{submission.title}</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <ProductionClient
          submissionId={submissionId}
          slug={slug}
          tasks={tasks}
          copyeditRecords={copyeditRecords}
          staff={uniqueStaff}
          submissionStatus={submission.status}
        />
      </main>
    </div>
  );
}
