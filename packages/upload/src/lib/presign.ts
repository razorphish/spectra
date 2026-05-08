import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { clampExpirySeconds } from './limits';

export interface PresignPutUrlArgs {
  bucket: string;
  key: string;
  contentType?: string;
  contentLength?: number;
  expiresInSeconds?: number;
  /** Provide your own client to share connection pools across requests. */
  client?: S3Client;
  /** Region used when no client is supplied. */
  region?: string;
}

export interface PresignPutUrlResult {
  url: string;
  expiresAt: Date;
  expiresInSeconds: number;
}

let sharedClient: S3Client | undefined;

function getDefaultClient(region?: string): S3Client {
  if (!sharedClient) {
    sharedClient = new S3Client({
      region: region ?? process.env['AWS_REGION'] ?? 'us-west-2',
    });
  }
  return sharedClient;
}

/** Reset the shared S3 client (tests only). */
export function resetUploadClient(): void {
  sharedClient = undefined;
}

/**
 * Mint a single-part PUT URL. The client must send the same `Content-Type`
 * (and `Content-Length` if provided) as we use here, otherwise S3 rejects
 * the request.
 */
export async function getPresignedPutUrl(
  args: PresignPutUrlArgs
): Promise<PresignPutUrlResult> {
  const expiresInSeconds = clampExpirySeconds(args.expiresInSeconds);
  const client = args.client ?? getDefaultClient(args.region);

  const command = new PutObjectCommand({
    Bucket: args.bucket,
    Key: args.key,
    ContentType: args.contentType,
    ContentLength: args.contentLength,
  });

  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return { url, expiresAt, expiresInSeconds };
}
