import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cardinal">
      <div className="text-center">
        <h1 className="text-6xl font-heading font-bold text-white">404</h1>
        <p className="mt-4 text-lg text-white/50">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-digital-red px-6 py-2.5 text-sm font-medium text-white hover:bg-cardinal transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
