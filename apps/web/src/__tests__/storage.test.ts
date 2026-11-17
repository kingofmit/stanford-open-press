import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalStorageAdapter } from "@/lib/storage/local";
import { storageKey } from "@/lib/storage/types";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("storageKey", () => {
  it("generates correct path", () => {
    const key = storageKey("journal1", "sub1", 1, "manuscript.pdf");
    expect(key).toBe("journal1/sub1/v1/manuscript.pdf");
  });

  it("handles version numbers", () => {
    const key = storageKey("j", "s", 3, "file.docx");
    expect(key).toBe("j/s/v3/file.docx");
  });
});

describe("LocalStorageAdapter", () => {
  let tempDir: string;
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "sop-test-"));
    adapter = new LocalStorageAdapter(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uploads and reads files", async () => {
    const data = Buffer.from("hello world");
    await adapter.upload("test/file.txt", data, "text/plain");
    expect(await adapter.exists("test/file.txt")).toBe(true);
  });

  it("deletes files", async () => {
    const data = Buffer.from("hello");
    await adapter.upload("test/delete.txt", data, "text/plain");
    expect(await adapter.exists("test/delete.txt")).toBe(true);

    await adapter.delete("test/delete.txt");
    expect(await adapter.exists("test/delete.txt")).toBe(false);
  });

  it("delete non-existent file does not throw", async () => {
    await expect(adapter.delete("nonexistent.txt")).resolves.not.toThrow();
  });

  it("exists returns false for missing files", async () => {
    expect(await adapter.exists("missing.txt")).toBe(false);
  });

  it("generates URL path", async () => {
    const url = await adapter.getUrl("journal/sub/v1/file.pdf");
    expect(url).toBe("/api/files/journal%2Fsub%2Fv1%2Ffile.pdf");
  });

  it("prevents path traversal", () => {
    expect(() => adapter.getFilePath("../../etc/passwd")).toThrow("Invalid file path");
    expect(() => adapter.getFilePath("../secret")).toThrow("Invalid file path");
  });

  it("allows nested paths within base", async () => {
    const data = Buffer.from("nested");
    await adapter.upload("a/b/c/file.txt", data, "text/plain");
    expect(await adapter.exists("a/b/c/file.txt")).toBe(true);
  });
});
