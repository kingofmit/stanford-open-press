import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Stanford Identity Bar */}
      <div className="bg-cardinal text-white">
        <div className="mx-auto max-w-7xl px-6 py-1">
          <span className="text-xs font-sans font-medium tracking-wide">Stanford Open Press</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 rounded-lg border border-fog bg-white p-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-heading font-bold text-cardinal">
              Sign in to Stanford Open Press
            </h1>
            <p className="mt-2 text-sm text-cool-grey">
              Use your ORCID or email to continue
            </p>
          </div>
          <LoginForm />
          <div className="text-center pt-2">
            <Link href="/" className="text-sm text-cool-grey hover:text-cardinal transition-colors">
              &larr; Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
