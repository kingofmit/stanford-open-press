"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DecisionFormProps {
  submissionId: string;
  slug: string;
  currentStatus: string;
  reviewSummary: string[];
}

const DECISIONS = [
  { value: "Accept", label: "Accept", desc: "Publish as-is", color: "border-green-500 bg-green-50 text-green-700" },
  { value: "MinorRevision", label: "Minor Revision", desc: "Small changes needed", color: "border-yellow-500 bg-yellow-50 text-yellow-700" },
  { value: "MajorRevision", label: "Major Revision", desc: "Significant rework needed", color: "border-orange-500 bg-orange-50 text-orange-700" },
  { value: "Reject", label: "Reject", desc: "Does not meet standards", color: "border-red-500 bg-red-50 text-red-700" },
];

export function DecisionForm({ submissionId, slug, currentStatus, reviewSummary }: DecisionFormProps) {
  const router = useRouter();
  const [decision, setDecision] = useState("");
  const [commentsToAuthor, setCommentsToAuthor] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [revisionDays, setRevisionDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Count reviewer recommendations
  const recCounts: Record<string, number> = {};
  reviewSummary.forEach((r) => { recCounts[r] = (recCounts[r] || 0) + 1; });

  const handleSubmit = async () => {
    setErrors([]);
    if (!decision) {
      setErrors(["Please select a decision"]);
      return;
    }

    setSubmitting(true);

    const res = await fetch(`/api/submissions/${submissionId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        commentsToAuthor: commentsToAuthor || undefined,
        internalNotes: internalNotes || undefined,
        revisionDeadlineDays: ["MinorRevision", "MajorRevision"].includes(decision)
          ? revisionDays
          : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed" }));
      setErrors([data.error || "Failed to record decision"]);
      setSubmitting(false);
      return;
    }

    router.push(`/editorial/${slug}`);
    router.refresh();
  };

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-6">
      <h2 className="text-lg font-heading font-semibold text-cardinal mb-2">Make Decision</h2>

      {/* Reviewer summary */}
      {Object.keys(recCounts).length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Reviewer recommendations:{" "}
          {Object.entries(recCounts).map(([rec, count]) => (
            <span key={rec} className="inline-block mr-2">
              {rec.replace(/([A-Z])/g, " $1").trim()} ({count})
            </span>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <ul className="list-inside list-disc text-sm text-red-700">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Decision buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        {DECISIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => setDecision(d.value)}
            className={`rounded-lg border-2 p-3 text-left transition-all ${
              decision === d.value ? d.color : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-medium">{d.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{d.desc}</p>
          </button>
        ))}
      </div>

      {/* Revision deadline */}
      {["MinorRevision", "MajorRevision"].includes(decision) && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Revision deadline (days)
          </label>
          <input
            type="number"
            value={revisionDays}
            onChange={(e) => setRevisionDays(parseInt(e.target.value) || 30)}
            min={7}
            max={180}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none"
          />
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Decision letter to author</label>
          <textarea
            value={commentsToAuthor}
            onChange={(e) => setCommentsToAuthor(e.target.value)}
            rows={6}
            placeholder="Dear Author, based on the reviews received..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal notes (not shared)</label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Any notes for the editorial team..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !decision}
        className="rounded-lg bg-cardinal px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal disabled:opacity-50 transition-colors"
      >
        {submitting ? "Recording..." : "Record Decision"}
      </button>
    </div>
  );
}
