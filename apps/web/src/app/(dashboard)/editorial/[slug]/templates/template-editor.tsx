"use client";

import { useState } from "react";

interface Template {
  id: string;
  eventKey: string;
  subject: string;
  body: string;
  enabled: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  "submission.acknowledged": "Submission Acknowledged",
  "reviewer.invitation": "Reviewer Invitation",
  "decision.made": "Decision Notification",
  "revision.requested": "Revision Requested",
};

const AVAILABLE_VARIABLES: Record<string, string[]> = {
  "submission.acknowledged": ["authorName", "title", "journalName", "submissionId"],
  "reviewer.invitation": ["reviewerName", "title", "abstract", "journalName", "deadline", "editorName", "acceptUrl", "declineUrl"],
  "decision.made": ["authorName", "title", "journalName", "decision", "comments", "editorName"],
  "revision.requested": ["authorName", "title", "journalName", "deadline", "comments", "editorName"],
};

export function TemplateEditor({ journalId, templates }: { journalId: string; templates: Template[] }) {
  const [selected, setSelected] = useState<string>(templates[0]?.id || "");
  const [editing, setEditing] = useState<Record<string, { subject: string; body: string; enabled: boolean }>>(() => {
    const map: Record<string, { subject: string; body: string; enabled: boolean }> = {};
    templates.forEach((t) => { map[t.id] = { subject: t.subject, body: t.body, enabled: t.enabled }; });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const current = templates.find((t) => t.id === selected);
  const currentEdit = selected ? editing[selected] : null;
  const variables = current ? AVAILABLE_VARIABLES[current.eventKey] || [] : [];

  const updateField = (field: string, value: string | boolean) => {
    if (!selected) return;
    setEditing((prev) => ({
      ...prev,
      [selected]: { ...prev[selected], [field]: value },
    }));
    setSaved(false);
  };

  // Simple preview rendering
  const renderPreview = () => {
    if (!currentEdit) return "";
    const sampleVars: Record<string, string> = {
      authorName: "Dr. Jane Smith",
      reviewerName: "Dr. John Doe",
      title: "Machine Learning in Scholarly Publishing",
      abstract: "This paper explores the application of...",
      journalName: "Journal of Open Science",
      submissionId: "abc123",
      deadline: "January 15, 2027",
      editorName: "Dr. Sarah Johnson",
      decision: "Minor Revision",
      comments: "The reviewers have provided constructive feedback...",
      acceptUrl: "#",
      declineUrl: "#",
    };
    return currentEdit.body.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleVars[key] || `{{${key}}}`);
  };

  const handleSave = async () => {
    if (!selected || !currentEdit) return;
    setSaving(true);

    const res = await fetch(`/api/journals/${journalId}/templates/${selected}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentEdit),
    });

    if (res.ok) {
      setSaved(true);
    }
    setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Template list */}
      <div className="space-y-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => { setSelected(t.id); setSaved(false); }}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${
              selected === t.id
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-medium text-navy-950">
              {EVENT_LABELS[t.eventKey] || t.eventKey}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{t.subject}</p>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        {currentEdit ? (
          <>
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-semibold text-navy-950">
                  {EVENT_LABELS[current?.eventKey || ""] || current?.eventKey}
                </h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={currentEdit.enabled}
                    onChange={(e) => updateField("enabled", e.target.checked)}
                    className="accent-brand-500"
                  />
                  Enabled
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={currentEdit.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea
                  value={currentEdit.body}
                  onChange={(e) => updateField("body", e.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Available variables */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Available Variables (click to insert):</p>
                <div className="flex flex-wrap gap-1">
                  {variables.map((v) => (
                    <button
                      key={v}
                      onClick={() => updateField("body", currentEdit.body + `{{${v}}}`)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="text-sm font-heading font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h3>
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {renderPreview()}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-between">
              {saved && <span className="text-sm text-green-600">Template saved</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-auto rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
            Select a template to edit
          </div>
        )}
      </div>
    </div>
  );
}
