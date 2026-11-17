import Link from "next/link";
import { Sparkles, GitPullRequestArrow, Globe } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-su-black">
      {/* Stanford Identity Bar */}
      <div className="bg-cardinal text-white">
        <div className="mx-auto max-w-7xl px-6 py-1">
          <span className="text-xs font-sans font-medium tracking-wide">Stanford Open Press</span>
        </div>
      </div>

      <header className="border-b border-fog">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-heading font-bold text-cardinal">Stanford Open Press</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-sans text-cool-grey hover:text-cardinal transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-digital-red px-4 py-2 text-sm font-sans font-semibold text-white hover:bg-cardinal transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-cardinal">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Scholarly publishing,{" "}
              <span className="text-fog">reimagined</span>
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto font-body">
              The modern, AI-powered open-source platform for journal management.
              Beautiful journals, frictionless peer review, and intelligent
              editorial workflows.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="rounded-md bg-white px-6 py-3 text-sm font-sans font-semibold text-cardinal hover:bg-fog transition-colors"
              >
                Start Your Journal
              </Link>
              <Link
                href="/demo-journal"
                className="rounded-md border-2 border-white/40 px-6 py-3 text-sm font-sans font-semibold text-white hover:border-white hover:bg-white/10 transition-colors"
              >
                See Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-fog bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cardinal/10 text-cardinal"><Sparkles className="h-6 w-6" /></div>
              <h3 className="font-heading font-bold text-lg mb-2 text-su-black">AI-Powered Review</h3>
              <p className="text-sm text-cool-grey leading-relaxed">
                Smart reviewer matching, automated desk review, and deadline
                intelligence. Reduce editorial burden by 60%.
              </p>
            </div>
            <div className="rounded-lg border border-fog bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cardinal/10 text-cardinal"><GitPullRequestArrow className="h-6 w-6" /></div>
              <h3 className="font-heading font-bold text-lg mb-2 text-su-black">Complete Workflow</h3>
              <p className="text-sm text-cool-grey leading-relaxed">
                Submission to publication in one platform. Every status change
                tracked, every stakeholder notified.
              </p>
            </div>
            <div className="rounded-lg border border-fog bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cardinal/10 text-cardinal"><Globe className="h-6 w-6" /></div>
              <h3 className="font-heading font-bold text-lg mb-2 text-su-black">Open & Indexed</h3>
              <p className="text-sm text-cool-grey leading-relaxed">
                Crossref DOIs, Google Scholar, DOAJ, PubMed. Your articles
                discoverable everywhere, automatically.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-fog bg-su-black py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-stone">
          Stanford Open Press — Open source scholarly publishing platform
        </div>
      </footer>
    </div>
  );
}
