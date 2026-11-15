import type { ID } from "@stanford-press/core";
import type { EmailTemplate, CreateEmailTemplateOptions } from "./types";

let counter = 0;

function generateId(): ID {
  return `tpl_${Date.now()}_${++counter}`;
}

/**
 * Create a custom email template.
 */
export function createEmailTemplate(options: CreateEmailTemplateOptions): EmailTemplate {
  return {
    id: generateId(),
    journalId: options.journalId,
    eventKey: options.eventKey,
    subject: options.subject,
    body: options.body,
    enabled: options.enabled ?? true,
  };
}

/**
 * Render an email template by replacing placeholders with values.
 *
 * Placeholders use the format `{{variableName}}`.
 */
export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>,
): { subject: string; body: string } {
  const replace = (text: string): string =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);

  return {
    subject: replace(template.subject),
    body: replace(template.body),
  };
}

/**
 * Default email templates for common workflow events.
 */
export function createDefaultTemplates(journalId: ID): EmailTemplate[] {
  return [
    createEmailTemplate({
      journalId,
      eventKey: "submission.acknowledged",
      subject: "Submission Received — {{journalName}}",
      body: `Dear {{authorName}},

Thank you for submitting your manuscript "{{title}}" to {{journalName}}.

Your submission has been assigned the ID {{submissionId}} and is now under editorial review.

You can track the status of your submission in your author dashboard.

Best regards,
The {{journalName}} Editorial Team`,
    }),
    createEmailTemplate({
      journalId,
      eventKey: "reviewer.invitation",
      subject: "Invitation to Review — {{journalName}}",
      body: `Dear {{reviewerName}},

We would like to invite you to review a manuscript for {{journalName}}.

Title: "{{title}}"
Abstract: {{abstract}}

Please respond to this invitation by {{deadline}}.

To accept or decline, visit your reviewer dashboard.

Best regards,
{{editorName}}
{{journalName}}`,
    }),
    createEmailTemplate({
      journalId,
      eventKey: "decision.made",
      subject: "Decision on Your Manuscript — {{journalName}}",
      body: `Dear {{authorName}},

We have reached a decision regarding your manuscript "{{title}}" ({{submissionId}}).

Decision: {{decision}}

{{comments}}

Best regards,
{{editorName}}
{{journalName}}`,
    }),
    createEmailTemplate({
      journalId,
      eventKey: "revision.requested",
      subject: "Revision Requested — {{journalName}}",
      body: `Dear {{authorName}},

The reviewers have recommended revisions to your manuscript "{{title}}" ({{submissionId}}).

Please submit your revised manuscript by {{deadline}}.

{{comments}}

Best regards,
{{editorName}}
{{journalName}}`,
    }),
  ];
}
