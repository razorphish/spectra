import type { SpectraDb } from './connection';
import { uploads } from '../schema';

export interface CreateUploadRowArgs {
  uploadId: string;
  orgId: string;
  applicationId?: string;
  s3Bucket: string;
  s3Key: string;
  bytesExpected: number;
  contentType?: string;
  /** Initial status — defaults to "pending" until the client PUT completes. */
  status?: string;
}

/**
 * Insert a new row into `uploads`. The PK is the upload ID generated upstream
 * (e.g. by `@spectra/upload`); we keep them in sync so the SQS consumer can
 * look up the row by S3 key alone.
 */
export async function createUploadRow(
  db: SpectraDb,
  args: CreateUploadRowArgs
) {
  const [row] = await db
    .insert(uploads)
    .values({
      id: args.uploadId,
      orgId: args.orgId,
      applicationId: args.applicationId,
      s3Bucket: args.s3Bucket,
      s3Key: args.s3Key,
      status: args.status ?? 'pending',
      bytesExpected: String(args.bytesExpected),
      contentType: args.contentType,
    })
    .returning();

  return row;
}
