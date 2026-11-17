import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Authentication Error",
};

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-cardinal text-white">
        <div className="mx-auto max-w-7xl px-6 py-1">
          <span className="text-xs font-sans font-medium tracking-wide">Stanford Open Press</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-fog bg-white p-8 text-center shadow-lg">
          <div className="flex justify-center"><AlertTriangle className="h-10 w-10 text-cardinal" /></div>
          <h1 className="text-2xl font-heading font-bold text-cardinal">
            Authentication Error
          </h1>
          <p className="text-sm text-cool-grey">
            There was a problem signing you in. Please try again.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-digital-red px-6 py-2.5 text-sm font-sans font-semibold text-white hover:bg-cardinal transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
