import { buildUploadKey } from './key';
import {
  DEFAULT_MAX_BYTES,
  MAX_PRESIGN_EXPIRY_SECONDS,
  assertWithinSizeLimit,
  clampExpirySeconds,
} from './limits';

import { prepareInitUpload } from './upload';
import { resetUploadClient } from './presign';

const ORG = '11111111-1111-4111-8111-111111111111';
const APP = '22222222-2222-4222-8222-222222222222';
const UPLOAD = '33333333-3333-4333-8333-333333333333';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://example.invalid/put?signed=1'),
}));

describe('buildUploadKey', () => {
  it('uses no-app placeholder when applicationId is omitted', () => {
    expect(buildUploadKey({ orgId: ORG, uploadId: UPLOAD })).toBe(
      `org/${ORG}/app/no-app/${UPLOAD}`
    );
  });

  it('includes both ids when applicationId is provided', () => {
    expect(
      buildUploadKey({ orgId: ORG, applicationId: APP, uploadId: UPLOAD })
    ).toBe(`org/${ORG}/app/${APP}/${UPLOAD}`);
  });

  it('rejects non-UUID inputs', () => {
    expect(() => buildUploadKey({ orgId: 'not-a-uuid', uploadId: UPLOAD })).toThrow();
    expect(() => buildUploadKey({ orgId: ORG, uploadId: 'nope' })).toThrow();
  });

  it('appends a sanitised suffix', () => {
    expect(buildUploadKey({ orgId: ORG, uploadId: UPLOAD, suffix: 'file.pdf' })).toBe(
      `org/${ORG}/app/no-app/${UPLOAD}-file.pdf`
    );
    expect(() =>
      buildUploadKey({ orgId: ORG, uploadId: UPLOAD, suffix: 'bad/path' })
    ).toThrow();
  });
});

describe('limits', () => {
  it('rejects sizes above the ceiling (default 1 GiB)', () => {
    expect(() => assertWithinSizeLimit(DEFAULT_MAX_BYTES + 1)).toThrow();
    expect(() => assertWithinSizeLimit(0)).toThrow();
    expect(() => assertWithinSizeLimit(-10)).toThrow();
  });

  it('accepts sizes equal to the ceiling', () => {
    expect(() => assertWithinSizeLimit(DEFAULT_MAX_BYTES)).not.toThrow();
  });

  it('clamps expiry to the configured maximum', () => {
    expect(clampExpirySeconds(60)).toBe(60);
    expect(clampExpirySeconds(0)).toBeGreaterThan(0);
    expect(clampExpirySeconds(MAX_PRESIGN_EXPIRY_SECONDS + 100)).toBe(
      MAX_PRESIGN_EXPIRY_SECONDS
    );
  });
});

describe('prepareInitUpload', () => {
  beforeEach(() => {
    resetUploadClient();
    jest.clearAllMocks();
  });

  it('returns a presigned URL and a stable key', async () => {
    const result = await prepareInitUpload({
      orgId: ORG,
      applicationId: APP,
      bytesExpected: 1024,
      contentType: 'application/pdf',
      bucket: 'spectra-dev01-uploads',
      generateId: () => UPLOAD,
    });

    expect(result.uploadId).toBe(UPLOAD);
    expect(result.s3Bucket).toBe('spectra-dev01-uploads');
    expect(result.s3Key).toBe(`org/${ORG}/app/${APP}/${UPLOAD}`);
    expect(result.presignedPutUrl).toMatch(/^https?:\/\//);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects oversize requests', async () => {
    await expect(
      prepareInitUpload({
        orgId: ORG,
        bytesExpected: DEFAULT_MAX_BYTES + 1,
        bucket: 'b',
        generateId: () => UPLOAD,
      })
    ).rejects.toThrow();
  });
});
