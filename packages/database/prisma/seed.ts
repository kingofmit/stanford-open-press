import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a demo journal
  const journal = await prisma.journal.upsert({
    where: { slug: "demo-journal" },
    update: {},
    create: {
      name: "Stanford Open Press Demo Journal",
      slug: "demo-journal",
      abbreviation: "SOPDJ",
      description: "A demonstration journal for Stanford Open Press",
      peerReviewType: "double-blind",
      licenseType: "CC-BY-4.0",
      sections: {
        create: [
          { name: "Research Articles", sortOrder: 0 },
          { name: "Review Articles", sortOrder: 1 },
          { name: "Short Communications", sortOrder: 2 },
        ],
      },
      reviewForms: {
        create: {
          name: "Default Review Form",
          description: "Standard review criteria",
          criteria: {
            create: [
              { label: "Originality & Significance", description: "Does the paper present novel findings or ideas?", weight: 2, sortOrder: 0 },
              { label: "Scientific Rigor", description: "Is the methodology sound and well-described?", weight: 3, sortOrder: 1 },
              { label: "Clarity of Presentation", description: "Is the paper well-written and clearly organized?", weight: 1, sortOrder: 2 },
              { label: "Relevance to Journal Scope", description: "Does the paper fit the journal's aims?", weight: 1, sortOrder: 3 },
              { label: "References & Literature Review", description: "Is the existing literature adequately covered?", weight: 1, sortOrder: 4 },
            ],
          },
        },
      },
      emailTemplates: {
        create: [
          {
            eventKey: "submission.acknowledged",
            subject: "Submission Received: {{title}}",
            body: "Dear {{authorName}},\n\nThank you for submitting your manuscript \"{{title}}\" to {{journalName}}.\n\nYour submission ID is {{submissionId}}. You can track its status in your author dashboard.\n\nBest regards,\n{{journalName}} Editorial Team",
          },
          {
            eventKey: "reviewer.invitation",
            subject: "Invitation to Review: {{journalName}}",
            body: "Dear {{reviewerName}},\n\nWe invite you to review a manuscript for {{journalName}}.\n\nTitle: {{title}}\nAbstract: {{abstract}}\n\nDeadline: {{deadline}}\n\nPlease respond to this invitation:\n{{acceptUrl}} | {{declineUrl}}\n\nBest regards,\n{{editorName}}\n{{journalName}}",
          },
          {
            eventKey: "decision.made",
            subject: "Editorial Decision: {{title}}",
            body: "Dear {{authorName}},\n\nWe have reached a decision regarding your manuscript \"{{title}}\" submitted to {{journalName}}.\n\nDecision: {{decision}}\n\n{{comments}}\n\nBest regards,\n{{editorName}}\n{{journalName}}",
          },
          {
            eventKey: "revision.requested",
            subject: "Revision Requested: {{title}}",
            body: "Dear {{authorName}},\n\nRevisions have been requested for your manuscript \"{{title}}\".\n\nPlease submit your revised manuscript by {{deadline}}.\n\n{{comments}}\n\nBest regards,\n{{editorName}}\n{{journalName}}",
          },
        ],
      },
    },
  });

  console.log(`Seeded journal: ${journal.name} (${journal.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
