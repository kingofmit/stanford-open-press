// Types
export type {
  EditorialDecision,
  CopyeditRecord,
  EditorialNote,
  ProductionTask,
  EmailTemplate,
  DashboardStats,
  CreateDecisionOptions,
  CreateEmailTemplateOptions,
} from "./types";

export {
  EditorialDecisionType,
  CopyeditStatus,
  ProductionTaskType,
  ProductionTaskStatus,
} from "./types";

// Decision
export { createDecision, summarizeReviewDecisions } from "./decision";

// Copyediting
export { startCopyediting, addNote, resolveNote, sendToAuthor, completeCopyediting } from "./copyediting";

// Production
export {
  createProductionPipeline,
  assignTask,
  completeTask,
  isProductionComplete,
  getNextPendingTask,
} from "./production";

// Email Templates
export { createEmailTemplate, renderTemplate, createDefaultTemplates } from "./email-templates";

// Dashboard
export { computeDashboardStats } from "./dashboard";
