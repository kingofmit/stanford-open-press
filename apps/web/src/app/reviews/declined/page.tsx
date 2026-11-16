export const metadata = { title: "Review Declined" };

export default function ReviewDeclinedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="w-full max-w-md text-center text-white">
        <div className="text-4xl mb-4">&#128588;</div>
        <h1 className="text-2xl font-heading font-bold">Thank You</h1>
        <p className="mt-4 text-white/50">
          Your response has been recorded. We appreciate your time and hope to
          work with you in the future.
        </p>
      </div>
    </div>
  );
}
