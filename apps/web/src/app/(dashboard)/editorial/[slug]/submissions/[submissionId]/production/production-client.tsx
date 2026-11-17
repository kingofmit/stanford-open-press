"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  type: string;
  status: string;
  sortOrder: number;
  notes: string | null;
  completedAt: Date | string | null;
  assignee: { id: string; name: string } | null;
}

interface CopyeditRecord {
  id: string;
  status: string;
  notes: unknown;
  copyeditor: { id: string; name: string };
  copyeditorId: string;
  submissionId: string;
  assignedAt: Date | string;
  completedAt: Date | string | null;
}

interface StaffMember {
  id: string;
  name: string;
}

const TASK_LABELS: Record<string, string> = {
  MetadataEntry: "Metadata Entry",
  Typesetting: "Typesetting",
  GalleyProof: "Galley Proof",
  AuthorProofing: "Author Proofing",
  FinalCheck: "Final Check",
  DOIRegistration: "DOI Registration",
};

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-600",
  InProgress: "bg-blue-100 text-blue-700",
  AwaitingApproval: "bg-yellow-100 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
  Skipped: "bg-gray-50 text-gray-400",
};

export function ProductionClient({
  submissionId,
  slug,
  tasks,
  copyeditRecords,
  staff,
  submissionStatus,
}: {
  submissionId: string;
  slug: string;
  tasks: Task[];
  copyeditRecords: CopyeditRecord[];
  staff: StaffMember[];
  submissionStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createPipeline = async () => {
    setLoading("create");
    setError(null);
    const res = await fetch(`/api/submissions/${submissionId}/production`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to create pipeline" }));
      setError(data.error || "Failed to create pipeline");
    }
    router.refresh();
    setLoading(null);
  };

  const updateTask = async (taskId: string, status: string) => {
    setLoading(taskId);
    setError(null);
    const res = await fetch(`/api/submissions/${submissionId}/production`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to update task" }));
      setError(data.error || "Failed to update task");
    }
    router.refresh();
    setLoading(null);
  };

  const startCopyediting = async (copyeditorId: string) => {
    setLoading("copyedit");
    setError(null);
    const res = await fetch(`/api/submissions/${submissionId}/copyedit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copyeditorId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to assign copyeditor" }));
      setError(data.error || "Failed to assign copyeditor");
    }
    router.refresh();
    setLoading(null);
  };

  const completedCount = tasks.filter((t) => ["Completed", "Skipped"].includes(t.status)).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}
      {/* Copyediting section */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Copyediting</h2>
        {copyeditRecords.length > 0 ? (
          <div className="space-y-3">
            {copyeditRecords.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{rec.copyeditor.name}</p>
                  <p className="text-xs text-gray-400">Assigned {new Date(rec.assignedAt).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[rec.status] || STATUS_STYLES.Pending}`}>
                  {rec.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">No copyeditor assigned yet.</p>
            <div className="flex items-center gap-3">
              <label htmlFor="copyeditor-select" className="sr-only">Select copyeditor</label>
              <select
                id="copyeditor-select"
                aria-label="Select copyeditor"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>Select copyeditor...</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById("copyeditor-select") as HTMLSelectElement;
                  if (select.value) startCopyediting(select.value);
                }}
                disabled={loading === "copyedit"}
                className="rounded-lg bg-digital-red px-4 py-2 text-sm font-medium text-white hover:bg-cardinal disabled:opacity-50"
              >
                {loading === "copyedit" ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Production pipeline */}
      <section className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-cardinal">Production Pipeline</h2>
          {tasks.length > 0 && (
            <span className="text-sm text-gray-500">{progress}% complete</span>
          )}
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
            <div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-4">No production pipeline created yet.</p>
            <button
              onClick={createPipeline}
              disabled={loading === "create"}
              className="rounded-lg bg-cardinal px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal disabled:opacity-50"
            >
              {loading === "create" ? "Creating..." : "Create Production Pipeline"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => {
              const isActive = task.status === "Pending" && (i === 0 || ["Completed", "Skipped"].includes(tasks[i - 1]?.status));
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    isActive ? "border-digital-red bg-red-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                      task.status === "Completed" ? "bg-green-500 text-white" :
                      task.status === "Skipped" ? "bg-gray-200 text-gray-400" :
                      isActive ? "bg-digital-red text-white" : "bg-gray-100 text-gray-400"
                    }`}>
                      {task.status === "Completed" ? "\u2713" : task.status === "Skipped" ? "\u2014" : i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{TASK_LABELS[task.type] || task.type}</p>
                      {task.assignee && <p className="text-xs text-gray-400">Assigned to {task.assignee.name}</p>}
                      {task.notes && <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                      {task.status}
                    </span>
                    {(isActive || task.status === "InProgress" || task.status === "AwaitingApproval") && (
                      <div className="flex gap-1">
                        {task.status === "Pending" && (
                          <button
                            onClick={() => updateTask(task.id, "InProgress")}
                            disabled={loading === task.id}
                            className="rounded px-2 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600"
                          >
                            Start
                          </button>
                        )}
                        {task.status === "InProgress" && (
                          <button
                            onClick={() => updateTask(task.id, "Completed")}
                            disabled={loading === task.id}
                            className="rounded px-2 py-1 text-xs bg-green-500 text-white hover:bg-green-600"
                          >
                            Complete
                          </button>
                        )}
                        {task.status === "AwaitingApproval" && (
                          <button
                            onClick={() => updateTask(task.id, "Completed")}
                            disabled={loading === task.id}
                            className="rounded px-2 py-1 text-xs bg-green-500 text-white hover:bg-green-600"
                          >
                            Approve
                          </button>
                        )}
                        {task.status !== "Completed" && task.status !== "Skipped" && (
                          <button
                            onClick={() => updateTask(task.id, "Skipped")}
                            disabled={loading === task.id}
                            className="rounded px-2 py-1 text-xs bg-gray-200 text-gray-600 hover:bg-gray-300"
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
