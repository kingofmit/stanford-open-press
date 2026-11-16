import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-white/10 bg-white/5 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-white">
            Sign in to Stanford Open Press
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Use your ORCID or email to continue
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
