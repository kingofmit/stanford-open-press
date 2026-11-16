export default function SubmissionDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div>
          <div className="h-7 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-6">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
