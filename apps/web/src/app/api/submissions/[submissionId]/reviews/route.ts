import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalEditor } from "@/lib/authorization";
import { sendEmail, escapeHtml } from "@/lib/email";
import { randomBytes } from "crypto";

type Params = { params: Promise<{ submissionId: string }> };

const inviteSchema = z.object({
  reviewerId: z.string().min(1),
  reviewType: z.enum(["SingleBlind", "DoubleBlind", "Open"]).default("DoubleBlind"),
  formId: z.string().optional(),
  deadline: z.string().transform((s) => new Date(s)),
  round: z.number().int().positive().default(1),
  message: z.string().max(2000).optional(),
});

// GET /api/submissions/[submissionId]/reviews — list all review assignments
export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { journalId: true, submitterId: true },
      });
      if (!submission) return apiError("Submission not found", 404);

      const isEditor = await isJournalEditor(ctx.user.id, submission.journalId);
      const isSubmitter = submission.submitterId === ctx.user.id;

      if (!isEditor && !isSubmitter) return apiError("Access denied", 403);

      const reviews = await prisma.reviewAssignment.findMany({
        where: { submissionId },
        include: {
          reviewer: { select: { id: true, name: true, email: true, affiliation: true } },
          form: { select: { id: true, name: true } },
          reviewScores: {
            include: { criterion: { select: { label: true, weight: true, maxScore: true } } },
          },
        },
        orderBy: [{ round: "asc" }, { invitedAt: "asc" }],
      });

      // If user is submitter (not editor), anonymize reviewer info
      if (isSubmitter && !isEditor) {
        return NextResponse.json(
          reviews.map((r, i) => ({
            ...r,
            reviewer: { id: "", name: `Reviewer ${i + 1}`, email: "", affiliation: null },
            commentsToEditor: null,
          }))
        );
      }

      return NextResponse.json(reviews);
    } catch (error) {
      return handleError(error);
    }
  });
}

// POST /api/submissions/[submissionId]/reviews — invite a reviewer
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const body = await request.json();
      const data = inviteSchema.parse(body);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          journal: { select: { id: true, name: true, slug: true } },
        },
      });
      if (!submission) return apiError("Submission not found", 404);

      if (!(await isJournalEditor(ctx.user.id, submission.journalId))) {
        return apiError("Only editors can invite reviewers", 403);
      }

      // Verify reviewer exists
      const reviewer = await prisma.user.findUnique({
        where: { id: data.reviewerId },
        select: { id: true, name: true, email: true },
      });
      if (!reviewer) return apiError("Reviewer not found", 404);

      // Check for duplicate invitation in same round
      const existing = await prisma.reviewAssignment.findFirst({
        where: {
          submissionId,
          reviewerId: data.reviewerId,
          round: data.round,
          status: { notIn: ["Declined", "Cancelled"] },
        },
      });
      if (existing) return apiError("Reviewer already invited for this round", 409);

      // Generate secure invitation token
      const invitationToken = randomBytes(32).toString("hex");

      const assignment = await prisma.reviewAssignment.create({
        data: {
          submissionId,
          reviewerId: data.reviewerId,
          assignedById: ctx.user.id,
          reviewType: data.reviewType,
          formId: data.formId,
          deadline: data.deadline,
          round: data.round,
          invitationToken,
          status: "Invited",
        },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
      });

      // Send invitation email
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const acceptUrl = `${baseUrl}/reviews/respond?token=${invitationToken}&action=accept`;
      const declineUrl = `${baseUrl}/reviews/respond?token=${invitationToken}&action=decline`;

      // For double-blind, don't include title in email
      const showTitle = data.reviewType !== "DoubleBlind";

      await sendEmail({
        to: reviewer.email,
        subject: `Invitation to Review — ${submission.journal.name}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
            <div style="background: #8C1515; padding: 24px; text-align: center;">
              <h1 style="color: white; font-size: 20px; margin: 0;">${escapeHtml(submission.journal.name)}</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p>Dear ${escapeHtml(reviewer.name)},</p>
              <p>You are invited to review a manuscript for <strong>${escapeHtml(submission.journal.name)}</strong>.</p>
              ${showTitle ? `<div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; font-weight: bold;">${escapeHtml(submission.title)}</p>
              </div>` : ""}
              ${data.message ? `<p><em>${escapeHtml(data.message)}</em></p>` : ""}
              <p><strong>Review deadline:</strong> ${data.deadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${acceptUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-right: 12px;">Accept</a>
                <a href="${declineUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">Decline</a>
              </div>
              <p style="font-size: 12px; color: #999;">If the buttons don't work, copy these links:<br/>
              Accept: ${acceptUrl}<br/>
              Decline: ${declineUrl}</p>
            </div>
          </div>
        `,
        journalId: submission.journalId,
        submissionId,
        templateKey: "reviewer.invitation",
      }).catch((err) => console.error("Failed to send invitation email:", err));

      return NextResponse.json(assignment, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
