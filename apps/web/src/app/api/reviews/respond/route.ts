import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { handleError } from "@/lib/api";

const respondSchema = z.object({
  token: z.string().min(1),
  action: z.enum(["accept", "decline"]),
  declineReason: z.string().max(1000).optional(),
});

// GET /api/reviews/respond?token=xxx&action=accept|decline
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token || !action || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const assignment = await prisma.reviewAssignment.findUnique({
      where: { invitationToken: token },
      include: {
        submission: { select: { title: true, journalId: true } },
        reviewer: { select: { name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Invitation not found or already responded" }, { status: 404 });
    }

    if (assignment.status !== "Invited") {
      return NextResponse.json({
        error: "Already responded",
        status: assignment.status,
      }, { status: 400 });
    }

    if (action === "decline") {
      await prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "Declined",
          respondedAt: new Date(),
          invitationToken: null, // Invalidate token
        },
      });

      // Redirect to a thank-you page
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(`${baseUrl}/reviews/declined`);
    }

    if (action === "accept") {
      await prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "Accepted",
          respondedAt: new Date(),
          invitationToken: null,
        },
      });

      // Redirect to login → then to the review form
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${baseUrl}/login?callbackUrl=${encodeURIComponent(`/reviews/${assignment.id}`)}`
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/reviews/respond — with decline reason
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = respondSchema.parse(body);

    const assignment = await prisma.reviewAssignment.findUnique({
      where: { invitationToken: data.token },
    });

    if (!assignment || assignment.status !== "Invited") {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    if (data.action === "decline") {
      await prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "Declined",
          respondedAt: new Date(),
          declineReason: data.declineReason,
          invitationToken: null,
        },
      });
      return NextResponse.json({ success: true, message: "Invitation declined" });
    }

    if (data.action === "accept") {
      await prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "Accepted",
          respondedAt: new Date(),
          invitationToken: null,
        },
      });
      return NextResponse.json({ success: true, assignmentId: assignment.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
