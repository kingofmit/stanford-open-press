import Link from "next/link";
import { Heart } from "lucide-react";

export const metadata = { title: "Review Declined" };

export default function ReviewDeclinedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cardinal">
      <div className="w-full max-w-md text-center text-white">
        <div className="mb-4 flex justify-center"><Heart className="h-10 w-10" /></div>
        <h1 className="text-2xl font-heading font-bold">Thank You</h1>
        <p className="mt-4 text-white/70">
          Your response has been recorded. We appreciate your time and hope to
          work with you in the future.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md bg-white/10 border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white/20 transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
