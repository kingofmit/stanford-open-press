"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Journal {
  id: string;
  name: string;
  slug: string;
}

export function GlobalSearchForm({
  initialQuery,
  initialJournalId,
  journals,
}: {
  initialQuery: string;
  initialJournalId: string;
  journals: Journal[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [journalId, setJournalId] = useState(initialJournalId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    const params = new URLSearchParams({ q: query.trim() });
    if (journalId) params.set("journalId", journalId);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="global-search" className="sr-only">Search articles</label>
      <input
        id="global-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, abstract, keyword, or author..."
        aria-label="Search articles"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <label htmlFor="journal-filter" className="sr-only">Filter by journal</label>
      <select
        id="journal-filter"
        value={journalId}
        onChange={(e) => setJournalId(e.target.value)}
        aria-label="Filter by journal"
        className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:w-56"
      >
        <option value="">All Journals</option>
        {journals.map((j) => (
          <option key={j.id} value={j.id}>{j.name}</option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
