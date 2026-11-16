import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="text-center">
        <h1 className="text-6xl font-heading font-bold text-white">404</h1>
        <p className="mt-4 text-lg text-white/50">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
