import type { ID } from "@stanford-press/core";
import type { ProductionTask } from "./types";
import { ProductionTaskType, ProductionTaskStatus } from "./types";

let counter = 0;

function generateId(): ID {
  return `pt_${Date.now()}_${++counter}`;
}

/**
 * Create the standard production pipeline for a submission.
 * Returns an ordered list of tasks that must be completed before publication.
 */
export function createProductionPipeline(submissionId: ID): ProductionTask[] {
  const now = new Date().toISOString();
  const tasks: ProductionTask[] = [
    {
      id: generateId(),
      submissionId,
      type: ProductionTaskType.MetadataEntry,
      status: ProductionTaskStatus.Pending,
      createdAt: now,
    },
    {
      id: generateId(),
      submissionId,
      type: ProductionTaskType.Typesetting,
      status: ProductionTaskStatus.Pending,
      createdAt: now,
    },
    {
      id: generateId(),
      submissionId,
      type: ProductionTaskType.GalleyProof,
      status: ProductionTaskStatus.Pending,
      createdAt: now,
    },
    {
      id: generateId(),
      submissionId,
      type: ProductionTaskType.AuthorProofing,
      status: ProductionTaskStatus.Pending,
      createdAt: now,
    },
    {
      id: generateId(),
      submissionId,
      type: ProductionTaskType.FinalCheck,
      status: ProductionTaskStatus.Pending,
      createdAt: now,
    },
    {
      id: generateId(),
      submissionId,
      type: ProductionTaskType.DOIRegistration,
      status: ProductionTaskStatus.Pending,
      createdAt: now,
    },
  ];
  return tasks;
}

/**
 * Assign a production task to a user.
 */
export function assignTask(task: ProductionTask, assigneeId: ID): ProductionTask {
  return {
    ...task,
    assigneeId,
    status: ProductionTaskStatus.InProgress,
  };
}

/**
 * Complete a production task.
 */
export function completeTask(task: ProductionTask): ProductionTask {
  if (task.status !== ProductionTaskStatus.InProgress && task.status !== ProductionTaskStatus.AwaitingApproval) {
    throw new Error(`Cannot complete task: status is "${task.status}"`);
  }
  return {
    ...task,
    status: ProductionTaskStatus.Completed,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Check if all production tasks for a submission are complete.
 */
export function isProductionComplete(tasks: ProductionTask[]): boolean {
  return tasks.every((t) => t.status === ProductionTaskStatus.Completed);
}

/**
 * Get the next pending task in the pipeline.
 */
export function getNextPendingTask(tasks: ProductionTask[]): ProductionTask | undefined {
  return tasks.find((t) => t.status === ProductionTaskStatus.Pending);
}
