import { sql, eq } from 'drizzle-orm';
import {
  boolean,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

import { CATALOG_IDS } from './catalog-seed-ids';

/** All control-plane tables and Drizzle migrations journal live in this schema. */
export const spectra = pgSchema('spectra');

const systemActorJsonbDefault = sql.raw(`'{"name":"SYSTEM","userId":null}'::jsonb`);

/**
 * Unified reference rows: lifecycle (`family=status`), upload pipeline (`upload_status`),
 * media kind (`upload_type`), reserved (`general`). Never use column name `type` here.
 */
export const catalog = spectra.table(
  'catalog',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    family: text('family').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [uniqueIndex('catalog_family_name_uq').on(t.family, t.name)]
);

/** End-user or staff identity (IdP subject mapped here). */
export const users = spectra.table(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    /** Auth0 `sub` (or other IdP stable subject); nullable for legacy rows before first sync. */
    authSubject: text('auth_subject'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('users_auth_subject_uq').on(t.authSubject),
    uniqueIndex('users_email_active_uq')
      .on(t.email)
      .where(eq(t.statusId, CATALOG_IDS.status.active)),
  ]
);

export const orgs = spectra.table('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  statusId: uuid('status_id')
    .notNull()
    .references(() => catalog.id, { onDelete: 'restrict' }),
  createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
  updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
});

export const orgMemberships = spectra.table(
  'org_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('org_memberships_user_org_active_uq')
      .on(t.userId, t.orgId)
      .where(eq(t.statusId, CATALOG_IDS.status.active)),
    index('org_memberships_user_id_idx').on(t.userId),
    index('org_memberships_org_id_idx').on(t.orgId),
    index('org_memberships_status_id_idx').on(t.statusId),
  ]
);

/** Developer-registered API product within an org. */
export const applications = spectra.table('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  statusId: uuid('status_id')
    .notNull()
    .references(() => catalog.id, { onDelete: 'restrict' }),
  createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
  updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
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
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
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
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    scopeId: uuid('scope_id')
      .notNull()
      .references(() => scopes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('application_scopes_app_scope_active_uq')
      .on(t.applicationId, t.scopeId)
      .where(eq(t.statusId, CATALOG_IDS.status.active)),
    index('application_scopes_application_id_idx').on(t.applicationId),
    index('application_scopes_status_id_idx').on(t.statusId),
  ]
);

export const scopeRequests = spectra.table(
  'scope_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    scopeId: uuid('scope_id')
      .notNull()
      .references(() => scopes.id, { onDelete: 'cascade' }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [index('scope_requests_status_id_idx').on(t.statusId)]
);

export const productionAccessRequests = spectra.table(
  'production_access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    documents: jsonb('documents'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [index('production_access_requests_status_id_idx').on(t.statusId)]
);

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

/**
 * Upload rows: `status_id` is the **naming exception** — it references `family=upload_status`
 * (pipeline), not `family=status`. Always resolve with `{ name, family }` in APIs.
 */
export const uploads = spectra.table(
  'uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),
    s3Bucket: text('s3_bucket').notNull(),
    s3Key: text('s3_key').notNull(),
    /** Pipeline state → `spectra.catalog` where `family = 'upload_status'`. */
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    /** Media classification → `spectra.catalog` where `family = 'upload_type'`. */
    typeId: uuid('type_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    bytesExpected: text('bytes_expected'),
    contentType: text('content_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    index('uploads_status_id_idx').on(t.statusId),
    index('uploads_type_id_idx').on(t.typeId),
    index('uploads_deleted_at_idx').on(t.deletedAt),
  ]
);

export { CATALOG_IDS } from './catalog-seed-ids';
