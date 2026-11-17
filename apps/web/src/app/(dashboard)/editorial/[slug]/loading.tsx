import { StanfordBar } from "@/components/app-header";

export default function EditorialLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <StanfordBar />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
            <span className="text-gray-300">/</span>
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-white p-4">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-white p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 h-48 animate-pulse" />
            <div className="rounded-xl border bg-white p-4 h-48 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
