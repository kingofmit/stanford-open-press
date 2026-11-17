"use client";

import { useState } from "react";

export function InviteButton({
  submissionId,
  reviewerId,
}: {
  submissionId: string;
  reviewerId: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function handleInvite() {
    setStatus("loading");
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 21); // 3-week deadline

      const res = await fetch(`/api/submissions/${submissionId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerId,
          deadline: deadline.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to invite");
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (status === "sent") {
    return (
      <span className="shrink-0 rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
        Invited
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInvite}
      disabled={status === "loading"}
      className="shrink-0 rounded-lg bg-digital-red px-3 py-1 text-xs font-medium text-white hover:bg-cardinal transition-colors disabled:opacity-50"
    >
      {status === "loading" ? "..." : status === "error" ? "Failed" : "Invite"}
    </button>
  );
}
