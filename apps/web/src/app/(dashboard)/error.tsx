"use client";

import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link href="/dashboard" className="text-lg font-heading font-bold text-navy-950">
            Stanford Open Press
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="text-4xl mb-4">&#9888;&#65039;</div>
        <h2 className="text-xl font-heading font-bold text-navy-950">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500">{error.message || "An unexpected error occurred"}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Try Again
          </button>
          <Link href="/dashboard" className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
