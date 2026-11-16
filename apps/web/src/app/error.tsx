"use client";

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
        <div className="text-4xl mb-4">&#9888;&#65039;</div>
        <h2 className="text-xl font-heading font-bold text-navy-950">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
