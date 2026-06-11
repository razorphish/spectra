import { eq } from 'drizzle-orm';

import { developerAiEndpoints, pricingProfiles, runtimeTenants } from '../schema/control-plane';
import type { SpectraDb } from './connection';
import type { SandboxAiPlatformSettings } from './platform-sandbox-ai-settings';

export type EffectivePricingPolicy = Record<string, unknown>;

/**
 * §10.2 resolution: endpoint → runtime tenant default → platform default.
 * MVP: org billing entitlements omitted (post-Stripe).
 */
export async function resolveEffectivePricingPolicy(
  db: SpectraDb,
  platform: SandboxAiPlatformSettings,
  tenantId: string,
  endpointPricingProfileId: string | null,
): Promise<{ profileId: string | null; policy: EffectivePricingPolicy }> {
  if (endpointPricingProfileId) {
    const [row] = await db
      .select({ id: pricingProfiles.id, policy: pricingProfiles.policy })
      .from(pricingProfiles)
      .where(eq(pricingProfiles.id, endpointPricingProfileId))
      .limit(1);
    if (row) {
      return { profileId: row.id, policy: (row.policy ?? {}) as EffectivePricingPolicy };
    }
  }

  const [rt] = await db
    .select({
      defaultPricingProfileId: runtimeTenants.defaultPricingProfileId,
    })
    .from(runtimeTenants)
    .where(eq(runtimeTenants.id, tenantId))
    .limit(1);

  if (rt?.defaultPricingProfileId) {
    const [row] = await db
      .select({ id: pricingProfiles.id, policy: pricingProfiles.policy })
      .from(pricingProfiles)
      .where(eq(pricingProfiles.id, rt.defaultPricingProfileId))
      .limit(1);
    if (row) {
      return { profileId: row.id, policy: (row.policy ?? {}) as EffectivePricingPolicy };
    }
  }

  const platformDefault = platform.defaultPricingProfileId;
  if (platformDefault) {
    const [row] = await db
      .select({ id: pricingProfiles.id, policy: pricingProfiles.policy })
      .from(pricingProfiles)
      .where(eq(pricingProfiles.id, platformDefault))
      .limit(1);
    if (row) {
      return { profileId: row.id, policy: (row.policy ?? {}) as EffectivePricingPolicy };
    }
  }

  return { profileId: null, policy: {} };
}

/** Load endpoint's optional `pricing_profile_id` for resolution. */
export async function getEndpointPricingProfileId(
  db: SpectraDb,
  endpointId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ pricingProfileId: developerAiEndpoints.pricingProfileId })
    .from(developerAiEndpoints)
    .where(eq(developerAiEndpoints.id, endpointId))
    .limit(1);
  return row?.pricingProfileId ?? null;
}
