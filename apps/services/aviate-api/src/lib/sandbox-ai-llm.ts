import Anthropic from '@anthropic-ai/sdk';

import {
  SANDBOX_AI_FILTER_OPERATORS,
  SANDBOX_MRP_FIXTURE_COLUMNS,
  SANDBOX_MRP_FIXTURE_LIMIT_CAP,
  SANDBOX_MRP_FIXTURE_TABLE_NAMES,
} from '@spectra/database';

/** Minimal shape of an `ai_llm_models` row needed to call the provider. */
export type SandboxAiModel = {
  id: string;
  provider: string;
  modelName: string;
  secretRef: string | null;
  maxTokens: number | null;
};

/** Thrown when no usable model/API key is configured; routes should map this to HTTP 503. */
export class AiModelNotConfiguredError extends Error {
  constructor(message = 'AI model is not configured. Set ANTHROPIC_API_KEY (or the model secret) on the server.') {
    super(message);
    this.name = 'AiModelNotConfiguredError';
  }
}

/** Resolves a model `secret_ref` to a concrete secret. Currently supports `env:VARNAME`. */
export function resolveModelSecret(secretRef: string | null | undefined): string | null {
  const ref = (secretRef ?? '').trim();
  if (!ref) {
    // Fallback to the conventional env var so a bare/seed model row still works in dev.
    return process.env['ANTHROPIC_API_KEY']?.trim() || null;
  }
  if (ref.startsWith('env:')) {
    const name = ref.slice('env:'.length).trim();
    return (name ? process.env[name]?.trim() : '') || null;
  }
  return null;
}

/** JSON Schema for the forced `emit_endpoint_spec` tool (one fixture-read spec). */
const SPEC_TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['execution_kind', 'table'],
  properties: {
    execution_kind: { type: 'string', enum: ['sandbox_mrp_fixture_read'] },
    table: { type: 'string', enum: [...SANDBOX_MRP_FIXTURE_TABLE_NAMES] },
    where: {
      type: 'array',
      description: 'Filter clauses, ANDed together.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['col', 'op', 'val'],
        properties: {
          col: { type: 'string', description: 'Column name (must be allowlisted for the table).' },
          op: { type: 'string', enum: [...SANDBOX_AI_FILTER_OPERATORS] },
          val: { description: 'Scalar for most ops; array for `in`; use % wildcards for `like`.' },
        },
      },
    },
    sort: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['col', 'dir'],
        properties: {
          col: { type: 'string' },
          dir: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    select: { type: 'array', items: { type: 'string' }, description: 'Subset of allowlisted columns to return.' },
    limit: { type: 'integer', minimum: 1, maximum: SANDBOX_MRP_FIXTURE_LIMIT_CAP },
  },
} as const;

function buildSystemPrompt(): string {
  const tableDocs = SANDBOX_MRP_FIXTURE_TABLE_NAMES.map(
    (t) => `- ${t}: ${SANDBOX_MRP_FIXTURE_COLUMNS[t].join(', ')}`,
  ).join('\n');
  return [
    'You translate a developer\'s natural-language instructions into a single read-only query spec',
    'against a sandbox manufacturing (MRP) dataset, by calling the `emit_endpoint_spec` tool exactly once.',
    '',
    'Rules:',
    '- execution_kind is always "sandbox_mrp_fixture_read".',
    '- Pick the single most relevant table for the request.',
    '- Only use column names from the allowlist for that table (exact names below). Never invent columns.',
    `- Operators: ${SANDBOX_AI_FILTER_OPERATORS.join(', ')}. Use "like" with % wildcards for text contains/starts-with.`,
    '- Use "select" to limit to the columns the user asked for; omit it to return all columns.',
    `- Use "limit" to cap rows (max ${SANDBOX_MRP_FIXTURE_LIMIT_CAP}). Use "sort" for ordering requests.`,
    '- tenant scoping and soft-delete filtering are applied automatically; do not add them.',
    '',
    'Tables and their allowlisted columns:',
    tableDocs,
  ].join('\n');
}

export type GeneratedSpec = { spec: Record<string, unknown>; llmRawResponse: string };

/**
 * Calls the configured Anthropic model to turn `userPrompt` into a fixture-read spec.
 * Returns the raw spec object (validate it with `validateDeveloperAiEndpointSpec` before use).
 */
export async function generateEndpointSpecFromPrompt(args: {
  userPrompt: string;
  model: SandboxAiModel;
}): Promise<GeneratedSpec> {
  const apiKey = resolveModelSecret(args.model.secretRef);
  if (!apiKey) {
    throw new AiModelNotConfiguredError();
  }
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: args.model.modelName,
    max_tokens: args.model.maxTokens && args.model.maxTokens > 0 ? Math.min(args.model.maxTokens, 1024) : 1024,
    system: buildSystemPrompt(),
    tools: [
      {
        name: 'emit_endpoint_spec',
        description: 'Emit the query spec that satisfies the developer instructions.',
        // The SDK types input_schema narrowly; our schema is valid JSON Schema.
        input_schema: SPEC_TOOL_SCHEMA as unknown as Anthropic.Tool['input_schema'],
      },
    ],
    tool_choice: { type: 'tool', name: 'emit_endpoint_spec' },
    messages: [{ role: 'user', content: args.userPrompt }],
  });

  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Model did not return a spec.');
  }
  const spec = toolUse.input as Record<string, unknown>;
  return { spec, llmRawResponse: JSON.stringify(toolUse.input) };
}
