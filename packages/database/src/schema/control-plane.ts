import {
  boolean,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** All control-plane tables and Drizzle migrations journal live in this schema. */
export const spectra = pgSchema('spectra');

/** End-user or staff identity (IdP subject mapped here). */
export const users = spectra.table(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    /** Auth0 `sub` (or other IdP stable subject); nullable for legacy rows before first sync. */
    authSubject: text('auth_subject'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_email_uq').on(t.email),
    uniqueIndex('users_auth_subject_uq').on(t.authSubject),
  ]
);

export const orgs = spectra.table('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgMemberships = spectra.table(
  'org_memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.orgId] })]
);

/** Developer-registered API product within an org. */
export const applications = spectra.table('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const oauthClients = spectra.table(
  'oauth_clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    secretHash: text('secret_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('oauth_clients_client_id_uq').on(t.clientId)]
);

export const redirectUris = spectra.table('redirect_uris', {
  id: uuid('id').primaryKey().defaultRandom(),
  oauthClientId: uuid('oauth_client_id')
    .notNull()
    .references(() => oauthClients.id, { onDelete: 'cascade' }),
  uri: text('uri').notNull(),
});

export const scopes = spectra.table(
  'scopes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    version: text('version').notNull(),
    tier: text('tier').notNull(),
    requiresApproval: boolean('requires_approval').notNull().default(false),
  },
  (t) => [uniqueIndex('scopes_name_version_uq').on(t.name, t.version)]
);

export const applicationScopes = spectra.table(
  'application_scopes',
  {
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    scopeId: uuid('scope_id')
      .notNull()
      .references(() => scopes.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.applicationId, t.scopeId] })]
);

export const scopeRequests = spectra.table('scope_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  scopeId: uuid('scope_id')
    .notNull()
    .references(() => scopes.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  requestedByUserId: uuid('requested_by_user_id').references(() => users.id),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productionAccessRequests = spectra.table('production_access_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  documents: jsonb('documents'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = spectra.table('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Key–value platform config (e.g. upload thresholds). */
export const platformSettings = spectra.table('platform_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

export const uploads = spectra.table('uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => applications.id, {
    onDelete: 'set null',
  }),
  s3Bucket: text('s3_bucket').notNull(),
  s3Key: text('s3_key').notNull(),
  status: text('status').notNull(),
  bytesExpected: text('bytes_expected'),
  contentType: text('content_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
