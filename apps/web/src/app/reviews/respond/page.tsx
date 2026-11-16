import { prisma } from "@stanford-press/database";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Review Invitation" };

export default async function ReviewRespondPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { token, action } = await searchParams;

  if (!token || !action) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <div className="text-center text-white">
          <h1 className="text-2xl font-heading font-bold">Invalid Link</h1>
          <p className="mt-2 text-white/50">This invitation link is invalid or incomplete.</p>
        </div>
      </div>
    );
  }

  const assignment = await prisma.reviewAssignment.findUnique({
    where: { invitationToken: token },
    include: {
      submission: {
        select: {
          title: true,
          journal: { select: { name: true } },
        },
      },
      reviewer: { select: { name: true } },
    },
  });

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <div className="text-center text-white max-w-md">
          <h1 className="text-2xl font-heading font-bold">Invitation Not Found</h1>
          <p className="mt-2 text-white/50">
            This invitation may have already been responded to or expired.
          </p>
          <Link href="/login" className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium hover:bg-brand-600 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // If action is in URL, process via API redirect
  // The actual processing happens in /api/reviews/respond
  // This page is a fallback / confirmation page
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (action === "accept" || action === "decline") {
    redirect(`/api/reviews/respond?token=${token}&action=${action}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white">
        <h1 className="text-2xl font-heading font-bold">Review Invitation</h1>
        <p className="mt-4 text-white/50">
          You have been invited to review a manuscript for{" "}
          <strong className="text-white">{assignment.submission.journal.name}</strong>.
        </p>
        <div className="mt-6 flex gap-4 justify-center">
          <Link
            href={`/api/reviews/respond?token=${token}&action=accept`}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Accept
          </Link>
          <Link
            href={`/api/reviews/respond?token=${token}&action=decline`}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Decline
          </Link>
        </div>
      </div>
    </div>
  );
}
