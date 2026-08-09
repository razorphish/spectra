// Keep in sync with packages/database/src/schema/catalog-seed-ids.ts CATALOG_IDS.*

const DEVELOPER_AI_ENDPOINT_LIFECYCLE: Record<string, string> = {
  'a0000070-0000-4000-8000-000000000001': 'Draft',
  'a0000070-0000-4000-8000-000000000002': 'Active',
  'a0000070-0000-4000-8000-000000000003': 'Archived',
};

const AI_ENDPOINT_PRODUCTION_REQUEST_STATE: Record<string, string> = {
  'a0000080-0000-4000-8000-000000000001': 'Pending review',
  'a0000080-0000-4000-8000-000000000002': 'Needs information',
  'a0000080-0000-4000-8000-000000000003': 'Awaiting user',
  'a0000080-0000-4000-8000-000000000004': 'Approved',
  'a0000080-0000-4000-8000-000000000005': 'Rejected',
};

/** Generic catalog `family = status` (version rows, etc.). */
const GENERIC_STATUS: Record<string, string> = {
  'a0000001-0000-4000-8000-000000000001': 'Pending',
  'a0000001-0000-4000-8000-000000000002': 'Active',
  'a0000001-0000-4000-8000-000000000003': 'Deleted',
  'a0000001-0000-4000-8000-000000000004': 'Archived',
  'a0000001-0000-4000-8000-000000000005': 'Restored',
};

export function developerAiEndpointLifecycleLabel(statusId: string): string {
  const key = statusId.trim().toLowerCase();
  return DEVELOPER_AI_ENDPOINT_LIFECYCLE[key] ?? statusId;
}

export function aiEndpointProductionRequestStateLabel(statusId: string): string {
  const key = statusId.trim().toLowerCase();
  return AI_ENDPOINT_PRODUCTION_REQUEST_STATE[key] ?? statusId;
}

export function genericRowStatusLabel(statusId: string): string {
  const key = statusId.trim().toLowerCase();
  return GENERIC_STATUS[key] ?? statusId;
}
