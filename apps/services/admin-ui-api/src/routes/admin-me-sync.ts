import type { RequestHandler } from 'express';
import { and, eq } from 'drizzle-orm';

import {
  catalog,
  CATALOG_IDS,
  getDb,
  resolveSpectraDatabaseUrl,
  users,
} from '@spectra/database';

import { fetchStaffEmailFromAuth0Userinfo } from '../lib/staff-email-from-auth0-userinfo';
import { staffEmailFromAccessTokenClaims } from '../lib/staff-access-token-claims';

async function selectUserWithLifecycleCatalog(db: ReturnType<typeof getDb>, userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      authSubject: users.authSubject,
      statusId: users.statusId,
      statusName: catalog.name,
      statusFamily: catalog.family,
    })
    .from(users)
    .innerJoin(catalog, eq(users.statusId, catalog.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

/**
 * Upserts `spectra.users` from Auth0 access token (`sub` + email claim).
 * v1 does not create `org_memberships` — assign orgs in a later feature.
 */
export function createAdminMeSyncHandler(): RequestHandler {
  return async (req, res) => {
    const auth = req.auth;
    if (!auth?.sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing auth context.' });
      return;
    }
    const sub = auth.sub.trim();
    if (!sub || sub === 'unknown') {
      res.status(400).json({
        error: 'invalid_subject',
        message: 'Token subject (sub) is missing or invalid.',
      });
      return;
    }

    let email = staffEmailFromAccessTokenClaims(auth.claims);
    if (!email) {
      const domain = process.env['AUTH0_DOMAIN']?.trim();
      const rawToken = req.auth0AccessToken;
      if (domain && rawToken) {
        email = await fetchStaffEmailFromAuth0Userinfo(domain, rawToken, sub);
      }
    }

    if (!email) {
      res.status(400).json({
        error: 'missing_email_claim',
        message:
          'Could not resolve staff email from the access token or Auth0 Userinfo. ' +
          'Add an Auth0 Post Login Action that sets custom claim `https://spectra.inc/admin/email` ' +
          'on the access token (see apps/admin-ui/docs/auth0.md), and ensure login scopes include `email`.',
      });
      return;
    }

    const dbUrl = resolveSpectraDatabaseUrl();
    if (!dbUrl) {
      res.status(503).json({
        error: 'database_not_configured',
        message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
      });
      return;
    }

    const activeId = CATALOG_IDS.status.active;

    try {
      const db = getDb();

      const [bySub] = await db
        .select()
        .from(users)
        .where(eq(users.authSubject, sub))
        .limit(1);

      if (bySub) {
        if (bySub.email !== email) {
          const [otherActive] = await db
            .select()
            .from(users)
            .where(and(eq(users.email, email), eq(users.statusId, activeId)))
            .limit(1);
          if (otherActive && otherActive.id !== bySub.id) {
            res.status(409).json({
              error: 'email_conflict',
              message: 'Email is already associated with another user.',
            });
            return;
          }
          await db.update(users).set({ email }).where(eq(users.id, bySub.id));
        }
        const hydrated = await selectUserWithLifecycleCatalog(db, bySub.id);
        if (!hydrated) {
          res.status(500).json({ error: 'sync_failed', message: 'User row missing catalog join.' });
          return;
        }
        res.status(200).json({
          id: hydrated.id,
          email: hydrated.email,
          authSubject: sub,
          statusId: hydrated.statusId,
          status: { name: hydrated.statusName, family: hydrated.statusFamily },
        });
        return;
      }

      const [byEmail] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.statusId, activeId)))
        .limit(1);

      if (byEmail) {
        if (byEmail.authSubject && byEmail.authSubject !== sub) {
          res.status(409).json({
            error: 'identity_conflict',
            message: 'This email is linked to a different Auth0 subject.',
          });
          return;
        }
        await db.update(users).set({ authSubject: sub }).where(eq(users.id, byEmail.id));
        const hydrated = await selectUserWithLifecycleCatalog(db, byEmail.id);
        if (!hydrated) {
          res.status(500).json({ error: 'sync_failed', message: 'User row missing catalog join.' });
          return;
        }
        res.status(200).json({
          id: hydrated.id,
          email: hydrated.email,
          authSubject: sub,
          statusId: hydrated.statusId,
          status: { name: hydrated.statusName, family: hydrated.statusFamily },
        });
        return;
      }

      const insertedRows = await db
        .insert(users)
        .values({ email, authSubject: sub, statusId: activeId })
        .returning();
      const inserted = insertedRows[0];
      if (!inserted) {
        res.status(500).json({ error: 'insert_failed', message: 'Could not create user row.' });
        return;
      }

      const hydrated = await selectUserWithLifecycleCatalog(db, inserted.id);
      if (!hydrated) {
        res.status(500).json({ error: 'sync_failed', message: 'User row missing catalog join.' });
        return;
      }

      res.status(200).json({
        id: hydrated.id,
        email: hydrated.email,
        authSubject: hydrated.authSubject ?? sub,
        statusId: hydrated.statusId,
        status: { name: hydrated.statusName, family: hydrated.statusFamily },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Database error';
      console.error('[admin-ui-api] POST /v1/admin/me/sync', e);
      res.status(500).json({ error: 'sync_failed', message });
    }
  };
}
