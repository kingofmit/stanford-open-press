export interface StorageAdapter {
  /** Upload a file and return the storage path */
  upload(key: string, data: Buffer, contentType: string): Promise<string>;

  /** Get a presigned/public URL for downloading a file */
  getUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /** Delete a file */
  delete(key: string): Promise<void>;

  /** Check if a file exists */
  exists(key: string): Promise<boolean>;
}

export interface UploadResult {
  storagePath: string;
  url: string;
}

/** Generate a storage key for a submission file */
export function storageKey(
  journalId: string,
  submissionId: string,
  version: number,
  filename: string
): string {
  return `${journalId}/${submissionId}/v${version}/${filename}`;
}
