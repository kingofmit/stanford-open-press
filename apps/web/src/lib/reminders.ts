import { prisma } from "@stanford-press/database";
import { sendEmail, escapeHtml } from "@/lib/email";

interface ReminderResult {
  sent: number;
  errors: number;
  details: string[];
}

/**
 * Check all active review assignments and send reminders based on deadline proximity.
 * Schedule:
 * - 7 days before deadline: gentle reminder
 * - On deadline day: due today reminder
 * - 3 days overdue: overdue warning
 * - 7 days overdue: escalation to editor
 * - 14 days overdue: auto-cancel suggestion to editor
 */
export async function processReviewReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, errors: 0, details: [] };
  const now = new Date();

  // Find all active review assignments (accepted or in progress)
  const assignments = await prisma.reviewAssignment.findMany({
    where: {
      status: { in: ["Accepted", "InProgress"] },
    },
    include: {
      reviewer: { select: { name: true, email: true } },
      submission: {
        select: {
          id: true,
          title: true,
          journalId: true,
          journal: { select: { name: true } },
          editorId: true,
        },
      },
    },
  });

  for (const assignment of assignments) {
    const daysUntilDeadline = Math.floor(
      (assignment.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let reminderType: string | null = null;

    if (daysUntilDeadline === 7) {
      reminderType = "7-day-warning";
    } else if (daysUntilDeadline === 0) {
      reminderType = "due-today";
    } else if (daysUntilDeadline === -3) {
      reminderType = "3-day-overdue";
    } else if (daysUntilDeadline === -7) {
      reminderType = "7-day-overdue";
    } else if (daysUntilDeadline === -14) {
      reminderType = "14-day-overdue";
    }

    if (!reminderType) continue;

    // Check if we already sent this reminder (check EmailLog)
    const alreadySent = await prisma.emailLog.findFirst({
      where: {
        submissionId: assignment.submissionId,
        templateKey: `reminder.${reminderType}.${assignment.id}`,
      },
    });

    if (alreadySent) continue;

    try {
      if (daysUntilDeadline >= 0) {
        // Reminder to reviewer
        await sendReviewerReminder(assignment, reminderType, daysUntilDeadline);
        result.sent++;
        result.details.push(`Sent ${reminderType} to ${assignment.reviewer.name} for "${assignment.submission.title}"`);
      } else {
        // Overdue: notify both reviewer and editor
        await sendReviewerReminder(assignment, reminderType, daysUntilDeadline);
        result.sent++;

        if (daysUntilDeadline <= -7) {
          await sendEditorEscalation(assignment, Math.abs(daysUntilDeadline));
          result.sent++;
          result.details.push(`Escalated to editor: ${assignment.reviewer.name} is ${Math.abs(daysUntilDeadline)} days overdue`);
        }
      }
    } catch (err) {
      result.errors++;
      result.details.push(`Error sending ${reminderType} for assignment ${assignment.id}: ${(err as Error).message}`);
    }
  }

  // Also check for overdue assignments and update status
  await prisma.reviewAssignment.updateMany({
    where: {
      status: { in: ["Accepted", "InProgress"] },
      deadline: { lt: now },
    },
    data: { status: "Overdue" },
  });

  return result;
}

async function sendReviewerReminder(
  assignment: {
    id: string;
    reviewer: { name: string; email: string };
    submission: { id: string; title: string; journalId: string; journal: { name: string } };
    deadline: Date;
  },
  reminderType: string,
  daysUntilDeadline: number
): Promise<void> {
  const isOverdue = daysUntilDeadline < 0;
  const subject = isOverdue
    ? `Review Overdue (${Math.abs(daysUntilDeadline)} days) \u2014 ${assignment.submission.journal.name}`
    : daysUntilDeadline === 0
      ? `Review Due Today \u2014 ${assignment.submission.journal.name}`
      : `Review Reminder (${daysUntilDeadline} days remaining) \u2014 ${assignment.submission.journal.name}`;

  const urgencyColor = isOverdue ? "#ef4444" : daysUntilDeadline === 0 ? "#f59e0b" : "#3b82f6";

  await sendEmail({
    to: assignment.reviewer.email,
    subject,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
        <div style="background: #8C1515; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 20px; margin: 0;">${escapeHtml(assignment.submission.journal.name)}</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p>Dear ${escapeHtml(assignment.reviewer.name)},</p>
          <div style="background: ${urgencyColor}10; border-left: 4px solid ${urgencyColor}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; color: ${urgencyColor}; font-weight: 600;">
              ${isOverdue
                ? `Your review is ${Math.abs(daysUntilDeadline)} days overdue`
                : daysUntilDeadline === 0
                  ? "Your review is due today"
                  : `Your review is due in ${daysUntilDeadline} days`}
            </p>
          </div>
          <p><strong>Deadline:</strong> ${assignment.deadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>Please log in to complete your review at your earliest convenience.</p>
          ${isOverdue ? "<p><em>If you are unable to complete the review, please let us know so we can find an alternative reviewer.</em></p>" : ""}
        </div>
      </div>
    `,
    journalId: assignment.submission.journalId,
    submissionId: assignment.submission.id,
    templateKey: `reminder.${reminderType}.${assignment.id}`,
  });
}

async function sendEditorEscalation(
  assignment: {
    id: string;
    reviewer: { name: string; email: string };
    submission: { id: string; title: string; journalId: string; journal: { name: string }; editorId: string | null };
  },
  daysOverdue: number
): Promise<void> {
  // Find editors for this journal
  const editors = await prisma.roleAssignment.findMany({
    where: {
      journalId: assignment.submission.journalId,
      role: { in: ["EditorInChief", "ManagingEditor"] },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  for (const editor of editors) {
    await sendEmail({
      to: editor.user.email,
      subject: `Review Overdue: ${daysOverdue} days \u2014 Action Required`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
          <div style="background: #8C1515; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; margin: 0;">${escapeHtml(assignment.submission.journal.name)}</h1>
          </div>
          <div style="padding: 32px 24px;">
            <p>Dear ${escapeHtml(editor.user.name)},</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; color: #dc2626; font-weight: 600;">
                A review is ${daysOverdue} days overdue and may require reassignment
              </p>
            </div>
            <p><strong>Manuscript:</strong> ${escapeHtml(assignment.submission.title)}</p>
            <p><strong>Reviewer:</strong> ${escapeHtml(assignment.reviewer.name)} (${escapeHtml(assignment.reviewer.email)})</p>
            <p><strong>Days overdue:</strong> ${daysOverdue}</p>
            ${daysOverdue >= 14 ? "<p><strong>Recommendation:</strong> Consider cancelling this assignment and inviting a new reviewer.</p>" : ""}
            <p>Please log in to manage this review assignment.</p>
          </div>
        </div>
      `,
      journalId: assignment.submission.journalId,
      submissionId: assignment.submission.id,
      templateKey: `escalation.${daysOverdue}d.${assignment.id}`,
    }).catch((err) => console.error(`Failed to escalate to ${editor.user.email}:`, err));
  }
}
