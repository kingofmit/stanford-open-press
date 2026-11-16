import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { TemplateEditor } from "./template-editor";

export const metadata = { title: "Email Templates" };

type Params = { params: Promise<{ slug: string }> };

export default async function TemplatesPage({ params }: Params) {
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

  const templates = await prisma.emailTemplate.findMany({
    where: { journalId: journal.id },
    orderBy: { eventKey: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link href={`/editorial/${slug}`} className="text-sm text-gray-500 hover:text-navy-950 transition-colors">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-lg font-heading font-bold text-navy-950 mt-1">Email Templates</h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <TemplateEditor journalId={journal.id} templates={templates} />
      </main>
    </div>
  );
}
