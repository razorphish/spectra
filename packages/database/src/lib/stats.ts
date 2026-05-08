import { count } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { SpectraDb } from './connection';
import {
  applicationScopes,
  applications,
  auditLogs,
  orgs,
  oauthClients,
  orgMemberships,
  platformSettings,
  productionAccessRequests,
  redirectUris,
  scopeRequests,
  scopes,
  uploads,
  users,
} from '../schema';

/** Row counts for control-plane tables (MVP ops / empty DB checks). */
export async function getControlPlaneRowCounts(db: SpectraDb) {
  const q = (t: PgTable) =>
    db
      .select({ c: count() })
      .from(t)
      .then((r) => Number(r[0]?.c ?? 0));

  const [
    usersC,
    orgsC,
    orgMembershipsC,
    applicationsC,
    oauthClientsC,
    redirectUrisC,
    scopesC,
    applicationScopesC,
    scopeRequestsC,
    productionAccessC,
    auditC,
    uploadsC,
    platformSettingsC,
  ] = await Promise.all([
    q(users),
    q(orgs),
    q(orgMemberships),
    q(applications),
    q(oauthClients),
    q(redirectUris),
    q(scopes),
    q(applicationScopes),
    q(scopeRequests),
    q(productionAccessRequests),
    q(auditLogs),
    q(uploads),
    q(platformSettings),
  ]);

  return {
    users: usersC,
    orgs: orgsC,
    orgMemberships: orgMembershipsC,
    applications: applicationsC,
    oauthClients: oauthClientsC,
    redirectUris: redirectUrisC,
    scopes: scopesC,
    applicationScopes: applicationScopesC,
    scopeRequests: scopeRequestsC,
    productionAccessRequests: productionAccessC,
    auditLogs: auditC,
    uploads: uploadsC,
    platformSettings: platformSettingsC,
  };
}
