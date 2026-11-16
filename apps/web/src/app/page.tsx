import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-heading font-bold">Stanford Open Press</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-5xl font-heading font-bold tracking-tight sm:text-6xl">
            Scholarly publishing,{" "}
            <span className="text-brand-500">reimagined</span>
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto font-body">
            The modern, AI-powered open-source platform for journal management.
            Beautiful journals, frictionless peer review, and intelligent
            editorial workflows.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Start Your Journal
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium hover:border-white/40 transition-colors"
            >
              See Demo
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-brand-500 text-2xl">&#9889;</div>
              <h3 className="font-heading font-semibold text-lg mb-2">AI-Powered Review</h3>
              <p className="text-sm text-white/50">
                Smart reviewer matching, automated desk review, and deadline
                intelligence. Reduce editorial burden by 60%.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-brand-500 text-2xl">&#128218;</div>
              <h3 className="font-heading font-semibold text-lg mb-2">Complete Workflow</h3>
              <p className="text-sm text-white/50">
                Submission to publication in one platform. Every status change
                tracked, every stakeholder notified.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-brand-500 text-2xl">&#127760;</div>
              <h3 className="font-heading font-semibold text-lg mb-2">Open & Indexed</h3>
              <p className="text-sm text-white/50">
                Crossref DOIs, Google Scholar, DOAJ, PubMed. Your articles
                discoverable everywhere, automatically.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-white/40">
          Stanford Open Press — Open source scholarly publishing platform
        </div>
      </footer>
    </div>
  );
}
