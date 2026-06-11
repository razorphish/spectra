import { inArray } from 'drizzle-orm';

import { platformSettings } from '../schema/control-plane';
import type { SpectraDb } from './connection';

export const PLATFORM_PRODUCTION_ACCESS_KEYS = [
  'production_access.integrator_portal_enabled',
  'production_access.staff_console_enabled',
  'production_access.integrator_credentials_ui_enabled',
  'production_access.review_sla_business_days',
  'production_access.review_sla_disclaimer',
  'production_access.reveal_client_secret_to_staff',
] as const;

export type PlatformProductionAccessKey = (typeof PLATFORM_PRODUCTION_ACCESS_KEYS)[number];

function parseBooleanJsonb(value: unknown, defaultValue: boolean): boolean {
  if (value === true || value === false) return value;
  if (value && typeof value === 'object' && 'enabled' in value) {
    return (value as { enabled?: unknown }).enabled === true;
  }
  return defaultValue;
}

function parseNumberJsonb(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  return defaultValue;
}

export type ProductionAccessPortalFlags = {
  productionAccessIntegratorPortalEnabled: boolean;
  productionAccessStaffConsoleEnabled: boolean;
  productionAccessIntegratorCredentialsUiEnabled: boolean;
  productionAccessReviewSlaBusinessDays: number;
  productionAccessReviewSlaDisclaimer: string | null;
  productionAccessRevealClientSecretToStaff: boolean;
};

const DEFAULT_FLAGS: ProductionAccessPortalFlags = {
  productionAccessIntegratorPortalEnabled: true,
  productionAccessStaffConsoleEnabled: true,
  productionAccessIntegratorCredentialsUiEnabled: true,
  productionAccessReviewSlaBusinessDays: 5,
  productionAccessReviewSlaDisclaimer: null,
  productionAccessRevealClientSecretToStaff: false,
};

/**
 * Reads PAR-related `platform_settings` rows for sandbox-portal session / status DTOs.
 */
export async function fetchProductionAccessPortalFlags(
  db: SpectraDb,
): Promise<ProductionAccessPortalFlags> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, [...PLATFORM_PRODUCTION_ACCESS_KEYS]));

  const byKey: Record<string, unknown> = {};
  for (const r of rows) {
    byKey[r.key] = r.value;
  }

  return {
    productionAccessIntegratorPortalEnabled: parseBooleanJsonb(
      byKey['production_access.integrator_portal_enabled'],
      DEFAULT_FLAGS.productionAccessIntegratorPortalEnabled,
    ),
    productionAccessStaffConsoleEnabled: parseBooleanJsonb(
      byKey['production_access.staff_console_enabled'],
      DEFAULT_FLAGS.productionAccessStaffConsoleEnabled,
    ),
    productionAccessIntegratorCredentialsUiEnabled: parseBooleanJsonb(
      byKey['production_access.integrator_credentials_ui_enabled'],
      DEFAULT_FLAGS.productionAccessIntegratorCredentialsUiEnabled,
    ),
    productionAccessReviewSlaBusinessDays: parseNumberJsonb(
      byKey['production_access.review_sla_business_days'],
      DEFAULT_FLAGS.productionAccessReviewSlaBusinessDays,
    ),
    productionAccessReviewSlaDisclaimer:
      typeof byKey['production_access.review_sla_disclaimer'] === 'string' ?
        (byKey['production_access.review_sla_disclaimer'] as string)
      : typeof byKey['production_access.review_sla_disclaimer'] === 'object' &&
          byKey['production_access.review_sla_disclaimer'] &&
          'text' in (byKey['production_access.review_sla_disclaimer'] as object) ?
        String((byKey['production_access.review_sla_disclaimer'] as { text?: unknown }).text ?? '')
      : null,
    productionAccessRevealClientSecretToStaff: parseBooleanJsonb(
      byKey['production_access.reveal_client_secret_to_staff'],
      DEFAULT_FLAGS.productionAccessRevealClientSecretToStaff,
    ),
  };
}
