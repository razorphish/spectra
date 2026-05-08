import { randomUUID } from 'node:crypto';

import { buildUploadKey } from './key';
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_PRESIGN_EXPIRY_SECONDS,
  assertWithinSizeLimit,
  clampExpirySeconds,
} from './limits';
import { getPresignedPutUrl } from './presign';
import type {
  InitUploadRequest,
  InitUploadResponse,
  UploadObjectMeta,
} from './types';

export interface PrepareInitUploadArgs extends InitUploadRequest {
  bucket: string;
  region?: string;
  /** Override the configured ceiling (defaults to 1 GiB). */
  maxBytes?: number;
  expiresInSeconds?: number;
  /** Override UUID generation (tests). */
  generateId?: () => string;
}

/**
 * Validate the request, build the canonical key, and mint a presigned PUT
 * URL. Returns everything the caller needs to (a) respond to the client
 * and (b) persist a Neon `uploads` row.
 */
export async function prepareInitUpload(
  args: PrepareInitUploadArgs
): Promise<InitUploadResponse> {
  assertWithinSizeLimit(args.bytesExpected, args.maxBytes ?? DEFAULT_MAX_BYTES);

  const expiresInSeconds = clampExpirySeconds(
    args.expiresInSeconds ?? DEFAULT_PRESIGN_EXPIRY_SECONDS
  );

  const uploadId = (args.generateId ?? randomUUID)();
  const s3Key = buildUploadKey({
    orgId: args.orgId,
    applicationId: args.applicationId,
    uploadId,
  });

  const { url, expiresAt } = await getPresignedPutUrl({
    bucket: args.bucket,
    key: s3Key,
    contentType: args.contentType,
    contentLength: args.bytesExpected,
    expiresInSeconds,
    region: args.region,
  });

  return {
    uploadId,
    s3Bucket: args.bucket,
    s3Key,
    presignedPutUrl: url,
    expiresAt: expiresAt.toISOString(),
  };
}

/** Convenience helper for callers that already have an upload row. */
export function toObjectMeta(input: {
  uploadId: string;
  s3Bucket: string;
  s3Key: string;
}): UploadObjectMeta {
  return {
    uploadId: input.uploadId,
    s3Bucket: input.s3Bucket,
    s3Key: input.s3Key,
  };
}
