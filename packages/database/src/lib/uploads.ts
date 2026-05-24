import type { SpectraDb } from './connection';
import { CATALOG_IDS } from '../schema/catalog-seed-ids';
import { uploads } from '../schema';

export interface CreateUploadRowArgs {
  uploadId: string;
  orgId: string;
  applicationId?: string;
  s3Bucket: string;
  s3Key: string;
  bytesExpected: number;
  contentType?: string;
  /** Pipeline catalog `name` under `family = upload_status`; default `pending`. */
  pipelineStatusName?: keyof typeof CATALOG_IDS.uploadStatus;
  /** Override inferred `type_id` (must reference `family = upload_type`). */
  typeId?: string;
}

/** Map `Content-Type` to seeded `upload_type` catalog id. */
export function inferUploadTypeId(contentType?: string): string {
  if (!contentType?.trim()) {
    return CATALOG_IDS.uploadType.document;
  }
  const ct = contentType.toLowerCase();
  if (ct.startsWith('image/')) return CATALOG_IDS.uploadType.image;
  if (ct.startsWith('video/')) return CATALOG_IDS.uploadType.video;
  if (ct === 'application/zip' || ct === 'application/x-zip-compressed') {
    return CATALOG_IDS.uploadType.archive;
  }
  if (
    ct.startsWith('text/') ||
    ct.startsWith('application/javascript') ||
    ct.startsWith('application/json')
  ) {
    return CATALOG_IDS.uploadType.code;
  }
  return CATALOG_IDS.uploadType.document;
}

function resolvePipelineStatusId(
  name?: keyof typeof CATALOG_IDS.uploadStatus
): string {
  const key = name ?? 'pending';
  return CATALOG_IDS.uploadStatus[key];
}

/**
 * Insert a new row into `uploads`. The PK is the upload ID generated upstream
 * (e.g. by `@spectra/upload`); we keep them in sync so the SQS consumer can
 * look up the row by S3 key alone.
 */
export async function createUploadRow(db: SpectraDb, args: CreateUploadRowArgs) {
  const typeId = args.typeId ?? inferUploadTypeId(args.contentType);
  const statusId = resolvePipelineStatusId(args.pipelineStatusName);

  const [row] = await db
    .insert(uploads)
    .values({
      id: args.uploadId,
      orgId: args.orgId,
      applicationId: args.applicationId,
      s3Bucket: args.s3Bucket,
      s3Key: args.s3Key,
      statusId,
      typeId,
      bytesExpected: String(args.bytesExpected),
      contentType: args.contentType,
    })
    .returning();

  return row;
}
