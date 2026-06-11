/**
 * Fixed UUIDs for `spectra.catalog` seed rows (reproducible across envs).
 * `family` + `name` are enforced by UNIQUE; ids are stable for migrations and tests.
 */
export const CATALOG_IDS = {
  status: {
    pending: 'a0000001-0000-4000-8000-000000000001',
    active: 'a0000001-0000-4000-8000-000000000002',
    deleted: 'a0000001-0000-4000-8000-000000000003',
    archived: 'a0000001-0000-4000-8000-000000000004',
    restored: 'a0000001-0000-4000-8000-000000000005',
  },
  uploadStatus: {
    idle: 'a0000010-0000-4000-8000-000000000001',
    pending: 'a0000010-0000-4000-8000-000000000002',
    uploading: 'a0000010-0000-4000-8000-000000000003',
    processing: 'a0000010-0000-4000-8000-000000000004',
    success: 'a0000010-0000-4000-8000-000000000005',
    failed: 'a0000010-0000-4000-8000-000000000006',
    cancelled: 'a0000010-0000-4000-8000-000000000007',
    queued: 'a0000010-0000-4000-8000-000000000008',
    validating: 'a0000010-0000-4000-8000-000000000009',
    compressing: 'a0000010-0000-4000-8000-00000000000a',
    paused: 'a0000010-0000-4000-8000-00000000000b',
    retrying: 'a0000010-0000-4000-8000-00000000000c',
    partial: 'a0000010-0000-4000-8000-00000000000d',
    timeout: 'a0000010-0000-4000-8000-00000000000e',
    aborted: 'a0000010-0000-4000-8000-00000000000f',
    complete: 'a0000010-0000-4000-8000-000000000010',
  },
  uploadType: {
    image: 'a0000020-0000-4000-8000-000000000001',
    video: 'a0000020-0000-4000-8000-000000000002',
    archive: 'a0000020-0000-4000-8000-000000000003',
    code: 'a0000020-0000-4000-8000-000000000004',
    document: 'a0000020-0000-4000-8000-000000000005',
  },
  general: {
    reserved: 'a0000030-0000-4000-8000-000000000001',
  },
  /** `spectra.catalog` where `family = 'production_access_request_states'`. */
  productionAccessRequestStates: {
    pending: 'a0000040-0000-4000-8000-000000000001',
    needsInformation: 'a0000040-0000-4000-8000-000000000002',
    approved: 'a0000040-0000-4000-8000-000000000003',
    rejected: 'a0000040-0000-4000-8000-000000000004',
  },
  /** `spectra.catalog` where `family = 'user_principal'` (`users.principal_kind_id`). */
  userPrincipal: {
    portal: 'a0000050-0000-4000-8000-000000000001',
    staff: 'a0000050-0000-4000-8000-000000000002',
    internal: 'a0000050-0000-4000-8000-000000000003',
  },
  /** `spectra.catalog` where `family = 'webhook_request_states'`. */
  webhookRequestStates: {
    pending: 'a0000060-0000-4000-8000-000000000001',
    approved: 'a0000060-0000-4000-8000-000000000002',
    rejected: 'a0000060-0000-4000-8000-000000000003',
    disabled: 'a0000060-0000-4000-8000-000000000004',
  },
  /** `spectra.catalog` where `family = 'developer_ai_endpoint_lifecycle'`. */
  developerAiEndpointLifecycle: {
    draft: 'a0000070-0000-4000-8000-000000000001',
    active: 'a0000070-0000-4000-8000-000000000002',
    archived: 'a0000070-0000-4000-8000-000000000003',
  },
  /** `spectra.catalog` where `family = 'ai_endpoint_production_request_states'`. */
  aiEndpointProductionRequestStates: {
    pendingReview: 'a0000080-0000-4000-8000-000000000001',
    needsInformation: 'a0000080-0000-4000-8000-000000000002',
    awaitingUser: 'a0000080-0000-4000-8000-000000000003',
    approved: 'a0000080-0000-4000-8000-000000000004',
    rejected: 'a0000080-0000-4000-8000-000000000005',
  },
  /** `spectra.catalog` where `family = 'custom_endpoint_trust_tier'`. */
  customEndpointTrustTier: {
    standard: 'a0000090-0000-4000-8000-000000000001',
    low: 'a0000090-0000-4000-8000-000000000002',
    elevated: 'a0000090-0000-4000-8000-000000000003',
  },
} as const;
