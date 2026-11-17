import { prisma } from "@stanford-press/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal) return {};
  return {
    title: { default: journal.name, template: `%s | ${journal.name}` },
    description: journal.description || `${journal.name} — Published on Stanford Open Press`,
  };
}

export default async function JournalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journal = await prisma.journal.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      abbreviation: true,
      issn: true,
      eissn: true,
      description: true,
      primaryColor: true,
      accentColor: true,
    },
  });

  if (!journal) notFound();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b" style={{ backgroundColor: journal.primaryColor }}>
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Link href={`/${journal.slug}`} className="text-xl font-heading font-bold text-white hover:text-white/90">
            {journal.name}
          </Link>
          {journal.abbreviation && (
            <span className="ml-2 text-sm text-white/50">({journal.abbreviation})</span>
          )}
          <nav className="mt-3 flex gap-6 text-sm">
            <Link href={`/${journal.slug}`} className="text-white/70 hover:text-white transition-colors">
              Current Issue
            </Link>
            <Link href={`/${journal.slug}/issues`} className="text-white/70 hover:text-white transition-colors">
              Archives
            </Link>
            <Link href={`/${journal.slug}/search`} className="text-white/70 hover:text-white transition-colors">
              Search
            </Link>
            <Link href={`/${journal.slug}/about`} className="text-white/70 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/submissions/new" className="text-white/70 hover:text-white transition-colors">
              Submit
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t py-8 mt-16">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-gray-400">
          <p>{journal.name}</p>
          {journal.issn && <p className="mt-1">ISSN: {journal.issn}{journal.eissn ? ` (Online: ${journal.eissn})` : ""}</p>}
          <p className="mt-1">Published on <Link href="/" className="text-brand-500 hover:text-brand-700">Stanford Open Press</Link></p>
        </div>
      </footer>
    </div>
  );
}
