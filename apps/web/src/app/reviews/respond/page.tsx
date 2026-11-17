import { prisma } from "@stanford-press/database";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Review Invitation" };

export default async function ReviewRespondPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { token, action } = await searchParams;

  if (!token || !action) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cardinal">
        <div className="text-center text-white max-w-md">
          <div className="mb-4 flex justify-center"><AlertTriangle className="h-10 w-10" /></div>
          <h1 className="text-2xl font-heading font-bold">Invalid Link</h1>
          <p className="mt-2 text-white/70">This invitation link is invalid or incomplete.</p>
          <Link href="/" className="mt-6 inline-block rounded-md bg-white/10 border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white/20 transition-colors">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Validate token BEFORE attempting any redirect
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
      <div className="flex min-h-screen items-center justify-center bg-cardinal">
        <div className="text-center text-white max-w-md">
          <div className="mb-4 flex justify-center"><AlertTriangle className="h-10 w-10" /></div>
          <h1 className="text-2xl font-heading font-bold">Invitation Not Found</h1>
          <p className="mt-2 text-white/70">
            This invitation may have already been responded to or expired.
          </p>
          <Link href="/login" className="mt-6 inline-block rounded-md bg-white/10 border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white/20 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (assignment.status !== "Invited") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cardinal">
        <div className="text-center text-white max-w-md">
          <h1 className="text-2xl font-heading font-bold">Already Responded</h1>
          <p className="mt-2 text-white/70">
            This invitation has already been {assignment.status.toLowerCase()}.
          </p>
          <Link href="/login" className="mt-6 inline-block rounded-md bg-white/10 border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white/20 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Valid assignment + valid action → show confirmation with direct API links
  // The API route handles the actual state change and redirects appropriately
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const acceptUrl = `${baseUrl}/api/reviews/respond?token=${token}&action=accept`;
  const declineUrl = `${baseUrl}/api/reviews/respond?token=${token}&action=decline`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cardinal">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white">
        <h1 className="text-2xl font-heading font-bold">Review Invitation</h1>
        <p className="mt-4 text-white/70">
          You have been invited to review a manuscript for{" "}
          <strong className="text-white">{assignment.submission.journal.name}</strong>.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href={acceptUrl}
            className="rounded-md bg-digital-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-digital-green-dark transition-colors"
          >
            Accept
          </a>
          <a
            href={declineUrl}
            className="rounded-md bg-white/10 border border-white/20 px-6 py-2.5 text-sm font-semibold hover:bg-white/20 transition-colors"
          >
            Decline
          </a>
        </div>
      </div>
    </div>
  );
}
