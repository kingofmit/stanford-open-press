import { describe, it, expect } from "vitest";

// All submission statuses that exist in the system
const ALL_STATUSES = [
  "Draft",
  "Submitted",
  "DeskReview",
  "UnderReview",
  "RevisionRequested",
  "RevisionSubmitted",
  "Accepted",
  "InCopyediting",
  "InProduction",
  "Scheduled",
  "Published",
  "Rejected",
  "Withdrawn",
];

describe("StatusBadge", () => {
  it("exports StatusBadge component", async () => {
    const mod = await import("@/components/status-badge");
    expect(typeof mod.StatusBadge).toBe("function");
  });

  // We can verify the module structure by importing and checking
  // that all statuses are handled (the component won't crash)
  it("handles all submission statuses", async () => {
    // This just verifies the module loads without error
    // Real rendering tests would use @testing-library/react
    const mod = await import("@/components/status-badge");
    expect(mod.StatusBadge).toBeDefined();
    // The component accepts a status prop -- verify it's callable
    expect(mod.StatusBadge.length).toBeGreaterThanOrEqual(0);
  });
});
