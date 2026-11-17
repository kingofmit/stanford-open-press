"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchForm({ slug, initialQuery }: { slug: string; initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/${slug}/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <label htmlFor="search-input" className="sr-only">Search articles</label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search articles by title, abstract, keyword, or author..."
        aria-label="Search articles"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-digital-red focus:outline-none focus:ring-1 focus:ring-digital-red"
      />
      <button
        type="submit"
        aria-label="Search"
        className="rounded-lg bg-digital-red px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal transition-colors"
      >
        Search
      </button>
    </form>
  );
}
