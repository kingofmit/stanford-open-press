// Types
export type {
  Author,
  FileAttachment,
  CoverLetter,
  Submission,
  SubmissionMetadata,
  CreateSubmissionOptions,
  StatusTransition,
} from "./types";

export { SubmissionStatus, FileCategory } from "./types";

// Submission
export { createSubmission, addFile, getFilesByCategory, getLatestManuscript, validateForSubmission } from "./submission";

// Workflow
export { SubmissionWorkflow, isValidTransition, VALID_TRANSITIONS } from "./workflow";
