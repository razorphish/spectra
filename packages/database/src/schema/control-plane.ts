import { sql, eq } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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
    /** Portal vs staff vs internal → `spectra.catalog` where `family = 'user_principal'`. */
    principalKindId: uuid('principal_kind_id')
      .notNull()
      .default(CATALOG_IDS.userPrincipal.portal)
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('users_auth_subject_uq').on(t.authSubject),
    uniqueIndex('users_email_active_uq')
      .on(t.email)
      .where(eq(t.statusId, CATALOG_IDS.status.active)),
    index('users_principal_kind_id_idx').on(t.principalKindId),
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

/** One personal org per sandbox developer (maps Auth0 user to org for applications). */
export const userDeveloperContext = spectra.table(
  'user_developer_context',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
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
    uniqueIndex('user_developer_context_org_id_uq')
      .on(t.orgId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

/** Developer-registered API product within an org. */
export const applications = spectra.table(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    companyWebsiteUrl: text('company_website_url'),
    privacyPolicyUrl: text('privacy_policy_url'),
    applicationTosUrl: text('application_tos_url'),
    supportEmail: text('support_email'),
    supportPhone: text('support_phone'),
    developmentContacts: text('development_contacts'),
    /** FK to uploads.id enforced in DB migration; avoids circular TS reference. */
    logoUploadId: uuid('logo_upload_id'),
    spectraTosAcceptedAt: timestamp('spectra_tos_accepted_at', { withTimezone: true }),
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
    uniqueIndex('applications_name_lower_active_uq')
      .on(sql`lower(trim(${t.name}))`)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const oauthClients = spectra.table(
  'oauth_clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    secretHash: text('secret_hash').notNull(),
    oauthClientType: text('oauth_client_type').notNull().default('confidential'),
    oauthGrantType: text('oauth_grant_type').notNull().default('authorization_code'),
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

/** Server-to-server integration (M2M); separate from browser `applications`. */
export const integrations = spectra.table(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
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
    index('integrations_org_id_idx').on(t.orgId),
    index('integrations_status_id_idx').on(t.statusId),
  ]
);

/** OAuth2 `client_credentials` client bound to one `integration` (MVP: one per integration). */
export const m2mOauthClients = spectra.table(
  'm2m_oauth_clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    integrationId: uuid('integration_id')
      .notNull()
      .references(() => integrations.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    secretHash: text('secret_hash').notNull(),
    /** Space-delimited OAuth scopes (ceiling for token requests). */
    grantedScopes: text('granted_scopes').notNull(),
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
    uniqueIndex('m2m_oauth_clients_client_id_uq').on(t.clientId),
    uniqueIndex('m2m_oauth_clients_integration_active_uq')
      .on(t.integrationId)
      .where(sql`${t.deletedAt} is null`),
    index('m2m_oauth_clients_integration_id_idx').on(t.integrationId),
  ]
);

/**
 * One row per successful M2M access token mint (append-only; `jti` matches JWT).
 * Exempt from full entity audit columns per M2M plan minimum schema.
 */
export const m2mTokenIssuanceLog = spectra.table(
  'm2m_token_issuance_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jti: text('jti').notNull(),
    m2mOauthClientId: uuid('m2m_oauth_client_id')
      .notNull()
      .references(() => m2mOauthClients.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('m2m_token_issuance_log_jti_uq').on(t.jti),
    index('m2m_token_issuance_log_client_issued_idx').on(t.m2mOauthClientId, t.issuedAt),
  ]
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
    applicationId: uuid('application_id').references(() => applications.id, {
      onDelete: 'cascade',
    }),
    integrationId: uuid('integration_id').references(() => integrations.id, {
      onDelete: 'cascade',
    }),
    submittedByUserId: uuid('submitted_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    documents: jsonb('documents'),
    customerStatusMessage: text('customer_status_message'),
    staffInternalNotes: text('staff_internal_notes'),
    publicReferenceToken: text('public_reference_token'),
    approvedM2mOauthClientId: uuid('approved_m2m_oauth_client_id').references(
      () => m2mOauthClients.id,
      { onDelete: 'set null' },
    ),
    approvedProductionOrgId: uuid('approved_production_org_id').references(() => orgs.id, {
      onDelete: 'set null',
    }),
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
    check(
      'production_access_requests_app_xor_integration_chk',
      sql`(${t.applicationId} IS NOT NULL AND ${t.integrationId} IS NULL) OR (${t.applicationId} IS NULL AND ${t.integrationId} IS NOT NULL)`,
    ),
    index('production_access_requests_status_id_idx').on(t.statusId),
    index('production_access_requests_integration_id_idx').on(t.integrationId),
    index('production_access_requests_submitted_by_user_id_idx').on(t.submittedByUserId),
    uniqueIndex('production_access_requests_public_reference_token_uq')
      .on(t.publicReferenceToken)
      .where(sql`${t.publicReferenceToken} IS NOT NULL`),
    uniqueIndex('production_access_requests_integration_open_uq')
      .on(t.integrationId)
      .where(
        sql`${t.integrationId} IS NOT NULL AND ${t.deletedAt} IS NULL AND ${t.statusId} IN (${sql.raw(`'${CATALOG_IDS.productionAccessRequestStates.pending}'::uuid`)}, ${sql.raw(`'${CATALOG_IDS.productionAccessRequestStates.needsInformation}'::uuid`)})`,
      ),
    uniqueIndex('production_access_requests_application_open_uq')
      .on(t.applicationId)
      .where(
        sql`${t.applicationId} IS NOT NULL AND ${t.deletedAt} IS NULL AND ${t.statusId} IN (${sql.raw(`'${CATALOG_IDS.productionAccessRequestStates.pending}'::uuid`)}, ${sql.raw(`'${CATALOG_IDS.productionAccessRequestStates.needsInformation}'::uuid`)})`,
      ),
  ],
);

/** In-app notification row (portal + staff surfaces). */
export const notifications = spectra.table(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'set null' }),
    category: text('category').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    metadata: jsonb('metadata'),
    dedupeKey: text('dedupe_key'),
    readAt: timestamp('read_at', { withTimezone: true }),
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
    uniqueIndex('notifications_dedupe_key_uq').on(t.dedupeKey).where(sql`${t.dedupeKey} IS NOT NULL`),
    index('notifications_recipient_read_created_idx').on(
      t.recipientUserId,
      t.readAt,
      t.createdAt,
    ),
    index('notifications_recipient_category_created_idx').on(
      t.recipientUserId,
      t.category,
      t.createdAt,
    ),
  ],
);

/** Integrator-submitted HTTPS callback; staff-approved before PAR approve delivery. */
export const sandboxOutboundWebhookRequests = spectra.table(
  'sandbox_outbound_webhook_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').references(() => applications.id, {
      onDelete: 'cascade',
    }),
    integrationId: uuid('integration_id').references(() => integrations.id, {
      onDelete: 'cascade',
    }),
    callbackUrl: text('callback_url').notNull(),
    description: text('description'),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    signingSecretHash: text('signing_secret_hash'),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
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
    check(
      'sandbox_outbound_webhook_requests_target_chk',
      sql`(${t.applicationId} IS NOT NULL AND ${t.integrationId} IS NULL) OR (${t.applicationId} IS NULL AND ${t.integrationId} IS NOT NULL)`,
    ),
    index('sandbox_outbound_webhook_requests_org_id_idx').on(t.orgId),
    index('sandbox_outbound_webhook_requests_integration_id_idx').on(t.integrationId),
    index('sandbox_outbound_webhook_requests_status_id_idx').on(t.statusId),
  ],
);

export const notificationOutbox = spectra.table(
  'notification_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dedupeKey: text('dedupe_key').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    lastError: text('last_error'),
  },
  (t) => [
    uniqueIndex('notification_outbox_dedupe_key_uq').on(t.dedupeKey),
    index('notification_outbox_processed_at_idx').on(t.processedAt),
  ],
);

export const auditLogs = spectra.table('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Append-only operational / application logs (stdout + optional DB transport).
 * `context` = request/correlation; domain data in `metadata` envelope (`attrs`, optional `sessionId` / `userId`).
 */
export const applicationLogs = spectra.table(
  'application_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    level: text('level').notNull(),
    message: text('message').notNull(),
    context: jsonb('context'),
    module: text('module'),
    action: text('action'),
    metadata: jsonb('metadata'),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('application_logs_created_at_idx').on(t.createdAt),
    index('application_logs_level_idx').on(t.level),
    index('application_logs_module_idx').on(t.module),
    index('application_logs_action_idx').on(t.action),
  ]
);

/** Key–value platform config (e.g. upload thresholds). */
export const platformSettings = spectra.table('platform_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

/** Staff-defined commercial / rate policy catalog for hosted custom endpoints (§10). */
export const pricingProfiles = spectra.table(
  'pricing_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    displayName: text('display_name').notNull(),
    policy: jsonb('policy').notNull().default(sql`'{}'::jsonb`),
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
  (t) => [index('pricing_profiles_status_id_idx').on(t.statusId)],
);

/** Org ↔ hosted API runtime tenant map (`id` is canonical `tenant_id`, GAP-7). */
export const runtimeTenants = spectra.table(
  'runtime_tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    defaultPricingProfileId: uuid('default_pricing_profile_id').references(
      () => pricingProfiles.id,
      { onDelete: 'set null' },
    ),
    customEndpointTrustTierId: uuid('custom_endpoint_trust_tier_id').references(
      () => catalog.id,
      { onDelete: 'set null' },
    ),
    displayName: text('display_name'),
    externalTenantRef: text('external_tenant_ref'),
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
    uniqueIndex('runtime_tenants_org_id_active_uq')
      .on(t.orgId)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex('runtime_tenants_org_external_ref_uq')
      .on(t.orgId, t.externalTenantRef)
      .where(sql`${t.externalTenantRef} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index('runtime_tenants_org_id_idx').on(t.orgId),
  ],
);

/** Staff-managed LLM catalog for sandbox AI generation (no plaintext secrets). */
export const aiLlmModels = spectra.table(
  'ai_llm_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    displayName: text('display_name').notNull(),
    provider: text('provider').notNull(),
    apiBaseUrl: text('api_base_url'),
    modelName: text('model_name').notNull(),
    maxTokens: integer('max_tokens'),
    jsonSchema: jsonb('json_schema'),
    promptHints: jsonb('prompt_hints'),
    secretRef: text('secret_ref'),
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
  (t) => [index('ai_llm_models_status_id_idx').on(t.statusId)],
);

export const developerAiEndpoints = spectra.table(
  'developer_ai_endpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    pricingProfileId: uuid('pricing_profile_id').references(() => pricingProfiles.id, {
      onDelete: 'set null',
    }),
    /** Pinned production revision (GAP-2); FK enforced in SQL migration only (circular with versions). */
    approvedProductionVersionId: uuid('approved_production_version_id'),
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
    uniqueIndex('developer_ai_endpoints_tenant_slug_active_uq')
      .on(t.tenantId, t.slug)
      .where(sql`${t.deletedAt} is null`),
    index('developer_ai_endpoints_tenant_id_status_idx').on(t.tenantId, t.statusId),
    index('developer_ai_endpoints_org_id_idx').on(t.orgId),
    index('developer_ai_endpoints_approved_version_idx').on(t.approvedProductionVersionId),
  ],
);

export const developerAiEndpointVersions = spectra.table(
  'developer_ai_endpoint_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => developerAiEndpoints.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    userPrompt: text('user_prompt').notNull(),
    modelId: uuid('model_id').references(() => aiLlmModels.id, { onDelete: 'set null' }),
    spec: jsonb('spec').notNull(),
    specSha256: text('spec_sha256'),
    llmRawResponse: text('llm_raw_response'),
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
    uniqueIndex('developer_ai_endpoint_versions_endpoint_revision_uq').on(t.endpointId, t.revision),
    index('developer_ai_endpoint_versions_endpoint_id_idx').on(t.endpointId),
  ],
);

export const aiEndpointProductionRequests = spectra.table(
  'ai_endpoint_production_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => developerAiEndpoints.id, { onDelete: 'cascade' }),
    endpointVersionId: uuid('endpoint_version_id')
      .notNull()
      .references(() => developerAiEndpointVersions.id, { onDelete: 'cascade' }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    staffVisibleRejectionReason: text('staff_visible_rejection_reason'),
    staffReasonCode: text('staff_reason_code'),
    internalStaffNotes: text('internal_staff_notes'),
    userFollowUp: jsonb('user_follow_up'),
    relatedIntegrationId: uuid('related_integration_id').references(() => integrations.id, {
      onDelete: 'set null',
    }),
    stepfunctionsExecutionArn: text('stepfunctions_execution_arn'),
    staffTaskTokenRef: text('staff_task_token_ref'),
    precheckSummary: jsonb('precheck_summary'),
    approvedSpecSha256: text('approved_spec_sha256'),
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
    index('ai_endpoint_production_requests_endpoint_id_idx').on(t.endpointId),
    index('ai_endpoint_production_requests_status_id_idx').on(t.statusId),
  ],
);

/** Append-only metering (minimal audit per product). */
export const usageEvents = spectra.table(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    endpointId: uuid('endpoint_id').references(() => developerAiEndpoints.id, {
      onDelete: 'set null',
    }),
    dimension: text('dimension').notNull(),
    quantity: integer('quantity').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    m2mClientId: text('m2m_client_id'),
    integrationId: uuid('integration_id').references(() => integrations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('usage_events_tenant_occurred_idx').on(t.tenantId, t.occurredAt),
    index('usage_events_endpoint_occurred_idx').on(t.endpointId, t.occurredAt),
  ],
);

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
