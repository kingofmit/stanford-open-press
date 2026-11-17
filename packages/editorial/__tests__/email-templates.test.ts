import { describe, it, expect } from "vitest";
import {
  createEmailTemplate,
  renderTemplate,
  createDefaultTemplates,
} from "../src/email-templates";

describe("createEmailTemplate", () => {
  it("creates a template with all provided fields", () => {
    const template = createEmailTemplate({
      journalId: "journal_1",
      eventKey: "submission.acknowledged",
      subject: "Your Submission — {{journalName}}",
      body: "Dear {{authorName}}, thank you.",
    });

    expect(template.journalId).toBe("journal_1");
    expect(template.eventKey).toBe("submission.acknowledged");
    expect(template.subject).toBe("Your Submission — {{journalName}}");
    expect(template.body).toBe("Dear {{authorName}}, thank you.");
  });

  it("defaults enabled to true", () => {
    const template = createEmailTemplate({
      journalId: "journal_1",
      eventKey: "test",
      subject: "Subject",
      body: "Body",
    });

    expect(template.enabled).toBe(true);
  });

  it("allows setting enabled to false", () => {
    const template = createEmailTemplate({
      journalId: "journal_1",
      eventKey: "test",
      subject: "Subject",
      body: "Body",
      enabled: false,
    });

    expect(template.enabled).toBe(false);
  });

  it("generates a unique id starting with tpl_", () => {
    const t1 = createEmailTemplate({
      journalId: "j1",
      eventKey: "e1",
      subject: "S1",
      body: "B1",
    });
    const t2 = createEmailTemplate({
      journalId: "j1",
      eventKey: "e2",
      subject: "S2",
      body: "B2",
    });

    expect(t1.id).toMatch(/^tpl_/);
    expect(t2.id).toMatch(/^tpl_/);
    expect(t1.id).not.toBe(t2.id);
  });
});

describe("renderTemplate", () => {
  it("replaces variables in subject and body", () => {
    const template = createEmailTemplate({
      journalId: "journal_1",
      eventKey: "test",
      subject: "Welcome to {{journalName}}",
      body: "Dear {{authorName}}, your submission {{submissionId}} is received.",
    });

    const rendered = renderTemplate(template, {
      journalName: "Open Science Review",
      authorName: "Jane Doe",
      submissionId: "SUB-001",
    });

    expect(rendered.subject).toBe("Welcome to Open Science Review");
    expect(rendered.body).toBe(
      "Dear Jane Doe, your submission SUB-001 is received."
    );
  });

  it("leaves placeholders intact for missing variables", () => {
    const template = createEmailTemplate({
      journalId: "journal_1",
      eventKey: "test",
      subject: "Decision — {{journalName}}",
      body: "Dear {{authorName}}, the decision is {{decision}}.",
    });

    const rendered = renderTemplate(template, {
      journalName: "Open Science Review",
    });

    expect(rendered.subject).toBe("Decision — Open Science Review");
    expect(rendered.body).toBe(
      "Dear {{authorName}}, the decision is {{decision}}."
    );
  });

  it("handles templates with no placeholders", () => {
    const template = createEmailTemplate({
      journalId: "journal_1",
      eventKey: "test",
      subject: "Plain subject",
      body: "Plain body with no variables.",
    });

    const rendered = renderTemplate(template, { foo: "bar" });

    expect(rendered.subject).toBe("Plain subject");
    expect(rendered.body).toBe("Plain body with no variables.");
  });

  it("replaces multiple occurrences of the same variable", () => {
    const template = createEmailTemplate({
      journalId: "journal_1",
      eventKey: "test",
      subject: "{{journalName}}",
      body: "{{journalName}} welcomes you to {{journalName}}.",
    });

    const rendered = renderTemplate(template, {
      journalName: "OSR",
    });

    expect(rendered.body).toBe("OSR welcomes you to OSR.");
  });
});

describe("createDefaultTemplates", () => {
  it("creates 4 templates", () => {
    const templates = createDefaultTemplates("journal_1");
    expect(templates).toHaveLength(4);
  });

  it("creates templates with the correct event keys", () => {
    const templates = createDefaultTemplates("journal_1");
    const eventKeys = templates.map((t) => t.eventKey);

    expect(eventKeys).toContain("submission.acknowledged");
    expect(eventKeys).toContain("reviewer.invitation");
    expect(eventKeys).toContain("decision.made");
    expect(eventKeys).toContain("revision.requested");
  });

  it("sets journalId on all templates", () => {
    const templates = createDefaultTemplates("journal_42");
    for (const t of templates) {
      expect(t.journalId).toBe("journal_42");
    }
  });

  it("all templates are enabled by default", () => {
    const templates = createDefaultTemplates("journal_1");
    for (const t of templates) {
      expect(t.enabled).toBe(true);
    }
  });

  it("templates contain placeholder variables", () => {
    const templates = createDefaultTemplates("journal_1");

    // The submission.acknowledged template should have {{authorName}} and {{journalName}}
    const ackTemplate = templates.find(
      (t) => t.eventKey === "submission.acknowledged"
    )!;
    expect(ackTemplate.body).toContain("{{authorName}}");
    expect(ackTemplate.body).toContain("{{journalName}}");
    expect(ackTemplate.subject).toContain("{{journalName}}");
  });
});
