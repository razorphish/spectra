import { inArray } from 'drizzle-orm';

import { platformSettings } from '../schema/control-plane';
import type { SpectraDb } from './connection';

export const PLATFORM_SANDBOX_AI_KEYS = [
  'sandbox.ai.endpoints_enabled',
  'sandbox.ai.default_llm_model_id',
  'sandbox.ai.default_pricing_profile_id',
  'sandbox.ai.precheck_enabled',
  'sandbox.ai.approval_automation_enabled',
  'sandbox.ai.machine_auto_approve_enabled',
] as const;

export type PlatformSandboxAiKey = (typeof PLATFORM_SANDBOX_AI_KEYS)[number];

export type SandboxAiPlatformSettings = {
  endpointsEnabled: boolean;
  defaultLlmModelId: string | null;
  defaultPricingProfileId: string | null;
  precheckEnabled: boolean;
  approvalAutomationEnabled: boolean;
  machineAutoApproveEnabled: boolean;
};

function parseBooleanJsonb(value: unknown, defaultValue: boolean): boolean {
  if (value === true || value === false) return value;
  if (value && typeof value === 'object' && 'enabled' in value) {
    return (value as { enabled?: unknown }).enabled === true;
  }
  return defaultValue;
}

function parseUuidOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)) return value;
  return null;
}

const DEFAULTS: SandboxAiPlatformSettings = {
  endpointsEnabled: false,
  defaultLlmModelId: null,
  defaultPricingProfileId: null,
  precheckEnabled: false,
  approvalAutomationEnabled: false,
  machineAutoApproveEnabled: false,
};

export async function fetchSandboxAiPlatformSettings(db: SpectraDb): Promise<SandboxAiPlatformSettings> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, [...PLATFORM_SANDBOX_AI_KEYS]));

  const byKey: Record<string, unknown> = {};
  for (const r of rows) {
    byKey[r.key] = r.value;
  }

  return {
    endpointsEnabled: parseBooleanJsonb(
      byKey['sandbox.ai.endpoints_enabled'],
      DEFAULTS.endpointsEnabled,
    ),
    defaultLlmModelId: parseUuidOrNull(byKey['sandbox.ai.default_llm_model_id']),
    defaultPricingProfileId: parseUuidOrNull(byKey['sandbox.ai.default_pricing_profile_id']),
    precheckEnabled: parseBooleanJsonb(byKey['sandbox.ai.precheck_enabled'], DEFAULTS.precheckEnabled),
    approvalAutomationEnabled: parseBooleanJsonb(
      byKey['sandbox.ai.approval_automation_enabled'],
      DEFAULTS.approvalAutomationEnabled,
    ),
    machineAutoApproveEnabled: parseBooleanJsonb(
      byKey['sandbox.ai.machine_auto_approve_enabled'],
      DEFAULTS.machineAutoApproveEnabled,
    ),
  };
}
