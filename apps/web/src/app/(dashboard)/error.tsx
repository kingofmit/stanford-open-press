"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { StanfordBar } from "@/components/app-header";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <StanfordBar />
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link href="/dashboard" className="text-lg font-heading font-bold text-cardinal">
            Stanford Open Press
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="mb-4 flex justify-center"><AlertTriangle className="h-10 w-10 text-cardinal" /></div>
        <h2 className="text-xl font-heading font-bold text-cardinal">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500">{error.message || "An unexpected error occurred"}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="rounded-lg bg-digital-red px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal transition-colors"
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
