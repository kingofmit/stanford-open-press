import { describe, it, expect, vi } from "vitest";

vi.mock("@stanford-press/database", () => ({
  prisma: {},
}));

import { renderTemplate, escapeHtml } from "@/lib/email";

describe("Email utilities", () => {
  describe("escapeHtml", () => {
    it("escapes HTML entities", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
      );
    });

    it("escapes ampersands", () => {
      expect(escapeHtml("A & B")).toBe("A &amp; B");
    });

    it("escapes quotes", () => {
      expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
    });

    it("returns empty string for empty input", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("does not double-escape", () => {
      expect(escapeHtml("&amp;")).toBe("&amp;amp;");
    });
  });

  describe("renderTemplate", () => {
    it("replaces variables", () => {
      const result = renderTemplate("Hello {{name}}, welcome to {{journal}}", {
        name: "Dr. Smith",
        journal: "Nature",
      });
      expect(result).toBe("Hello Dr. Smith, welcome to Nature");
    });

    it("escapes HTML in variables", () => {
      const result = renderTemplate("Title: {{title}}", {
        title: "<script>alert('xss')</script>",
      });
      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });

    it("leaves unmatched variables as-is", () => {
      const result = renderTemplate("Hello {{name}}, your {{unknown}} is ready", {
        name: "Jane",
      });
      expect(result).toBe("Hello Jane, your {{unknown}} is ready");
    });

    it("handles empty variables object", () => {
      const result = renderTemplate("Hello {{name}}", {});
      expect(result).toBe("Hello {{name}}");
    });

    it("handles template with no variables", () => {
      const result = renderTemplate("Plain text", { name: "Jane" });
      expect(result).toBe("Plain text");
    });
  });
});
