import { describe, it, expect, vi } from "vitest";

vi.mock("@stanford-press/database", () => ({
  prisma: {},
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { apiError } from "@/lib/api";

describe("API utilities", () => {
  describe("apiError", () => {
    it("returns JSON response with error message", async () => {
      const response = apiError("Not found", 404);
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Not found");
    });

    it("defaults to 400 status", async () => {
      const response = apiError("Bad request");
      expect(response.status).toBe(400);
    });
  });
});
