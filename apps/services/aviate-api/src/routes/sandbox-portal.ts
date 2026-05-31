import { and, desc, eq, isNull, notExists } from 'drizzle-orm';
import { Router } from 'express';
import type { RequestHandler } from 'express';

import { createRequireAuth0AccessToken } from '@spectra/auth';
import {
  applications,
  buildActorJson,
  CATALOG_IDS,
  getDb,
  oauthClients,
  orgMemberships,
  orgs,
  redirectUris,
  resolveSpectraDatabaseUrl,
  userDeveloperContext,
  users,
} from '@spectra/database';

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

async function ensureSession(
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
  res.json(sessionRow);
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

/** Authenticated sandbox developer portal (JWT Bearer). */
export function createSandboxPortalRouter(): Router {
  const r = Router();
  r.use(requireAuth0AccessToken);
  r.get('/session', session);
  r.get('/applications', listApplications);
  r.post('/applications', createApplication);
  r.get('/applications/:id', getApplication);
  r.post('/applications/:id/rotate-client-secret', rotateClientSecret);
  r.patch('/applications/:id', patchApplication);
  r.delete('/applications/:id', deleteApplication);
  return r;
}
