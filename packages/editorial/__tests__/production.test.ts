import { describe, it, expect } from "vitest";
import {
  createProductionPipeline,
  assignTask,
  completeTask,
  isProductionComplete,
  getNextPendingTask,
} from "../src/production";
import { ProductionTaskType, ProductionTaskStatus } from "../src/types";

describe("createProductionPipeline", () => {
  it("creates 6 tasks", () => {
    const tasks = createProductionPipeline("sub_1");
    expect(tasks).toHaveLength(6);
  });

  it("creates tasks in the correct order", () => {
    const tasks = createProductionPipeline("sub_1");
    expect(tasks[0].type).toBe(ProductionTaskType.MetadataEntry);
    expect(tasks[1].type).toBe(ProductionTaskType.Typesetting);
    expect(tasks[2].type).toBe(ProductionTaskType.GalleyProof);
    expect(tasks[3].type).toBe(ProductionTaskType.AuthorProofing);
    expect(tasks[4].type).toBe(ProductionTaskType.FinalCheck);
    expect(tasks[5].type).toBe(ProductionTaskType.DOIRegistration);
  });

  it("sets all tasks to pending status", () => {
    const tasks = createProductionPipeline("sub_1");
    for (const task of tasks) {
      expect(task.status).toBe(ProductionTaskStatus.Pending);
    }
  });

  it("sets submissionId on all tasks", () => {
    const tasks = createProductionPipeline("sub_42");
    for (const task of tasks) {
      expect(task.submissionId).toBe("sub_42");
    }
  });

  it("generates unique ids for each task", () => {
    const tasks = createProductionPipeline("sub_1");
    const ids = new Set(tasks.map((t) => t.id));
    expect(ids.size).toBe(6);
  });

  it("sets createdAt on all tasks", () => {
    const tasks = createProductionPipeline("sub_1");
    for (const task of tasks) {
      expect(task.createdAt).toBeTruthy();
    }
  });
});

describe("assignTask", () => {
  it("sets assigneeId and changes status to in-progress", () => {
    const tasks = createProductionPipeline("sub_1");
    const assigned = assignTask(tasks[0], "user_1");

    expect(assigned.assigneeId).toBe("user_1");
    expect(assigned.status).toBe(ProductionTaskStatus.InProgress);
  });

  it("does not mutate the original task", () => {
    const tasks = createProductionPipeline("sub_1");
    const original = tasks[0];
    assignTask(original, "user_1");

    expect(original.status).toBe(ProductionTaskStatus.Pending);
    expect(original.assigneeId).toBeUndefined();
  });
});

describe("completeTask", () => {
  it("sets status to completed and records completedAt", () => {
    const tasks = createProductionPipeline("sub_1");
    const assigned = assignTask(tasks[0], "user_1");
    const completed = completeTask(assigned);

    expect(completed.status).toBe(ProductionTaskStatus.Completed);
    expect(completed.completedAt).toBeTruthy();
  });

  it("allows completing a task with awaiting-approval status", () => {
    const tasks = createProductionPipeline("sub_1");
    const awaitingApproval = {
      ...tasks[0],
      status: ProductionTaskStatus.AwaitingApproval,
    };
    const completed = completeTask(awaitingApproval);

    expect(completed.status).toBe(ProductionTaskStatus.Completed);
  });

  it("throws when task is pending", () => {
    const tasks = createProductionPipeline("sub_1");
    expect(() => completeTask(tasks[0])).toThrow(
      'Cannot complete task: status is "pending"'
    );
  });

  it("throws when task is already completed", () => {
    const tasks = createProductionPipeline("sub_1");
    const assigned = assignTask(tasks[0], "user_1");
    const completed = completeTask(assigned);

    expect(() => completeTask(completed)).toThrow(
      'Cannot complete task: status is "completed"'
    );
  });
});

describe("getNextPendingTask", () => {
  it("returns the first pending task", () => {
    const tasks = createProductionPipeline("sub_1");
    const next = getNextPendingTask(tasks);

    expect(next).toBeDefined();
    expect(next!.type).toBe(ProductionTaskType.MetadataEntry);
  });

  it("skips completed and in-progress tasks", () => {
    const tasks = createProductionPipeline("sub_1");
    // Complete the first task, assign the second
    tasks[0] = { ...tasks[0], status: ProductionTaskStatus.Completed };
    tasks[1] = { ...tasks[1], status: ProductionTaskStatus.InProgress };

    const next = getNextPendingTask(tasks);

    expect(next).toBeDefined();
    expect(next!.type).toBe(ProductionTaskType.GalleyProof);
  });

  it("returns undefined when all tasks are completed", () => {
    const tasks = createProductionPipeline("sub_1").map((t) => ({
      ...t,
      status: ProductionTaskStatus.Completed,
    }));

    expect(getNextPendingTask(tasks)).toBeUndefined();
  });
});

describe("isProductionComplete", () => {
  it("returns false when some tasks are not completed", () => {
    const tasks = createProductionPipeline("sub_1");
    expect(isProductionComplete(tasks)).toBe(false);
  });

  it("returns false when only some tasks are completed", () => {
    const tasks = createProductionPipeline("sub_1");
    tasks[0] = { ...tasks[0], status: ProductionTaskStatus.Completed };
    tasks[1] = { ...tasks[1], status: ProductionTaskStatus.Completed };

    expect(isProductionComplete(tasks)).toBe(false);
  });

  it("returns true when all tasks are completed", () => {
    const tasks = createProductionPipeline("sub_1").map((t) => ({
      ...t,
      status: ProductionTaskStatus.Completed,
    }));

    expect(isProductionComplete(tasks)).toBe(true);
  });

  it("returns true for an empty task list", () => {
    expect(isProductionComplete([])).toBe(true);
  });
});
