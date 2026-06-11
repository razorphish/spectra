import { auditLogs, type SpectraDb } from '@spectra/database';

import { getSpectraRequestContext } from './spectra-request-context';

export type ParWorkflowAuditInput = {
  actorUserId: string | null;
  action: string;
  resource: string;
  payload: Record<string, unknown>;
};

export function recordParWorkflowAuditDeferred(db: SpectraDb, input: ParWorkflowAuditInput): void {
  const ctx = getSpectraRequestContext();
  const payload = {
    ...input.payload,
    requestId: ctx?.requestId,
    correlationId: ctx?.correlationId ?? ctx?.requestId,
  };
  setImmediate(() => {
    void db
      .insert(auditLogs)
      .values({
        actorUserId: input.actorUserId ?? undefined,
        action: input.action,
        resource: input.resource,
        payload,
      })
      .catch(() => {});
  });
}
