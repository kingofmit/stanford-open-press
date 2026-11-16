import { LocalStorageAdapter } from "./local";
import { S3StorageAdapter } from "./s3";
import type { StorageAdapter } from "./types";

export type { StorageAdapter, UploadResult } from "./types";
export { storageKey } from "./types";
export { LocalStorageAdapter } from "./local";
export { S3StorageAdapter } from "./s3";

let _storage: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (_storage) return _storage;

  if (process.env.S3_BUCKET) {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3_BUCKET is set but S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY is missing"
      );
    }

    _storage = new S3StorageAdapter({
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId,
      secretAccessKey,
    });
  } else {
    _storage = new LocalStorageAdapter(
      process.env.UPLOAD_DIR || "./uploads"
    );
  }

  return _storage;
}
