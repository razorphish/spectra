import { Router } from 'express';
import type { RequestHandler } from 'express';

import {
  createUploadRow,
  getDb,
  resolveSpectraDatabaseUrl,
} from '@spectra/database';
import {
  DEFAULT_MAX_BYTES,
  prepareInitUpload,
} from '@spectra/upload';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface InitUploadBody {
  orgId?: unknown;
  applicationId?: unknown;
  bytesExpected?: unknown;
  contentType?: unknown;
  filename?: unknown;
}

function badRequest(res: Parameters<RequestHandler>[1], message: string) {
  res.status(400).json({ error: 'invalid_request', message });
}

const initUpload: RequestHandler = async (req, res) => {
  const body: InitUploadBody = (req.body ?? {}) as InitUploadBody;

  const orgId = typeof body.orgId === 'string' ? body.orgId : '';
  if (!UUID_RE.test(orgId)) {
    badRequest(res, 'orgId must be a UUID');
    return;
  }

  let applicationId: string | undefined;
  if (body.applicationId !== undefined && body.applicationId !== null) {
    if (typeof body.applicationId !== 'string' || !UUID_RE.test(body.applicationId)) {
      badRequest(res, 'applicationId must be a UUID when provided');
      return;
    }
    applicationId = body.applicationId;
  }

  if (typeof body.bytesExpected !== 'number' || !Number.isFinite(body.bytesExpected)) {
    badRequest(res, 'bytesExpected must be a positive number');
    return;
  }

  const contentType =
    typeof body.contentType === 'string' && body.contentType.length > 0
      ? body.contentType
      : undefined;

  const bucket =
    process.env['SPECTRA_UPLOADS_BUCKET'] ??
    process.env['UPLOADS_BUCKET_NAME'] ??
    '';
  if (!bucket) {
    res.status(503).json({
      error: 'uploads_not_configured',
      message:
        'SPECTRA_UPLOADS_BUCKET (or UPLOADS_BUCKET_NAME) must be set on this environment',
    });
    return;
  }

  try {
    const init = await prepareInitUpload({
      orgId,
      applicationId,
      bytesExpected: body.bytesExpected,
      contentType,
      bucket,
      maxBytes: DEFAULT_MAX_BYTES,
      region: process.env['AWS_REGION'],
    });

    // Persist the row when Neon is reachable. Best-effort: if the insert
    // fails we still return the URL so the SQS consumer can be the source of
    // truth; the API should be wrapped in a transactional helper as soon as
    // the upload pipeline lands a real consumer.
    const dbUrl = resolveSpectraDatabaseUrl();
    if (dbUrl) {
      try {
        await createUploadRow(getDb(), {
          uploadId: init.uploadId,
          orgId,
          applicationId,
          s3Bucket: init.s3Bucket,
          s3Key: init.s3Key,
          bytesExpected: body.bytesExpected,
          contentType,
        });
      } catch (err) {
        console.warn('[aviate-api] failed to persist uploads row', err);
      }
    }

    res.status(201).json(init);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    res.status(400).json({ error: 'init_failed', message });
  }
};

export function createUploadsRouter() {
  const r = Router();
  r.post('/init', initUpload);
  return r;
}
