import { and, desc, eq, isNull } from 'drizzle-orm';

import type { SpectraDb } from './connection';
import { CATALOG_IDS } from '../schema/catalog-seed-ids';
import { aiLlmModels } from '../schema/control-plane';

/** Minimal projection of an `ai_llm_models` row used by the sandbox AI generator. */
export type DefaultAiLlmModel = {
  id: string;
  provider: string;
  modelName: string;
  secretRef: string | null;
  maxTokens: number | null;
};

/** Built-in default used to seed the first Anthropic model row when none exists. */
const DEFAULT_ANTHROPIC_MODEL = {
  displayName: 'Claude Opus 4.8',
  provider: 'anthropic',
  modelName: 'claude-opus-4-8',
  secretRef: 'env:ANTHROPIC_API_KEY',
} as const;

/**
 * Returns the newest active model, seeding a default Anthropic row on first use
 * (idempotent — control-plane scoped, not per-tenant). Pass `modelId` to pin a row.
 */
export async function getDefaultAiLlmModel(db: SpectraDb, modelId?: string): Promise<DefaultAiLlmModel> {
  if (modelId) {
    const [pinned] = await db
      .select({
        id: aiLlmModels.id,
        provider: aiLlmModels.provider,
        modelName: aiLlmModels.modelName,
        secretRef: aiLlmModels.secretRef,
        maxTokens: aiLlmModels.maxTokens,
      })
      .from(aiLlmModels)
      .where(and(eq(aiLlmModels.id, modelId), isNull(aiLlmModels.deletedAt)))
      .limit(1);
    if (pinned) return pinned;
  }

  const [existing] = await db
    .select({
      id: aiLlmModels.id,
      provider: aiLlmModels.provider,
      modelName: aiLlmModels.modelName,
      secretRef: aiLlmModels.secretRef,
      maxTokens: aiLlmModels.maxTokens,
    })
    .from(aiLlmModels)
    .where(and(eq(aiLlmModels.statusId, CATALOG_IDS.status.active), isNull(aiLlmModels.deletedAt)))
    .orderBy(desc(aiLlmModels.createdAt))
    .limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(aiLlmModels)
    .values({
      displayName: DEFAULT_ANTHROPIC_MODEL.displayName,
      provider: DEFAULT_ANTHROPIC_MODEL.provider,
      modelName: DEFAULT_ANTHROPIC_MODEL.modelName,
      secretRef: DEFAULT_ANTHROPIC_MODEL.secretRef,
      statusId: CATALOG_IDS.status.active,
    })
    .returning();
  return {
    id: inserted.id,
    provider: inserted.provider,
    modelName: inserted.modelName,
    secretRef: inserted.secretRef,
    maxTokens: inserted.maxTokens,
  };
}
