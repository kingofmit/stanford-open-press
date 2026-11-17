"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserData {
  id: string;
  name: string;
  email: string;
  affiliation: string | null;
  orcid: string | null;
  bio: string | null;
  expertiseAreas: string[];
  reviewerAvailable: boolean;
  totalCompleted: number;
  totalDeclined: number;
  avgResponseDays: number | null;
  qualityScore: number | null;
  createdAt: Date;
}

export function ProfileForm({ user }: { user: UserData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(user.name);
  const [affiliation, setAffiliation] = useState(user.affiliation || "");
  const [bio, setBio] = useState(user.bio || "");
  const [expertiseAreas, setExpertiseAreas] = useState(user.expertiseAreas.join(", "));
  const [reviewerAvailable, setReviewerAvailable] = useState(user.reviewerAvailable);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/users/me/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        affiliation: affiliation || undefined,
        bio: bio || undefined,
        expertiseAreas: expertiseAreas
          ? expertiseAreas.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        reviewerAvailable,
      }),
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

      {/* Account info (read-only) */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Account</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ORCID</p>
            <p className="text-sm text-gray-900">{user.orcid || "Not connected"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Member since</p>
            <p className="text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </section>

      {/* Editable profile */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="affiliation" className="block text-sm font-medium text-gray-700 mb-1">Affiliation</label>
            <input
              id="affiliation"
              type="text"
              value={affiliation}
              onChange={(e) => { setAffiliation(e.target.value); setSaved(false); }}
              placeholder="Stanford University"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => { setBio(e.target.value); setSaved(false); }}
              rows={3}
              placeholder="Brief professional biography..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Reviewer profile */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-heading font-semibold text-cardinal mb-4">Reviewer Profile</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="expertise" className="block text-sm font-medium text-gray-700 mb-1">
              Expertise Areas <span className="text-gray-400 font-normal">(comma separated)</span>
            </label>
            <input
              id="expertise"
              type="text"
              value={expertiseAreas}
              onChange={(e) => { setExpertiseAreas(e.target.value); setSaved(false); }}
              placeholder="machine learning, computational biology, NLP"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-digital-red focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="available" className="flex items-center gap-3">
              <input
                id="available"
                type="checkbox"
                checked={reviewerAvailable}
                onChange={(e) => { setReviewerAvailable(e.target.checked); setSaved(false); }}
                className="h-4 w-4 accent-digital-red"
              />
              <span className="text-sm text-gray-700">Available for review requests</span>
            </label>
          </div>

          {/* Stats (read-only) */}
          {user.totalCompleted > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4 border-t">
              <div>
                <p className="text-xs text-gray-500">Reviews Completed</p>
                <p className="text-lg font-heading font-bold text-cardinal">{user.totalCompleted}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Response</p>
                <p className="text-lg font-heading font-bold text-cardinal">
                  {user.avgResponseDays ? `${Math.round(user.avgResponseDays)}d` : "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quality Score</p>
                <p className="text-lg font-heading font-bold text-cardinal">
                  {user.qualityScore ? Math.round(user.qualityScore) : "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Accept Rate</p>
                <p className="text-lg font-heading font-bold text-cardinal">
                  {user.totalCompleted + user.totalDeclined > 0
                    ? `${Math.round((user.totalCompleted / (user.totalCompleted + user.totalDeclined)) * 100)}%`
                    : "\u2014"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-cardinal">
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">Profile saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-digital-red px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
