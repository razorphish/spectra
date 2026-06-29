import type { ExecutorResult } from './executor';
import {
  openapiContractCheckTask,
  ruleMatches,
  scopeContractGroundTruth,
  type PublicOperation,
  type ScopeRule,
} from './openapi-contract';

const ops: PublicOperation[] = [
  { path: '/v1/platform/hello', method: 'get' },
  { path: '/v1/platform/tenant-runtime/endpoints/{slug}/invoke', method: 'post' },
];

const matchedRule: ScopeRule = { method: 'GET', pathPrefix: '/v1/platform/hello', requiredScope: 'platform:read' };
const prefixRule: ScopeRule = {
  method: 'POST',
  pathPrefix: '/v1/platform/tenant-runtime/endpoints',
  requiredScope: 'custom_endpoints:invoke',
};
const orphanRule: ScopeRule = { method: 'GET', pathPrefix: '/v1/platform/nope', requiredScope: 'platform:read' };

describe('ruleMatches / ground truth', () => {
  it('matches exact path and prefix (path under prefix + "/")', () => {
    expect(ruleMatches(matchedRule, ops)).toBe(true);
    expect(ruleMatches(prefixRule, ops)).toBe(true);
  });
  it('flags an orphan and respects the verb', () => {
    expect(ruleMatches(orphanRule, ops)).toBe(false);
    expect(ruleMatches({ ...matchedRule, method: 'POST' }, ops)).toBe(false); // wrong verb
  });
  it('classifies every rule', () => {
    expect(scopeContractGroundTruth([matchedRule, orphanRule], ops)).toEqual([
      { method: 'GET', pathPrefix: '/v1/platform/hello', status: 'matched' },
      { method: 'GET', pathPrefix: '/v1/platform/nope', status: 'orphan' },
    ]);
  });
});

/** Build an ExecutorResult carrying a tool_use with the given findings. */
function resultWith(findings: unknown): ExecutorResult {
  return {
    model: 'm',
    tier: 'small',
    text: '',
    toolUse: { type: 'tool_use', id: 't', name: 'report_scope_contract', input: { findings } } as never,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    stopReason: 'tool_use',
  };
}

describe('openapiContractCheckTask.verify', () => {
  const task = openapiContractCheckTask({ rules: [matchedRule, orphanRule], operations: ops });
  const taskVerify = task.verify;
  if (!taskVerify) throw new Error('openapiContractCheckTask must set verify');
  const verify = (findings: unknown) => taskVerify(resultWith(findings)) as { passed: boolean };

  it('accepts findings that match ground truth', async () => {
    const r = await verify([
      { method: 'GET', pathPrefix: '/v1/platform/hello', status: 'matched' },
      { method: 'GET', pathPrefix: '/v1/platform/nope', status: 'orphan' },
    ]);
    expect(r.passed).toBe(true);
  });

  it('rejects a wrong status (missed orphan)', async () => {
    const r = await verify([
      { method: 'GET', pathPrefix: '/v1/platform/hello', status: 'matched' },
      { method: 'GET', pathPrefix: '/v1/platform/nope', status: 'matched' },
    ]);
    expect(r.passed).toBe(false);
  });

  it('rejects a missing rule', async () => {
    const r = await verify([{ method: 'GET', pathPrefix: '/v1/platform/hello', status: 'matched' }]);
    expect(r.passed).toBe(false);
  });

  it('emits a forced tool_choice', () => {
    expect(task.toolChoice).toEqual({ type: 'tool', name: 'report_scope_contract' });
    expect(task.tools?.[0].name).toBe('report_scope_contract');
  });
});
