import { validateDeveloperAiEndpointSpec } from '@spectra/database';

describe('validateDeveloperAiEndpointSpec — fixture-read query contract', () => {
  it('accepts a bare fixture read', () => {
    const r = validateDeveloperAiEndpointSpec({ execution_kind: 'sandbox_mrp_fixture_read', table: 'sandbox_mrp_items' });
    expect(r.ok).toBe(true);
  });

  it('accepts allowlisted where/sort/select/limit', () => {
    const r = validateDeveloperAiEndpointSpec({
      execution_kind: 'sandbox_mrp_fixture_read',
      table: 'sandbox_mrp_items',
      where: [{ col: 'defaultLeadTimeDays', op: 'gt', val: 5 }],
      sort: [{ col: 'sku', dir: 'asc' }],
      select: ['sku', 'description', 'defaultLeadTimeDays'],
      limit: 50,
    });
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown table', () => {
    const r = validateDeveloperAiEndpointSpec({ execution_kind: 'sandbox_mrp_fixture_read', table: 'secrets' });
    expect(r).toEqual({ ok: false, error: 'invalid_fixture_table' });
  });

  it('rejects a non-allowlisted filter column', () => {
    const r = validateDeveloperAiEndpointSpec({
      execution_kind: 'sandbox_mrp_fixture_read',
      table: 'sandbox_mrp_items',
      where: [{ col: 'tenantId', op: 'eq', val: 'x' }],
    });
    expect(r).toEqual({ ok: false, error: 'invalid_where_column' });
  });

  it('rejects an unsupported operator', () => {
    const r = validateDeveloperAiEndpointSpec({
      execution_kind: 'sandbox_mrp_fixture_read',
      table: 'sandbox_mrp_items',
      where: [{ col: 'sku', op: 'regex', val: '.*' }],
    });
    expect(r).toEqual({ ok: false, error: 'invalid_where_operator' });
  });

  it('requires a non-empty array for `in`', () => {
    const r = validateDeveloperAiEndpointSpec({
      execution_kind: 'sandbox_mrp_fixture_read',
      table: 'sandbox_mrp_items',
      where: [{ col: 'sku', op: 'in', val: 'not-an-array' }],
    });
    expect(r).toEqual({ ok: false, error: 'in_requires_nonempty_array' });
  });

  it('rejects an out-of-range limit', () => {
    const r = validateDeveloperAiEndpointSpec({
      execution_kind: 'sandbox_mrp_fixture_read',
      table: 'sandbox_mrp_items',
      limit: 5000,
    });
    expect(r).toEqual({ ok: false, error: 'invalid_limit' });
  });

  it('rejects a select with an unknown column', () => {
    const r = validateDeveloperAiEndpointSpec({
      execution_kind: 'sandbox_mrp_fixture_read',
      table: 'sandbox_mrp_suppliers',
      select: ['name', 'password'],
    });
    expect(r).toEqual({ ok: false, error: 'invalid_select_column' });
  });
});
