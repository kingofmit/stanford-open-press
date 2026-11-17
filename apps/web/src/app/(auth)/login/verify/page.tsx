import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata = {
  title: "Check Your Email",
};

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-cardinal text-white">
        <div className="mx-auto max-w-7xl px-6 py-1">
          <span className="text-xs font-sans font-medium tracking-wide">Stanford Open Press</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-fog bg-white p-8 text-center shadow-lg">
          <div className="flex justify-center"><Mail className="h-10 w-10 text-cardinal" /></div>
          <h1 className="text-2xl font-heading font-bold text-cardinal">
            Check your email
          </h1>
          <p className="text-sm text-cool-grey">
            A sign-in link has been sent to your email address.
            Click the link to complete your sign-in.
          </p>
          <p className="text-xs text-stone">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <Link href="/login" className="text-digital-red hover:text-cardinal underline">
              try again
            </Link>.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="text-sm text-digital-red hover:text-cardinal transition-colors"
            >
              &larr; Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
