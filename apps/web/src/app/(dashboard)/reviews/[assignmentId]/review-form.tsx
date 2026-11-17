"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Criterion = {
  id: string;
  label: string;
  description: string | null;
  minScore: number;
  maxScore: number;
  weight: number;
  required: boolean;
};

type ExistingScore = {
  criterionId: string;
  score: number;
  comment: string | null;
};

interface ReviewFormProps {
  assignmentId: string;
  criteria: Criterion[];
  existingScores: ExistingScore[];
  existingComments: string;
  existingEditorComments: string;
  existingRecommendation: string;
}

export function ReviewFormClient({
  assignmentId,
  criteria,
  existingScores,
  existingComments,
  existingEditorComments,
  existingRecommendation,
}: ReviewFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Build initial scores from existing or empty
  const initialScores: Record<string, { score: number; comment: string }> = {};
  for (const c of criteria) {
    const existing = existingScores.find((s) => s.criterionId === c.id);
    initialScores[c.id] = {
      score: existing?.score || 0,
      comment: existing?.comment || "",
    };
  }

  const [scores, setScores] = useState(initialScores);
  const [commentsToAuthor, setCommentsToAuthor] = useState(existingComments);
  const [commentsToEditor, setCommentsToEditor] = useState(existingEditorComments);
  const [recommendation, setRecommendation] = useState(existingRecommendation);

  const updateScore = (criterionId: string, score: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: { ...prev[criterionId], score } }));
  };

  const updateComment = (criterionId: string, comment: string) => {
    setScores((prev) => ({ ...prev, [criterionId]: { ...prev[criterionId], comment } }));
  };

  const handleSubmit = async () => {
    setErrors([]);
    const errs: string[] = [];

    // Validate
    for (const c of criteria) {
      if (c.required && (!scores[c.id] || scores[c.id].score === 0)) {
        errs.push(`Score for "${c.label}" is required`);
      }
    }
    if (!commentsToAuthor.trim()) errs.push("Comments to author are required");
    if (!recommendation) errs.push("Recommendation is required");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);

    const res = await fetch(`/api/reviews/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scores: Object.entries(scores)
          .filter(([, v]) => v.score > 0)
          .map(([criterionId, v]) => ({
            criterionId,
            score: v.score,
            comment: v.comment || undefined,
          })),
        commentsToAuthor,
        commentsToEditor: commentsToEditor || undefined,
        recommendation,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Submission failed" }));
      setErrors([data.error || "Failed to submit review"]);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard?reviewSubmitted=true");
  };

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <ul className="list-inside list-disc text-sm text-red-700">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Criteria scoring */}
      {criteria.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Evaluation Criteria</h2>
          <div className="space-y-6">
            {criteria.map((c) => (
              <div key={c.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      {c.label} {c.required && <span className="text-red-500">*</span>}
                    </label>
                    {c.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">Weight: {c.weight}x</span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: c.maxScore - c.minScore + 1 }, (_, i) => c.minScore + i).map((val) => (
                    <button
                      key={val}
                      onClick={() => updateScore(c.id, val)}
                      className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                        scores[c.id]?.score === val
                          ? "bg-digital-red text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-gray-400">
                    {c.minScore}=poor, {c.maxScore}=excellent
                  </span>
                </div>
                <input
                  type="text"
                  placeholder={`Comment on ${c.label.toLowerCase()} (optional)`}
                  value={scores[c.id]?.comment || ""}
                  onChange={(e) => updateComment(c.id, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-digital-red focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Comments</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments to Author <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">These will be shared with the author</p>
            <textarea
              value={commentsToAuthor}
              onChange={(e) => setCommentsToAuthor(e.target.value)}
              rows={8}
              placeholder="Provide constructive feedback on the manuscript..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none focus:ring-1 focus:ring-digital-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confidential Comments to Editor
            </label>
            <p className="text-xs text-gray-400 mb-2">Only the editor will see these</p>
            <textarea
              value={commentsToEditor}
              onChange={(e) => setCommentsToEditor(e.target.value)}
              rows={4}
              placeholder="Any confidential remarks for the editor..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none focus:ring-1 focus:ring-digital-red"
            />
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">
          Recommendation <span className="text-red-500">*</span>
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "Accept", label: "Accept", color: "border-green-500 bg-green-50 text-green-700" },
            { value: "MinorRevision", label: "Minor Revision", color: "border-yellow-500 bg-yellow-50 text-yellow-700" },
            { value: "MajorRevision", label: "Major Revision", color: "border-orange-500 bg-orange-50 text-orange-700" },
            { value: "Reject", label: "Reject", color: "border-red-500 bg-red-50 text-red-700" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRecommendation(opt.value)}
              className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                recommendation === opt.value
                  ? opt.color
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-digital-red px-8 py-3 text-sm font-medium text-white hover:bg-cardinal disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
