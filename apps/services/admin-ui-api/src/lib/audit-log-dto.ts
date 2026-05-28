/** Row shape from listAuditLogs Drizzle select. */
export type AuditLogListRow = {
  id: string;
  action: string;
  resource: string;
  payload: unknown;
  createdAt: Date;
  actorUserId: string | null;
  userEmail: string | null;
};

/** Vital Woman Reset–style admin log DTO (`adminList` response item). */
export type AdminAuditLogDto = {
  id: string;
  level: string;
  message: string;
  context: string | null;
  sessionId: string | null;
  userId: string | null;
  module: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export function mapAuditLogRowToAdminDto(row: AuditLogListRow): AdminAuditLogDto {
  const payload = row.payload as Record<string, unknown> | null;
  const level =
    payload && typeof payload['level'] === 'string' ? payload['level'] : 'INFO';
  const payloadModule =
    payload && typeof payload['module'] === 'string' ?
      payload['module']
    : 'control-plane';

  return {
    id: row.id,
    level,
    message: `${row.action} · ${row.resource}`,
    context: null,
    sessionId: null,
    userId: row.actorUserId,
    module: payloadModule,
    action: row.action,
    metadata: row.payload,
    createdAt: row.createdAt,
    createdBy: null,
    updatedAt: null,
    updatedBy: null,
    user:
      row.actorUserId && row.userEmail ?
        {
          id: row.actorUserId,
          email: row.userEmail,
          firstName: null,
          lastName: null,
        }
      : null,
  };
}
