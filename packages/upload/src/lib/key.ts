/**
 * Object key layout: `org/<orgId>/app/<appId>/<uploadId>[-<suffix>]`.
 *
 * Keys never include the original filename so we can rotate / regenerate
 * without breaking S3-side analytics.
 */
export interface BuildUploadKeyArgs {
  orgId: string;
  applicationId?: string;
  uploadId: string;
  /** Optional suffix (e.g. file extension `.pdf`); sanitised to a-z0-9._-. */
  suffix?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SUFFIX_RE = /^[a-zA-Z0-9._-]{0,32}$/;

export function buildUploadKey({
  orgId,
  applicationId,
  uploadId,
  suffix,
}: BuildUploadKeyArgs): string {
  if (!UUID_RE.test(orgId)) {
    throw new Error(`Invalid orgId: ${orgId}`);
  }
  if (!UUID_RE.test(uploadId)) {
    throw new Error(`Invalid uploadId: ${uploadId}`);
  }
  if (applicationId !== undefined && !UUID_RE.test(applicationId)) {
    throw new Error(`Invalid applicationId: ${applicationId}`);
  }
  if (suffix !== undefined && !SUFFIX_RE.test(suffix)) {
    throw new Error(`Invalid suffix: ${suffix}`);
  }

  const appSeg = applicationId ?? 'no-app';
  const tail = suffix ? `${uploadId}-${suffix}` : uploadId;
  return `org/${orgId}/app/${appSeg}/${tail}`;
}
