import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { JournalSettingsForm } from "./settings-form";
import { StanfordBar } from "@/components/app-header";
import { EditorialNav } from "@/components/editorial-nav";

export const metadata = { title: "Journal Settings" };

type Params = { params: Promise<{ slug: string }> };

export default async function SettingsPage({ params }: Params) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <StanfordBar />
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link href={`/editorial/${slug}`} className="text-sm text-gray-500 hover:text-cardinal transition-colors">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-lg font-heading font-bold text-cardinal mt-1">Journal Settings</h1>
        </div>
      </header>
      <EditorialNav slug={slug} active="settings" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <JournalSettingsForm journal={journal} slug={slug} />
      </main>
    </div>
  );
}
