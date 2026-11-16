export const metadata = {
  title: "Check Your Email",
};

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-4xl">&#9993;</div>
        <h1 className="text-2xl font-heading font-bold text-white">
          Check your email
        </h1>
        <p className="text-sm text-white/50">
          A sign-in link has been sent to your email address.
          Click the link to complete your sign-in.
        </p>
        <p className="text-xs text-white/30">
          Didn&apos;t receive it? Check your spam folder or try again.
        </p>
      </div>
    </div>
  );
}
