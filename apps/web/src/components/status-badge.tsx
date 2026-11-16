import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Submitted: "bg-blue-100 text-blue-700",
  DeskReview: "bg-yellow-100 text-yellow-700",
  UnderReview: "bg-purple-100 text-purple-700",
  RevisionRequested: "bg-orange-100 text-orange-700",
  RevisionSubmitted: "bg-orange-50 text-orange-600",
  Accepted: "bg-green-100 text-green-700",
  InCopyediting: "bg-teal-100 text-teal-700",
  InProduction: "bg-indigo-100 text-indigo-700",
  Scheduled: "bg-cyan-100 text-cyan-700",
  Published: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Withdrawn: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  DeskReview: "Desk Review",
  UnderReview: "Under Review",
  RevisionRequested: "Revision Requested",
  RevisionSubmitted: "Revision Submitted",
  Accepted: "Accepted",
  InCopyediting: "In Copyediting",
  InProduction: "In Production",
  Scheduled: "Scheduled",
  Published: "Published",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] || "bg-gray-100 text-gray-700"
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
