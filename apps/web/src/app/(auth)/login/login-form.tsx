"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, redirect: false });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="mb-4 flex justify-center"><Mail className="h-10 w-10 text-cardinal" /></div>
        <h2 className="text-lg font-heading font-semibold text-su-black">Check your email</h2>
        <p className="mt-2 text-sm text-cool-grey">
          We sent a sign-in link to <strong className="text-su-black">{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => signIn("orcid", { callbackUrl: "/dashboard" })}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-fog bg-white px-4 py-3 text-sm font-sans font-medium text-su-black hover:bg-gray-50 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
          <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0z" fill="#A6CE39"/>
          <path d="M86.3 186.2H70.9V79.1h15.4v107.1zM78.6 56.8c-5.7 0-10.3 4.6-10.3 10.3s4.6 10.3 10.3 10.3 10.3-4.6 10.3-10.3-4.6-10.3-10.3-10.3z" fill="#fff"/>
          <path d="M108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.7-43.7-39.7h-23.7v79.4z" fill="#fff"/>
        </svg>
        Sign in with ORCID
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-fog" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-4 text-cool-grey">or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-sans font-medium text-su-black mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            className="w-full rounded-md border border-fog bg-white px-4 py-2.5 text-sm text-su-black placeholder:text-stone focus:border-digital-red focus:outline-none focus:ring-1 focus:ring-digital-red"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-digital-red px-4 py-2.5 text-sm font-sans font-semibold text-white hover:bg-cardinal disabled:opacity-50 transition-colors"
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
      </form>
    </div>
  );
}
