import Link from "next/link";

export const metadata = {
  title: "Authentication Error",
};

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-4xl">&#9888;&#65039;</div>
        <h1 className="text-2xl font-heading font-bold text-white">
          Authentication Error
        </h1>
        <p className="text-sm text-white/50">
          There was a problem signing you in. Please try again.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
