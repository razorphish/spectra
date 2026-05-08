/**
 * Public shape of an init-upload request from a SPA / API client.
 *
 * Validated by `aviate-api` before we touch S3 — anything past `bytesExpected`
 * is metadata we forward to the Neon `uploads` row for downstream consumers.
 */
export interface InitUploadRequest {
  orgId: string;
  applicationId?: string;
  /** MIME type the client expects to PUT. */
  contentType?: string;
  /** Expected size in bytes. Validated against `maxBytes`. */
  bytesExpected: number;
  /** Optional original filename — only stored for human reference. */
  filename?: string;
}

/** Persisted next to the S3 object as response metadata. */
export interface UploadObjectMeta {
  /** Stable internal upload ID (UUID). Mirrored as the row PK. */
  uploadId: string;
  s3Bucket: string;
  s3Key: string;
}

/**
 * Init-upload response. The client does a single `PUT` against
 * `presignedPutUrl` and never sees AWS credentials.
 */
export interface InitUploadResponse extends UploadObjectMeta {
  presignedPutUrl: string;
  /** Wall-clock expiry (ISO 8601). */
  expiresAt: string;
}

/** Future "upload completed" notification (multipart / async pipeline). */
export interface CompleteUploadRequest extends UploadObjectMeta {
  bytesActual: number;
  etag: string;
}
