"use client";

import { useState, useMemo } from "react";

interface Reviewer {
  id: string;
  name: string;
  email: string;
  affiliation: string | null;
  expertiseAreas: string[];
  totalCompleted: number;
  totalDeclined: number;
  avgResponseDays: number | null;
  qualityScore: number | null;
  reviewerAvailable: boolean;
  lastReviewDate: string | null;
  activeAssignments: number;
}

export function ReviewerPoolClient({
  reviewers,
  journalId,
  slug,
}: {
  reviewers: Reviewer[];
  journalId: string;
  slug: string;
}) {
  const [search, setSearch] = useState("");
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "completed" | "quality" | "response">("completed");

  const filtered = useMemo(() => {
    let result = reviewers;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.affiliation?.toLowerCase().includes(q) ||
          r.expertiseAreas.some((a) => a.toLowerCase().includes(q))
      );
    }

    if (filterAvailable) {
      result = result.filter((r) => r.reviewerAvailable && r.activeAssignments < 3);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "completed": return b.totalCompleted - a.totalCompleted;
        case "quality": return (b.qualityScore || 0) - (a.qualityScore || 0);
        case "response": return (a.avgResponseDays || 999) - (b.avgResponseDays || 999);
      }
    });

    return result;
  }, [reviewers, search, filterAvailable, sortBy]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label htmlFor="reviewer-search" className="sr-only">Search reviewers</label>
        <input
          id="reviewer-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, affiliation, or expertise..."
          aria-label="Search reviewers"
          className="flex-1 min-w-[300px] rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <label htmlFor="available-filter" className="flex items-center gap-2 text-sm text-gray-600">
          <input
            id="available-filter"
            type="checkbox"
            checked={filterAvailable}
            onChange={(e) => setFilterAvailable(e.target.checked)}
            className="accent-brand-500"
          />
          Available only
        </label>
        <label htmlFor="sort-select" className="sr-only">Sort reviewers</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          aria-label="Sort reviewers by"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="completed">Most Reviews</option>
          <option value="quality">Highest Quality</option>
          <option value="response">Fastest Response</option>
          <option value="name">Name</option>
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-4">Showing {filtered.length} of {reviewers.length} reviewers</p>

      {/* Reviewer list */}
      <div className="space-y-3">
        {filtered.map((reviewer) => (
          <div
            key={reviewer.id}
            className={`rounded-xl border bg-white p-4 ${
              !reviewer.reviewerAvailable ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold text-navy-950">{reviewer.name}</h3>
                  {reviewer.reviewerAvailable ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Available</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Unavailable</span>
                  )}
                  {reviewer.activeAssignments > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      {reviewer.activeAssignments} active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {reviewer.email}
                  {reviewer.affiliation && ` \u00b7 ${reviewer.affiliation}`}
                </p>
                {reviewer.expertiseAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {reviewer.expertiseAreas.map((area, i) => (
                      <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-center shrink-0">
                <div>
                  <p className="text-lg font-heading font-bold text-navy-950">{reviewer.totalCompleted}</p>
                  <p className="text-xs text-gray-400">Reviews</p>
                </div>
                {reviewer.qualityScore && (
                  <div>
                    <p className="text-lg font-heading font-bold text-navy-950">{Math.round(reviewer.qualityScore)}</p>
                    <p className="text-xs text-gray-400">Quality</p>
                  </div>
                )}
                {reviewer.avgResponseDays && (
                  <div>
                    <p className="text-lg font-heading font-bold text-navy-950">{Math.round(reviewer.avgResponseDays)}</p>
                    <p className="text-xs text-gray-400">Avg Days</p>
                  </div>
                )}
                <div>
                  <p className="text-lg font-heading font-bold text-navy-950">
                    {reviewer.totalCompleted + reviewer.totalDeclined > 0
                      ? Math.round((reviewer.totalCompleted / (reviewer.totalCompleted + reviewer.totalDeclined)) * 100)
                      : "\u2014"}
                    {reviewer.totalCompleted + reviewer.totalDeclined > 0 ? "%" : ""}
                  </p>
                  <p className="text-xs text-gray-400">Accept Rate</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No reviewers match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
