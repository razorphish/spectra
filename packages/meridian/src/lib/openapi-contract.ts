import type Anthropic from '@anthropic-ai/sdk';

import type { ExecutorResult } from './executor';
import type { L0Result } from './l0-gates';
import type { MeridianTask } from './runner';

/**
 * `openapi_contract_check` — a bounded / structured, autonomy-eligible class.
 *
 * The executor classifies each M2M scope rule as matched/orphan against the public OpenAPI
 * operations (the CI contract, direction A). Output is a forced tool call (bounded, schema-valid)
 * and L0 is a **deterministic check** that recomputes ground truth and compares — no temp files,
 * no external input. See docs/contracts/scope-map-openapi-ci.md and docs/adr/meridian-003.
 */

export interface ScopeRule {
  method: string;
  pathPrefix: string;
  requiredScope: string;
}
export interface PublicOperation {
  path: string;
  method: string;
}
export type ScopeRuleStatus = 'matched' | 'orphan';

/** Direction A: a rule matches if some public op shares the verb and a path equal to / under the prefix. */
export function ruleMatches(rule: ScopeRule, ops: PublicOperation[]): boolean {
  const method = rule.method.toUpperCase();
  return ops.some(
    (op) =>
      op.method.toUpperCase() === method &&
      (op.path === rule.pathPrefix || op.path.startsWith(`${rule.pathPrefix}/`)),
  );
}

/** Deterministic check: matched/orphan for every rule. This is the ground truth L0 checks against. */
export function scopeContractGroundTruth(
  rules: ScopeRule[],
  ops: PublicOperation[],
): { method: string; pathPrefix: string; status: ScopeRuleStatus }[] {
  return rules.map((r) => ({
    method: r.method.toUpperCase(),
    pathPrefix: r.pathPrefix,
    status: ruleMatches(r, ops) ? 'matched' : 'orphan',
  }));
}

const TOOL = 'report_scope_contract';
const TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['method', 'pathPrefix', 'status'],
        properties: {
          method: { type: 'string' },
          pathPrefix: { type: 'string' },
          status: { type: 'string', enum: ['matched', 'orphan'] },
        },
      },
    },
  },
} as const;

export function openapiContractCheckTask(args: {
  rules: ScopeRule[];
  operations: PublicOperation[];
}): MeridianTask {
  const ruleLines = args.rules
    .map((r) => `- ${r.method.toUpperCase()} ${r.pathPrefix} (requires ${r.requiredScope})`)
    .join('\n');
  const opLines = args.operations.map((o) => `- ${o.method.toUpperCase()} ${o.path}`).join('\n');

  return {
    taskClass: 'openapi_contract_check',
    tier: 'small',
    system:
      'You verify the M2M scope-map vs the public OpenAPI contract. A scope rule is "matched" ' +
      'if some public operation has the same HTTP method AND a path equal to the rule prefix or ' +
      'starting with the prefix followed by "/". Otherwise it is an "orphan". Classify EVERY ' +
      `rule (once each) by calling ${TOOL} exactly once.`,
    prompt: `Scope rules:\n${ruleLines}\n\nPublic OpenAPI operations:\n${opLines}`,
    tools: [
      {
        name: TOOL,
        description: 'Report matched/orphan status for every scope rule.',
        input_schema: TOOL_SCHEMA as unknown as Anthropic.Tool['input_schema'],
      },
    ],
    toolChoice: { type: 'tool', name: TOOL },
    l0Commands: [],
    input: { rules: args.rules, operations: args.operations },
    verify: (result: ExecutorResult): L0Result => {
      const truth = scopeContractGroundTruth(args.rules, args.operations);
      const input = (result.toolUse?.input ?? {}) as {
        findings?: { method?: string; pathPrefix?: string; status?: string }[];
      };
      const findings = input.findings ?? [];
      const got = new Map(
        findings.map((f) => [`${(f.method ?? '').toUpperCase()} ${f.pathPrefix ?? ''}`, f.status]),
      );
      const mismatches: string[] = [];
      for (const t of truth) {
        const verdict = got.get(`${t.method} ${t.pathPrefix}`);
        if (verdict !== t.status) {
          mismatches.push(`${t.method} ${t.pathPrefix}: expected ${t.status}, got ${verdict ?? 'MISSING'}`);
        }
      }
      const extra = findings.length - truth.length;
      const ok = mismatches.length === 0 && extra <= 0;
      const orphans = truth.filter((t) => t.status === 'orphan').length;
      const summary = ok
        ? `All ${truth.length} rules classified correctly (${orphans} orphan).`
        : `${mismatches.join('; ')}${extra > 0 ? `; +${extra} extra finding(s)` : ''}`;
      return { passed: ok, gates: [{ command: 'scope-contract check (deterministic)', ok, summary }] };
    },
  };
}
