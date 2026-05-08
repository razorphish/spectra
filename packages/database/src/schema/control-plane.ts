import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** End-user or staff identity (IdP subject mapped here). */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)]
);

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgMemberships = pgTable(
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
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const oauthClients = pgTable(
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

export const redirectUris = pgTable('redirect_uris', {
  id: uuid('id').primaryKey().defaultRandom(),
  oauthClientId: uuid('oauth_client_id')
    .notNull()
    .references(() => oauthClients.id, { onDelete: 'cascade' }),
  uri: text('uri').notNull(),
});

export const scopes = pgTable(
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

export const applicationScopes = pgTable(
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

export const scopeRequests = pgTable('scope_requests', {
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

export const productionAccessRequests = pgTable('production_access_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  documents: jsonb('documents'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Key–value platform config (e.g. upload thresholds). */
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

export const uploads = pgTable('uploads', {
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
