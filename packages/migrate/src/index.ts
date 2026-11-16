// Types
export type {
  OJSJournal,
  OJSSubmission,
  OJSAuthor,
  OJSUser,
  OJSReviewAssignment,
  OJSIssue,
  DatabaseConfig,
  MigrationPlan,
  MigrationReport,
  MigrationError,
  RollbackInfo,
} from "./types";

// Mapper
export {
  mapJournal,
  mapSubmission,
  mapAuthor,
  mapUser,
  mapIssue,
  mapReviewAssignment,
  OJS_STATUS_MAP,
  OJS_ROLE_MAP,
  OJS_RECOMMENDATION_MAP,
} from "./mapper";

// Importer
export { OJSImporter } from "./importer";

// Migrator (CLI engine)
export { OJSMigrator } from "./migrator";
