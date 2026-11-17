"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Journal {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
  issn: string | null;
  eissn: string | null;
  doiPrefix: string | null;
  peerReviewType: string;
  licenseType: string;
  copyrightPolicy: string;
  apcAmount: number | null;
  apcCurrency: string;
  primaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
}

export function JournalSettingsForm({ journal, slug }: { journal: Journal; slug: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: journal.name,
    abbreviation: journal.abbreviation || "",
    description: journal.description || "",
    issn: journal.issn || "",
    eissn: journal.eissn || "",
    doiPrefix: journal.doiPrefix || "",
    peerReviewType: journal.peerReviewType,
    licenseType: journal.licenseType,
    copyrightPolicy: journal.copyrightPolicy,
    apcAmount: journal.apcAmount || 0,
    apcCurrency: journal.apcCurrency,
    primaryColor: journal.primaryColor,
    accentColor: journal.accentColor,
    headingFont: journal.headingFont,
    bodyFont: journal.bodyFont,
  });

  const update = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const res = await fetch(`/api/journals/${journal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Save failed" }));
      setError(data.error || "Failed to save");
    } else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* General */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">General</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Journal Name</label>
            <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
              <input type="text" value={form.abbreviation} onChange={(e) => update("abbreviation", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DOI Prefix</label>
              <input type="text" value={form.doiPrefix} onChange={(e) => update("doiPrefix", e.target.value)}
                placeholder="10.xxxxx" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Print ISSN</label>
              <input type="text" value={form.issn} onChange={(e) => update("issn", e.target.value)}
                placeholder="1234-5678" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Electronic ISSN</label>
              <input type="text" value={form.eissn} onChange={(e) => update("eissn", e.target.value)}
                placeholder="1234-5678" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Policies</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peer Review Type</label>
            <select value={form.peerReviewType} onChange={(e) => update("peerReviewType", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none">
              <option value="double-blind">Double Blind</option>
              <option value="single-blind">Single Blind</option>
              <option value="open">Open Review</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
            <select value={form.licenseType} onChange={(e) => update("licenseType", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none">
              <option value="CC-BY-4.0">CC BY 4.0</option>
              <option value="CC-BY-SA-4.0">CC BY-SA 4.0</option>
              <option value="CC-BY-NC-4.0">CC BY-NC 4.0</option>
              <option value="CC-BY-NC-ND-4.0">CC BY-NC-ND 4.0</option>
              <option value="CC0">CC0 (Public Domain)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Policy</label>
            <select value={form.copyrightPolicy} onChange={(e) => update("copyrightPolicy", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none">
              <option value="author-retains">Authors retain copyright</option>
              <option value="journal-owns">Journal owns copyright</option>
              <option value="shared">Shared copyright</option>
            </select>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Theme</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer" />
                <input type="text" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-digital-red focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer" />
                <input type="text" value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-digital-red focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heading Font</label>
              <select value={form.headingFont} onChange={(e) => update("headingFont", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none">
                <option value="Inter">Inter</option>
                <option value="Georgia">Georgia</option>
                <option value="Merriweather">Merriweather</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Roboto">Roboto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Font</label>
              <select value={form.bodyFont} onChange={(e) => update("bodyFont", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none">
                <option value="Source Serif Pro">Source Serif Pro</option>
                <option value="Georgia">Georgia</option>
                <option value="Lora">Lora</option>
                <option value="Noto Serif">Noto Serif</option>
                <option value="Inter">Inter</option>
              </select>
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-lg p-4 mt-4" style={{ backgroundColor: form.primaryColor }}>
            <p style={{ fontFamily: form.headingFont, color: "white", fontWeight: "bold" }}>
              Heading Preview
            </p>
            <p style={{ fontFamily: form.bodyFont, color: "rgba(255,255,255,0.7)", fontSize: "14px", marginTop: "4px" }}>
              Body text preview in your selected fonts.
            </p>
            <span style={{ backgroundColor: form.accentColor, color: "white", padding: "4px 12px", borderRadius: "4px", fontSize: "12px", display: "inline-block", marginTop: "8px" }}>
              Accent Button
            </span>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-between">
        <div>
          {saved && <span className="text-sm text-green-600">Settings saved successfully</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-digital-red px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
