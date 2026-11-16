import { prisma } from "@stanford-press/database";

/** Escape HTML entities to prevent XSS in email templates */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  journalId?: string;
  submissionId?: string;
  templateKey?: string;
}

/**
 * Send an email. In development, logs to console. In production, uses Resend API.
 * Throws on failure so callers can handle errors.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, journalId, submissionId, templateKey } = options;

  if (process.env.NODE_ENV === "development") {
    console.log("\n" + "=".repeat(60));
    console.log(`EMAIL TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log("=".repeat(60));
    console.log(html.replace(/<[^>]*>/g, ""));
    console.log("=".repeat(60) + "\n");
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "noreply@press.stanford.edu",
      to,
      subject,
      html,
    }),
  });

  const status = res.ok ? "sent" : "failed";

  // Log email to database (best-effort, don't fail the whole operation)
  if (journalId) {
    try {
      await prisma.emailLog.create({
        data: {
          journalId,
          submissionId,
          templateKey: templateKey || "custom",
          toEmail: to,
          subject,
          status,
        },
      });
    } catch (err) {
      console.error("Failed to log email:", err);
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown");
    throw new Error(`Failed to send email to ${to}: ${res.status} ${body}`);
  }
}

/**
 * Render an email template with variable substitution.
 * All variables are HTML-escaped to prevent XSS.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined) return match;
    return escapeHtml(value);
  });
}

/**
 * Send a templated email for a journal event.
 * Errors are caught and logged — email failures should not block workflows.
 */
export async function sendTemplatedEmail(options: {
  journalId: string;
  submissionId?: string;
  eventKey: string;
  to: string;
  variables: Record<string, string>;
}): Promise<void> {
  const { journalId, submissionId, eventKey, to, variables } = options;

  const template = await prisma.emailTemplate.findUnique({
    where: { journalId_eventKey: { journalId, eventKey } },
  });

  if (!template || !template.enabled) {
    return;
  }

  const subject = renderTemplate(template.subject, variables);
  const bodyText = renderTemplate(template.body, variables);

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6;">
      <div style="background: #1a1a2e; padding: 24px; text-align: center;">
        <h1 style="color: white; font-size: 20px; margin: 0;">${escapeHtml(variables.journalName || "Stanford Open Press")}</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        ${bodyText
          .split("\n")
          .map((line) =>
            line.trim() ? `<p style="margin: 0 0 16px 0;">${line}</p>` : ""
          )
          .join("")}
      </div>
      <div style="padding: 16px 24px; background: #f5f5f5; text-align: center; font-size: 12px; color: #999;">
        <p>Powered by Stanford Open Press</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({ to, subject, html, journalId, submissionId, templateKey: eventKey });
  } catch (err) {
    console.error(`Failed to send ${eventKey} email to ${to}:`, err);
  }
}

// ============================================
// Pre-built notification functions
// ============================================

export async function notifySubmissionReceived(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      journal: { select: { id: true, name: true } },
      authors: { where: { corresponding: true } },
    },
  });

  if (!submission || submission.authors.length === 0) return;

  for (const author of submission.authors) {
    await sendTemplatedEmail({
      journalId: submission.journalId,
      submissionId,
      eventKey: "submission.acknowledged",
      to: author.email,
      variables: {
        authorName: `${author.givenName} ${author.familyName}`,
        title: submission.title,
        journalName: submission.journal.name,
        submissionId: submission.id,
      },
    });
  }
}

export async function notifyEditorsNewSubmission(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      journal: { select: { id: true, name: true } },
      authors: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  if (!submission) return;

  const editors = await prisma.roleAssignment.findMany({
    where: {
      journalId: submission.journalId,
      role: { in: ["EditorInChief", "ManagingEditor"] },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  if (editors.length === 0) return;

  const firstAuthor = submission.authors[0];
  const authorName = firstAuthor
    ? `${firstAuthor.givenName} ${firstAuthor.familyName}`
    : "Unknown";

  for (const editor of editors) {
    try {
      await sendEmail({
        to: editor.user.email,
        subject: `New Submission: ${submission.title}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
            <div style="background: #1a1a2e; padding: 24px; text-align: center;">
              <h1 style="color: white; font-size: 20px; margin: 0;">${escapeHtml(submission.journal.name)}</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p>Dear ${escapeHtml(editor.user.name)},</p>
              <p>A new manuscript has been submitted and requires your attention:</p>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; font-weight: bold;">${escapeHtml(submission.title)}</p>
                <p style="margin: 8px 0 0 0; color: #666;">By ${escapeHtml(authorName)} et al.</p>
              </div>
              <p>Please log in to review this submission.</p>
            </div>
          </div>
        `,
        journalId: submission.journalId,
        submissionId,
        templateKey: "editor.new-submission",
      });
    } catch (err) {
      console.error(`Failed to notify editor ${editor.user.email}:`, err);
    }
  }
}

export async function notifyDecision(
  submissionId: string,
  decision: string,
  comments?: string
): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      journal: { select: { id: true, name: true } },
      authors: { where: { corresponding: true } },
      decisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { editor: { select: { name: true } } },
      },
    },
  });

  if (!submission || submission.authors.length === 0) return;

  const editorName = submission.decisions[0]?.editor.name || "The Editor";
  const decisionLabel = decision.replace(/([A-Z])/g, " $1").trim();

  for (const author of submission.authors) {
    await sendTemplatedEmail({
      journalId: submission.journalId,
      submissionId,
      eventKey: "decision.made",
      to: author.email,
      variables: {
        authorName: `${author.givenName} ${author.familyName}`,
        title: submission.title,
        journalName: submission.journal.name,
        decision: decisionLabel,
        comments: comments || "",
        editorName,
      },
    });
  }
}

export async function notifyRevisionRequested(
  submissionId: string,
  deadline: Date,
  comments: string
): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      journal: { select: { id: true, name: true } },
      authors: { where: { corresponding: true } },
      decisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { editor: { select: { name: true } } },
      },
    },
  });

  if (!submission || submission.authors.length === 0) return;

  const editorName = submission.decisions[0]?.editor.name || "The Editor";

  for (const author of submission.authors) {
    await sendTemplatedEmail({
      journalId: submission.journalId,
      submissionId,
      eventKey: "revision.requested",
      to: author.email,
      variables: {
        authorName: `${author.givenName} ${author.familyName}`,
        title: submission.title,
        journalName: submission.journal.name,
        deadline: deadline.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        comments,
        editorName,
      },
    });
  }
}
