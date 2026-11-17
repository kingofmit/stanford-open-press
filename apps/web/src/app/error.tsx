"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="mb-4 flex justify-center"><AlertTriangle className="h-10 w-10 text-cardinal" /></div>
        <h2 className="text-xl font-heading font-bold text-cardinal">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-digital-red px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
