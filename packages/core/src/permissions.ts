import { Role, Action, Resource, WorkflowStage } from "./types";
import type { Permission } from "./types";

/**
 * Default permission matrix for the scholarly publishing workflow.
 * Each entry defines what a role can do on a resource, optionally scoped to workflow stages.
 */
export const DEFAULT_PERMISSIONS: Permission[] = [
  // Editor-in-Chief — full control
  { role: Role.EditorInChief, action: Action.Create, resource: Resource.Journal },
  { role: Role.EditorInChief, action: Action.Read, resource: Resource.Journal },
  { role: Role.EditorInChief, action: Action.Update, resource: Resource.Journal },
  { role: Role.EditorInChief, action: Action.Delete, resource: Resource.Journal },
  { role: Role.EditorInChief, action: Action.Read, resource: Resource.Submission },
  { role: Role.EditorInChief, action: Action.Update, resource: Resource.Submission },
  { role: Role.EditorInChief, action: Action.Assign, resource: Resource.Review },
  { role: Role.EditorInChief, action: Action.Decide, resource: Resource.Editorial },
  { role: Role.EditorInChief, action: Action.Publish, resource: Resource.Issue },
  { role: Role.EditorInChief, action: Action.Create, resource: Resource.User },
  { role: Role.EditorInChief, action: Action.Update, resource: Resource.User },

  // Section Editor — manage submissions in their section
  { role: Role.SectionEditor, action: Action.Read, resource: Resource.Submission },
  { role: Role.SectionEditor, action: Action.Update, resource: Resource.Submission },
  { role: Role.SectionEditor, action: Action.Assign, resource: Resource.Review },
  { role: Role.SectionEditor, action: Action.Decide, resource: Resource.Editorial },

  // Reviewer — read assigned submissions, submit reviews
  {
    role: Role.Reviewer,
    action: Action.Read,
    resource: Resource.Submission,
    stages: [WorkflowStage.PeerReview],
  },
  { role: Role.Reviewer, action: Action.Create, resource: Resource.Review },
  { role: Role.Reviewer, action: Action.Update, resource: Resource.Review },

  // Author — create and read own submissions
  { role: Role.Author, action: Action.Create, resource: Resource.Submission },
  { role: Role.Author, action: Action.Read, resource: Resource.Submission },
  { role: Role.Author, action: Action.Update, resource: Resource.Submission, stages: [WorkflowStage.Revision] },

  // Copyeditor — edit during copyediting stage
  {
    role: Role.Copyeditor,
    action: Action.Read,
    resource: Resource.Submission,
    stages: [WorkflowStage.Copyediting],
  },
  {
    role: Role.Copyeditor,
    action: Action.Update,
    resource: Resource.Submission,
    stages: [WorkflowStage.Copyediting],
  },

  // Proofreader — read during production stage
  {
    role: Role.Proofreader,
    action: Action.Read,
    resource: Resource.Submission,
    stages: [WorkflowStage.Production],
  },
  {
    role: Role.Proofreader,
    action: Action.Update,
    resource: Resource.Submission,
    stages: [WorkflowStage.Production],
  },
];

/**
 * Check if a role has permission to perform an action on a resource,
 * optionally at a specific workflow stage.
 */
export function hasPermission(
  permissions: Permission[],
  role: Role,
  action: Action,
  resource: Resource,
  stage?: WorkflowStage,
): boolean {
  return permissions.some((p) => {
    if (p.role !== role || p.action !== action || p.resource !== resource) {
      return false;
    }
    // If the permission has stage restrictions, check them
    if (p.stages && p.stages.length > 0) {
      return stage !== undefined && p.stages.includes(stage);
    }
    // No stage restriction — permission applies globally
    return true;
  });
}

/**
 * Get all permissions for a specific role.
 */
export function getPermissionsForRole(permissions: Permission[], role: Role): Permission[] {
  return permissions.filter((p) => p.role === role);
}
