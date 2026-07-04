import { and, desc, eq, isNull, notExists } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';

import { createRequireAuth0AccessToken, isKnownM2mScope } from '@spectra/auth';
import {
  applications,
  buildActorJson,
  CATALOG_IDS,
  fetchProductionAccessPortalFlags,
  fetchSandboxAiPlatformSettings,
  getDb,
  integrations,
  m2mOauthClients,
  oauthClients,
  orgMemberships,
  orgs,
  parseDeveloperApplicationsUiEnabled,
  platformSettings,
  PLATFORM_DEVELOPER_APPLICATIONS_UI_KEY,
  redirectUris,
  resolveSpectraDatabaseUrl,
  userDeveloperContext,
  users,
} from '@spectra/database';

import { createSandboxPortalProductionAccessRouter } from './sandbox-portal-par';
import { createSandboxPortalAiRouter } from './sandbox-portal-ai';

import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../lib/sandbox-portal-crypto';
import {
  normalizeApplicationName,
  validateRedirectUri,
} from '../lib/sandbox-portal-validation';

const requireAuth0AccessToken = createRequireAuth0AccessToken({
  logLabel: 'aviate-api-sandbox',
});

function noDatabase(res: Parameters<RequestHandler>[1]): void {
  res.status(503).json({
    error: 'database_not_configured',
    message: 'Spectra database URL is not configured.',
  });
}

function extractEmail(claims: Record<string, unknown>): string | null {
  const direct = claims['email'];
  if (typeof direct === 'string' && direct.includes('@')) return direct.trim();
  for (const [k, v] of Object.entries(claims)) {
    if (k.endsWith('/email') && typeof v === 'string' && v.includes('@')) {
      return v.trim();
    }
  }
  return null;
}

function syntheticEmail(sub: string): string {
  const safe = sub.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 120);
  return `sandbox_${safe}@users.spectra.local`;
}

async function fetchDeveloperApplicationsUiEnabled(): Promise<boolean> {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) return false;
  const db = getDb();
  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, PLATFORM_DEVELOPER_APPLICATIONS_UI_KEY))
    .limit(1);
  return parseDeveloperApplicationsUiEnabled(row?.value);
}

const requireDeveloperApplicationsUi: RequestHandler = async (_req, res, next) => {
  try {
    const ok = await fetchDeveloperApplicationsUiEnabled();
    if (!ok) {
      res.status(403).json({
        error: 'feature_disabled',
        message: 'Sandbox applications are disabled for this deployment.',
      });
      return;
    }
    next();
  } catch {
    res.status(503).json({
      error: 'service_unavailable',
      message: 'Could not resolve developer portal feature flags.',
    });
  }
};

export async function ensureSession(
  sub: string,
  claims: Record<string, unknown>,
): Promise<{ userId: string; orgId: string; email: string } | null> {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) return null;
  const db = getDb();
  const email = extractEmail(claims) ?? syntheticEmail(sub);
  const actor = (uid: string | null) => buildActorJson({ name: email, userId: uid });

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.authSubject, sub), isNull(users.deletedAt)))
    .limit(1);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const inserted = await db
      .insert(users)
      .values({
        email,
        authSubject: sub,
        statusId: CATALOG_IDS.status.active,
        principalKindId: CATALOG_IDS.userPrincipal.portal,
        createdBy: actor(null),
        updatedBy: actor(null),
      })
      .returning();
    const u = inserted[0];
    if (!u) return null;
    userId = u.id;
  }

  const [ctx] = await db
    .select()
    .from(userDeveloperContext)
    .where(
      and(eq(userDeveloperContext.userId, userId), isNull(userDeveloperContext.deletedAt)),
    )
    .limit(1);
  if (ctx) {
    return { userId, orgId: ctx.orgId, email };
  }

  const orgName = `Developer — ${email}`;

  /** Reuse a prior bootstrap org that has no memberships (e.g. failed insert before `id` default existed). */
  const [orphanPersonalOrg] = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(
      and(
        eq(orgs.name, orgName),
        isNull(orgs.deletedAt),
        eq(orgs.statusId, CATALOG_IDS.status.active),
        notExists(
          db
            .select()
            .from(orgMemberships)
            .where(
              and(eq(orgMemberships.orgId, orgs.id), isNull(orgMemberships.deletedAt)),
            ),
        ),
      ),
    )
    .orderBy(desc(orgs.createdAt))
    .limit(1);

  let orgId: string;
  await db.transaction(async (tx) => {
    if (orphanPersonalOrg) {
      orgId = orphanPersonalOrg.id;
    } else {
      const orgRows = await tx
        .insert(orgs)
        .values({
          name: orgName,
          statusId: CATALOG_IDS.status.active,
          createdBy: actor(userId),
          updatedBy: actor(userId),
        })
        .returning();
      const org = orgRows[0];
      if (!org) throw new Error('orgs insert returned no row');
      orgId = org.id;
    }

    await tx.insert(orgMemberships).values({
      userId,
      orgId,
      role: 'owner',
      statusId: CATALOG_IDS.status.active,
      createdBy: actor(userId),
      updatedBy: actor(userId),
    });

    await tx.insert(userDeveloperContext).values({
      userId,
      orgId,
      statusId: CATALOG_IDS.status.active,
      createdBy: actor(userId),
      updatedBy: actor(userId),
    });
  });

  return { userId, orgId, email };
}

const session: RequestHandler = async (req, res) => {
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const claims = req.auth?.claims ?? {};
  const sessionRow = await ensureSession(sub, claims);
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not create developer session.' });
    return;
  }
  const developerApplicationsUiEnabled = await fetchDeveloperApplicationsUiEnabled();
  const db = getDb();
  const sandboxAiSettings = await fetchSandboxAiPlatformSettings(db);
  const parFlags = await fetchProductionAccessPortalFlags(db);
  res.json({
    ...sessionRow,
    developerApplicationsUiEnabled,
    productionAccessIntegratorPortalEnabled: parFlags.productionAccessIntegratorPortalEnabled,
    productionAccessStaffConsoleEnabled: parFlags.productionAccessStaffConsoleEnabled,
    productionAccessIntegratorCredentialsUiEnabled: parFlags.productionAccessIntegratorCredentialsUiEnabled,
    productionAccessReviewSlaBusinessDays: parFlags.productionAccessReviewSlaBusinessDays,
    productionAccessReviewSlaDisclaimer: parFlags.productionAccessReviewSlaDisclaimer,
    sandboxAiEndpointsEnabled: sandboxAiSettings.endpointsEnabled,
  });
};

const listApplications: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const db = getDb();
  const apps = await db
    .select({
      id: applications.id,
      name: applications.name,
      updatedAt: applications.updatedAt,
      clientId: oauthClients.clientId,
      oauthClientType: oauthClients.oauthClientType,
      oauthGrantType: oauthClients.oauthGrantType,
    })
    .from(applications)
    .innerJoin(
      oauthClients,
      and(
        eq(oauthClients.applicationId, applications.id),
        isNull(oauthClients.deletedAt),
      ),
    )
    .where(and(eq(applications.orgId, sessionRow.orgId), isNull(applications.deletedAt)))
    .orderBy(desc(applications.updatedAt));

  res.json({
    applications: apps.map((a) => ({
      id: a.id,
      name: a.name,
      updatedAt: a.updatedAt,
      clientId: a.clientId,
      hasClientSecret: true,
      oauthClientType: a.oauthClientType,
      oauthGrantType: a.oauthGrantType,
    })),
  });
};

type CreateBody = {
  name?: unknown;
  redirectUris?: unknown;
  acceptSpectraTos?: unknown;
  description?: unknown;
  companyWebsiteUrl?: unknown;
  privacyPolicyUrl?: unknown;
  applicationTosUrl?: unknown;
  supportEmail?: unknown;
  supportPhone?: unknown;
  developmentContacts?: unknown;
  logoUploadId?: unknown;
};

const createApplication: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const body = req.body as CreateBody;
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }

  const name = normalizeApplicationName(typeof body.name === 'string' ? body.name : '');
  if (!name) {
    res.status(400).json({ error: 'validation_error', message: 'Application name is required.' });
    return;
  }
  if (body.acceptSpectraTos !== true) {
    res.status(400).json({
      error: 'validation_error',
      message: 'You must accept the Spectra API Terms of Service.',
    });
    return;
  }

  const urisRaw = Array.isArray(body.redirectUris) ? body.redirectUris : [];
  const redirectList = urisRaw.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean);
  if (redirectList.length === 0) {
    res.status(400).json({
      error: 'validation_error',
      message: 'At least one redirect URI is required.',
    });
    return;
  }
  for (const u of redirectList) {
    const err = validateRedirectUri(u);
    if (err) {
      res.status(400).json({ error: 'validation_error', message: err, uri: u });
      return;
    }
  }

  const db = getDb();
  const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });
  const now = new Date();
  const clientSecretPlain = generateClientSecret();
  const clientId = generateClientId();
  const secretHash = hashClientSecret(clientSecretPlain);

  try {
    const appRows = await db
      .insert(applications)
      .values({
        orgId: sessionRow.orgId,
        name,
        description: typeof body.description === 'string' ? body.description : undefined,
        companyWebsiteUrl:
          typeof body.companyWebsiteUrl === 'string' ? body.companyWebsiteUrl : undefined,
        privacyPolicyUrl: typeof body.privacyPolicyUrl === 'string' ? body.privacyPolicyUrl : undefined,
        applicationTosUrl: typeof body.applicationTosUrl === 'string' ? body.applicationTosUrl : undefined,
        supportEmail: typeof body.supportEmail === 'string' ? body.supportEmail : undefined,
        supportPhone: typeof body.supportPhone === 'string' ? body.supportPhone : undefined,
        developmentContacts:
          typeof body.developmentContacts === 'string' ? body.developmentContacts : undefined,
        logoUploadId:
          typeof body.logoUploadId === 'string' && body.logoUploadId.length === 36 ?
            body.logoUploadId
          : undefined,
        spectraTosAcceptedAt: now,
        statusId: CATALOG_IDS.status.active,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    const app = appRows[0];

    if (!app) {
      res.status(500).json({ error: 'create_failed', message: 'Insert failed.' });
      return;
    }

    const ocRows = await db
      .insert(oauthClients)
      .values({
        applicationId: app.id,
        clientId,
        secretHash,
        oauthClientType: 'confidential',
        oauthGrantType: 'authorization_code',
        statusId: CATALOG_IDS.status.active,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    const oc = ocRows[0];

    if (!oc) {
      await db.delete(applications).where(eq(applications.id, app.id));
      res.status(500).json({ error: 'create_failed', message: 'OAuth client insert failed.' });
      return;
    }

    await db.insert(redirectUris).values(
      redirectList.map((uri) => ({
        oauthClientId: oc.id,
        uri,
      })),
    );

    res.status(201).json({
      id: app.id,
      name: app.name,
      clientId,
      clientSecret: clientSecretPlain,
      updatedAt: app.updatedAt,
    });
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
    if (code === '23505') {
      res.status(409).json({
        error: 'name_conflict',
        message: 'An application with this name already exists. Names must be globally unique.',
      });
      return;
    }
    throw e;
  }
};

async function loadApplicationForOrg(
  applicationId: string,
  orgId: string,
): Promise<
  | {
      application: typeof applications.$inferSelect;
      oauthClient: typeof oauthClients.$inferSelect;
      uris: string[];
    }
  | undefined
> {
  const db = getDb();
  const row = await db
    .select({
      application: applications,
      oauthClient: oauthClients,
    })
    .from(applications)
    .innerJoin(
      oauthClients,
      and(
        eq(oauthClients.applicationId, applications.id),
        isNull(oauthClients.deletedAt),
      ),
    )
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.orgId, orgId),
        isNull(applications.deletedAt),
      ),
    )
    .limit(1);

  const first = row[0];
  if (!first) return undefined;
  const uris = await db
    .select({ uri: redirectUris.uri })
    .from(redirectUris)
    .where(eq(redirectUris.oauthClientId, first.oauthClient.id));
  return {
    application: first.application,
    oauthClient: first.oauthClient,
    uris: uris.map((r) => r.uri),
  };
}

const getApplication: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const loaded = await loadApplicationForOrg(id, sessionRow.orgId);
  if (!loaded) {
    res.status(404).json({ error: 'not_found', message: 'Application not found.' });
    return;
  }
  const { application: app, oauthClient: oc, uris } = loaded;
  res.json({
    id: app.id,
    name: app.name,
    updatedAt: app.updatedAt,
    clientId: oc.clientId,
    hasClientSecret: true,
    oauthClientType: oc.oauthClientType,
    oauthGrantType: oc.oauthGrantType,
    redirectUris: uris,
    description: app.description,
    companyWebsiteUrl: app.companyWebsiteUrl,
    privacyPolicyUrl: app.privacyPolicyUrl,
    applicationTosUrl: app.applicationTosUrl,
    supportEmail: app.supportEmail,
    supportPhone: app.supportPhone,
    developmentContacts: app.developmentContacts,
    logoUploadId: app.logoUploadId,
    spectraTosAcceptedAt: app.spectraTosAcceptedAt,
  });
};

/** Replace stored secret hash; returns plaintext once (sandbox developer portal only). */
const rotateClientSecret: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const loaded = await loadApplicationForOrg(id, sessionRow.orgId);
  if (!loaded) {
    res.status(404).json({ error: 'not_found', message: 'Application not found.' });
    return;
  }
  const clientSecretPlain = generateClientSecret();
  const secretHash = hashClientSecret(clientSecretPlain);
  const db = getDb();
  const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });
  await db
    .update(oauthClients)
    .set({
      secretHash,
      updatedBy: actor,
    })
    .where(eq(oauthClients.id, loaded.oauthClient.id));
  res.json({ clientSecret: clientSecretPlain });
};

const patchApplication: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const loaded = await loadApplicationForOrg(id, sessionRow.orgId);
  if (!loaded) {
    res.status(404).json({ error: 'not_found', message: 'Application not found.' });
    return;
  }

  const body = req.body as CreateBody;
  const db = getDb();
  const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });

  const name =
    typeof body.name === 'string' ? normalizeApplicationName(body.name) : loaded.application.name;
  if (!name) {
    res.status(400).json({ error: 'validation_error', message: 'Application name is required.' });
    return;
  }

  let redirectList: string[] | undefined;
  if (Array.isArray(body.redirectUris)) {
    redirectList = body.redirectUris
      .filter((u): u is string => typeof u === 'string')
      .map((u) => u.trim())
      .filter(Boolean);
    if (redirectList.length === 0) {
      res.status(400).json({
        error: 'validation_error',
        message: 'At least one redirect URI is required.',
      });
      return;
    }
    for (const u of redirectList) {
      const err = validateRedirectUri(u);
      if (err) {
        res.status(400).json({ error: 'validation_error', message: err, uri: u });
        return;
      }
    }
  }

  try {
    await db
      .update(applications)
      .set({
        name,
        description:
          typeof body.description === 'string' ? body.description : loaded.application.description,
        companyWebsiteUrl:
          typeof body.companyWebsiteUrl === 'string' ?
            body.companyWebsiteUrl
          : loaded.application.companyWebsiteUrl,
        privacyPolicyUrl:
          typeof body.privacyPolicyUrl === 'string' ?
            body.privacyPolicyUrl
          : loaded.application.privacyPolicyUrl,
        applicationTosUrl:
          typeof body.applicationTosUrl === 'string' ?
            body.applicationTosUrl
          : loaded.application.applicationTosUrl,
        supportEmail:
          typeof body.supportEmail === 'string' ? body.supportEmail : loaded.application.supportEmail,
        supportPhone:
          typeof body.supportPhone === 'string' ? body.supportPhone : loaded.application.supportPhone,
        developmentContacts:
          typeof body.developmentContacts === 'string' ?
            body.developmentContacts
          : loaded.application.developmentContacts,
        logoUploadId:
          typeof body.logoUploadId === 'string' && body.logoUploadId.length === 36 ?
            body.logoUploadId
          : loaded.application.logoUploadId,
        updatedBy: actor,
      })
      .where(eq(applications.id, id));

    if (redirectList) {
      await db.delete(redirectUris).where(eq(redirectUris.oauthClientId, loaded.oauthClient.id));
      await db.insert(redirectUris).values(
        redirectList.map((uri) => ({
          oauthClientId: loaded.oauthClient.id,
          uri,
        })),
      );
    }

    const refreshed = await loadApplicationForOrg(id, sessionRow.orgId);
    res.json(refreshed ? { ok: true, id: refreshed.application.id, updatedAt: refreshed.application.updatedAt } : { ok: true });
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
    if (code === '23505') {
      res.status(409).json({
        error: 'name_conflict',
        message: 'An application with this name already exists. Names must be globally unique.',
      });
      return;
    }
    throw e;
  }
};

const deleteApplication: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const loaded = await loadApplicationForOrg(id, sessionRow.orgId);
  if (!loaded) {
    res.status(404).json({ error: 'not_found', message: 'Application not found.' });
    return;
  }
  const db = getDb();
  const now = new Date();
  await db
    .update(applications)
    .set({ deletedAt: now })
    .where(eq(applications.id, id));
  await db
    .update(oauthClients)
    .set({ deletedAt: now })
    .where(and(eq(oauthClients.applicationId, id), isNull(oauthClients.deletedAt)));
  res.status(204).send();
};

function parseGrantedScopes(raw: unknown): string | null {
  if (raw === undefined || raw === null) return 'platform:read';
  if (typeof raw !== 'string') return null;
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'platform:read';
  for (const p of parts) {
    if (!isKnownM2mScope(p)) return null;
  }
  return parts.join(' ');
}

const listIntegrations: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const db = getDb();
  const rows = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      updatedAt: integrations.updatedAt,
      clientId: m2mOauthClients.clientId,
      grantedScopes: m2mOauthClients.grantedScopes,
    })
    .from(integrations)
    .innerJoin(m2mOauthClients, eq(m2mOauthClients.integrationId, integrations.id))
    .where(
      and(
        eq(integrations.orgId, sessionRow.orgId),
        isNull(integrations.deletedAt),
        isNull(m2mOauthClients.deletedAt),
      ),
    )
    .orderBy(desc(integrations.updatedAt));
  res.json({ integrations: rows });
};

const createIntegration: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const name = typeof body['name'] === 'string' ? body['name'].trim() : '';
  if (!name) {
    res.status(400).json({ error: 'invalid_request', message: 'name is required.' });
    return;
  }
  const grantedScopes = parseGrantedScopes(body['grantedScopes']);
  if (grantedScopes === null) {
    res.status(400).json({
      error: 'invalid_scope',
      message: `grantedScopes must use known scopes only.`,
    });
    return;
  }
  const description = typeof body['description'] === 'string' ? body['description'].trim() : null;
  const db = getDb();
  const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const secretHash = hashClientSecret(clientSecret);
  try {
    const out = await db.transaction(async (tx) => {
      const [integ] = await tx
        .insert(integrations)
        .values({
          orgId: sessionRow.orgId,
          name,
          description,
          statusId: CATALOG_IDS.status.active,
          createdBy: actor,
          updatedBy: actor,
        })
        .returning();
      if (!integ) throw new Error('integration insert failed');
      await tx.insert(m2mOauthClients).values({
        integrationId: integ.id,
        clientId,
        secretHash,
        grantedScopes,
        statusId: CATALOG_IDS.status.active,
        createdBy: actor,
        updatedBy: actor,
      });
      return integ;
    });
    res.status(201).json({
      id: out.id,
      name: out.name,
      clientId,
      clientSecret,
      grantedScopes,
      updatedAt: out.updatedAt,
    });
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
    if (code === '23505') {
      res.status(409).json({
        error: 'conflict',
        message: 'An OAuth client already exists for this integration.',
      });
      return;
    }
    throw e;
  }
};

const getIntegration: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const db = getDb();
  const rows = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      description: integrations.description,
      updatedAt: integrations.updatedAt,
      clientId: m2mOauthClients.clientId,
      grantedScopes: m2mOauthClients.grantedScopes,
    })
    .from(integrations)
    .innerJoin(m2mOauthClients, eq(m2mOauthClients.integrationId, integrations.id))
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.orgId, sessionRow.orgId),
        isNull(integrations.deletedAt),
        isNull(m2mOauthClients.deletedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
    return;
  }
  res.json({ ...row, hasClientSecret: true });
};

const patchIntegration: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  let nameNext: string | undefined;
  if ('name' in body) {
    if (typeof body['name'] !== 'string' || !body['name'].trim()) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'name must be a non-empty string when provided.',
      });
      return;
    }
    nameNext = body['name'].trim();
  }
  let descNext: string | null | undefined;
  if ('description' in body) {
    const d = body['description'];
    if (d === null) {
      descNext = null;
    } else if (typeof d === 'string') {
      descNext = d.trim() || null;
    } else {
      res.status(400).json({
        error: 'invalid_request',
        message: 'description must be a string or null.',
      });
      return;
    }
  }
  let scopesNext: string | undefined;
  if ('grantedScopes' in body) {
    const parsed = parseGrantedScopes(body['grantedScopes']);
    if (parsed === null) {
      res.status(400).json({
        error: 'invalid_scope',
        message: 'grantedScopes must use known scopes only.',
      });
      return;
    }
    scopesNext = parsed;
  }
  if (nameNext === undefined && descNext === undefined && scopesNext === undefined) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Provide at least one of name, description, grantedScopes.',
    });
    return;
  }

  const db = getDb();
  const rows = await db
    .select({
      integrationId: integrations.id,
      m2mId: m2mOauthClients.id,
      curName: integrations.name,
      curDesc: integrations.description,
    })
    .from(integrations)
    .innerJoin(m2mOauthClients, eq(m2mOauthClients.integrationId, integrations.id))
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.orgId, sessionRow.orgId),
        isNull(integrations.deletedAt),
        isNull(m2mOauthClients.deletedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
    return;
  }

  const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });
  const nextName = nameNext ?? row.curName;
  const nextDesc = descNext !== undefined ? descNext : row.curDesc;

  await db.transaction(async (tx) => {
    await tx
      .update(integrations)
      .set({
        name: nextName,
        description: nextDesc,
        updatedBy: actor,
      })
      .where(eq(integrations.id, id));
    if (scopesNext !== undefined) {
      await tx
        .update(m2mOauthClients)
        .set({ grantedScopes: scopesNext, updatedBy: actor })
        .where(eq(m2mOauthClients.id, row.m2mId));
    }
  });

  const [fresh] = await db
    .select({ updatedAt: integrations.updatedAt })
    .from(integrations)
    .where(eq(integrations.id, id))
    .limit(1);
  res.json({ ok: true, id, updatedAt: fresh?.updatedAt ?? new Date().toISOString() });
};

const rotateIntegrationSecret: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const db = getDb();
  const rows = await db
    .select({ m2mId: m2mOauthClients.id })
    .from(integrations)
    .innerJoin(m2mOauthClients, eq(m2mOauthClients.integrationId, integrations.id))
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.orgId, sessionRow.orgId),
        isNull(integrations.deletedAt),
        isNull(m2mOauthClients.deletedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
    return;
  }
  const clientSecret = generateClientSecret();
  const secretHash = hashClientSecret(clientSecret);
  const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });
  await db
    .update(m2mOauthClients)
    .set({ secretHash, updatedBy: actor })
    .where(eq(m2mOauthClients.id, row.m2mId));
  res.json({ clientSecret });
};

function resolveAuthApiBaseUrl(): string | null {
  const raw = process.env['SPECTRA_AUTH_API_URL']?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

// ponytail: in-memory mint throttle, per API instance. Move to a shared store (Redis)
// if aviate-api runs multi-instance and you need a global limit.
const MINT_ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const MINT_MAX_FAILURES = 5;
const MINT_WINDOW_MS = 5 * 60_000;

function mintThrottleState(key: string): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  const e = MINT_ATTEMPTS.get(key);
  if (!e || now >= e.resetAt) return { blocked: false, retryAfterSec: 0 };
  return { blocked: e.count >= MINT_MAX_FAILURES, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
}
function mintRecordFailure(key: string): void {
  const now = Date.now();
  const e = MINT_ATTEMPTS.get(key);
  if (!e || now >= e.resetAt) MINT_ATTEMPTS.set(key, { count: 1, resetAt: now + MINT_WINDOW_MS });
  else e.count += 1;
}

const mintIntegrationAccessToken: RequestHandler = async (req, res) => {
  // Security: `req.body.clientSecret` is a live credential — never log this request body.
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const authBase = resolveAuthApiBaseUrl();
  if (!authBase) {
    res.status(503).json({
      error: 'mint_not_configured',
      message:
        'M2M token mint is not wired from this API. Set SPECTRA_AUTH_API_URL to your auth-api base URL (e.g. http://127.0.0.1:9100).',
    });
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const db = getDb();
  const rows = await db
    .select({
      clientId: m2mOauthClients.clientId,
    })
    .from(integrations)
    .innerJoin(m2mOauthClients, eq(m2mOauthClients.integrationId, integrations.id))
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.orgId, sessionRow.orgId),
        isNull(integrations.deletedAt),
        isNull(m2mOauthClients.deletedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
    return;
  }
  const throttleKey = `${sessionRow.orgId}:${id}`;
  const throttle = mintThrottleState(throttleKey);
  if (throttle.blocked) {
    res.setHeader('Retry-After', String(throttle.retryAfterSec));
    res.status(429).json({
      error: 'too_many_attempts',
      error_description: 'Too many failed token mints for this integration. Try again later.',
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const clientSecret = typeof body['clientSecret'] === 'string' ? body['clientSecret'] : '';
  if (!clientSecret.trim()) {
    res.status(400).json({ error: 'invalid_request', message: 'clientSecret is required.' });
    return;
  }
  const scopeRaw = body['scope'];
  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  if (typeof scopeRaw === 'string' && scopeRaw.trim()) {
    form.set('scope', scopeRaw.trim());
  }
  const basic = Buffer.from(`${row.clientId}:${clientSecret}`, 'utf8').toString('base64');
  const tokenUrl = `${authBase}/oauth/token`;
  let authRes: globalThis.Response;
  try {
    authRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const cause = 'cause' in err ? (err as Error & { cause?: unknown }).cause : undefined;
    const causeObj =
      cause && typeof cause === 'object'
        ? {
            name: 'name' in cause ? String((cause as { name?: unknown }).name) : '',
            message: 'message' in cause ? String((cause as { message?: unknown }).message) : '',
            code: 'code' in cause ? String((cause as { code?: unknown }).code) : '',
            errno: 'errno' in cause ? String((cause as { errno?: unknown }).errno) : '',
            syscall: 'syscall' in cause ? String((cause as { syscall?: unknown }).syscall) : '',
            address: 'address' in cause ? String((cause as { address?: unknown }).address) : '',
            port: 'port' in cause ? String((cause as { port?: unknown }).port) : '',
          }
        : { causeType: typeof cause, causeStr: cause === undefined ? '' : String(cause) };
    const upstream =
      'code' in causeObj && typeof causeObj.code === 'string' && causeObj.code
        ? {
            code: causeObj.code,
            ...(causeObj.address ? { address: causeObj.address } : {}),
            ...(causeObj.port ? { port: causeObj.port } : {}),
          }
        : undefined;
    res.status(502).json({
      error: 'mint_upstream_unreachable',
      message: e instanceof Error ? e.message : 'Could not reach auth-api.',
      ...(upstream ? { upstream } : {}),
      ...(upstream?.code === 'ECONNREFUSED'
        ? {
            hint:
              'Nothing accepted TCP on this URL (auth-api likely not running). Use `nx serve auth-api` with M2M_MINT_ENABLED, or `npm run dev:apis` (includes auth-api).',
          }
        : {}),
    });
    return;
  }
  // On failure, do NOT echo auth-api's raw response — that turns this proxy into a
  // credential-validity oracle. Return a single generic message and count the attempt.
  if (!authRes.ok) {
    mintRecordFailure(throttleKey);
    const status = authRes.status === 401 ? 401 : 400;
    res.status(status).json({
      error: 'mint_failed',
      error_description: 'Invalid client credentials or scope for this integration.',
    });
    return;
  }
  MINT_ATTEMPTS.delete(throttleKey);
  const text = await authRes.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    res.status(502).json({ error: 'invalid_response', error_description: 'Malformed token response.' });
    return;
  }
  res.status(200).json(payload);
};

const revokeIntegration: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    noDatabase(res);
    return;
  }
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
    return;
  }
  const sessionRow = await ensureSession(sub, req.auth?.claims ?? {});
  if (!sessionRow) {
    res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
    return;
  }
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Missing id.' });
    return;
  }
  const db = getDb();
  const now = new Date();
  const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });
  const updated = await db
    .update(integrations)
    .set({
      deletedAt: now,
      statusId: CATALOG_IDS.status.deleted,
      updatedBy: actor,
    })
    .where(and(eq(integrations.id, id), eq(integrations.orgId, sessionRow.orgId), isNull(integrations.deletedAt)))
    .returning();
  if (!updated.length) {
    res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
    return;
  }
  await db
    .update(m2mOauthClients)
    .set({ deletedAt: now, statusId: CATALOG_IDS.status.deleted, updatedBy: actor })
    .where(and(eq(m2mOauthClients.integrationId, id), isNull(m2mOauthClients.deletedAt)));
  res.status(204).send();
};

/** Authenticated sandbox developer portal (JWT Bearer). */
export function createSandboxPortalRouter(): Router {
  const r = Router();
  r.use(requireAuth0AccessToken);
  r.get('/session', session);
  r.get('/integrations', listIntegrations);
  r.post('/integrations', createIntegration);
  r.get('/integrations/:id', getIntegration);
  r.patch('/integrations/:id', patchIntegration);
  r.post('/integrations/:id/rotate-secret', rotateIntegrationSecret);
  r.post('/integrations/:id/mint-access-token', mintIntegrationAccessToken);
  r.delete('/integrations/:id', revokeIntegration);
  r.use('/integrations/:integrationId', createSandboxPortalProductionAccessRouter(ensureSession));

  const applicationsRouter = Router();
  applicationsRouter.use(requireDeveloperApplicationsUi);
  applicationsRouter.get('/', listApplications);
  applicationsRouter.post('/', createApplication);
  applicationsRouter.get('/:id', getApplication);
  applicationsRouter.post('/:id/rotate-client-secret', rotateClientSecret);
  applicationsRouter.patch('/:id', patchApplication);
  applicationsRouter.delete('/:id', deleteApplication);
  r.use('/applications', applicationsRouter);

  r.use(createSandboxPortalAiRouter(ensureSession));

  return r;
}
