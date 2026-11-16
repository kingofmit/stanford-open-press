import { mkdir, writeFile, unlink, access } from "fs/promises";
import { dirname, join, resolve, relative } from "path";
import type { StorageAdapter } from "./types";

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  /** Resolve a key to a safe filesystem path, preventing directory traversal */
  private safePath(key: string): string {
    const resolved = resolve(this.basePath, key);
    const rel = relative(this.basePath, resolved);
    // If the relative path starts with ".." or is absolute, it's escaping the base
    if (rel.startsWith("..") || resolve(rel) === rel) {
      throw new Error("Invalid file path");
    }
    return resolved;
  }

  async upload(key: string, data: Buffer, _contentType: string): Promise<string> {
    const filePath = this.safePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return key;
  }

  async getUrl(key: string): Promise<string> {
    return `/api/files/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.safePath(key);
    try {
      await unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.safePath(key);
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFilePath(key: string): string {
    return this.safePath(key);
  }
}
