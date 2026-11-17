import { describe, it, expect, vi } from "vitest";

vi.mock("@stanford-press/database", () => ({
  prisma: {
    roleAssignment: {
      findFirst: vi.fn(),
    },
  },
}));

// Test that the module exports the expected functions
describe("Authorization module", () => {
  it("exports isJournalEditor", async () => {
    const mod = await import("@/lib/authorization");
    expect(typeof mod.isJournalEditor).toBe("function");
  });

  it("exports isJournalAdmin", async () => {
    const mod = await import("@/lib/authorization");
    expect(typeof mod.isJournalAdmin).toBe("function");
  });

  it("exports isAnyEditor", async () => {
    const mod = await import("@/lib/authorization");
    expect(typeof mod.isAnyEditor).toBe("function");
  });
});
