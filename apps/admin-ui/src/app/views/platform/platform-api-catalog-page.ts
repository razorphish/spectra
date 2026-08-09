import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminPlatformApiService, type PlatformApiEndpoint } from '@/app/core/services/admin-platform-api.service';

type GroupedEntry = { scope: string | null; label: string; endpoints: PlatformApiEndpoint[] };

const METHOD_CLASS: Record<string, string> = {
  GET: 'badge bg-success',
  POST: 'badge bg-primary',
  PATCH: 'badge bg-warning text-dark',
  PUT: 'badge bg-warning text-dark',
  DELETE: 'badge bg-danger',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-platform-api-catalog-page',
  imports: [FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 class="h3 mb-1">API Catalog</h1>
          <p class="text-muted small mb-0">{{ totalCount() }} endpoints &mdash; {{ implementedCount() }} active, {{ openCount() }} open (no scope).</p>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <input class="form-control form-control-sm" style="width:200px" type="text" placeholder="Filter…" [value]="filter()" (input)="filter.set($any($event.target).value)" />
          <select class="form-select form-select-sm" style="width:180px" [value]="scopeFilter()" (change)="scopeFilter.set($any($event.target).value)">
            <option value="">All scopes</option>
            <option value="__open__">Open (no scope)</option>
            @for (s of knownScopes(); track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p class="text-muted">Loading catalog…</p>
      } @else {
        @for (group of visibleGroups(); track group.scope) {
          <div class="card mb-3">
            <div class="card-header d-flex align-items-center gap-2 py-2">
              @if (group.scope) {
                <code class="small text-primary fw-semibold">{{ group.scope }}</code>
              } @else {
                <span class="badge bg-secondary">open</span>
              }
              <span class="text-muted small">({{ group.endpoints.length }})</span>
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width:70px">Method</th>
                    <th>Path</th>
                    <th>Name</th>
                    <th style="width:90px">Status</th>
                    <th style="width:200px">Scope override</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ep of group.endpoints; track ep.key) {
                    <tr [class.table-active]="ep.isOverridden">
                      <td><span [class]="methodClass(ep.method)">{{ ep.method }}</span></td>
                      <td><code class="small">{{ ep.path }}</code></td>
                      <td>
                        <span>{{ ep.displayName }}</span>
                        <small class="text-muted d-block">{{ ep.description }}</small>
                      </td>
                      <td>
                        @if (ep.isImplemented) {
                          <span class="badge bg-success-subtle text-success border border-success-subtle">active</span>
                        } @else {
                          <span class="badge bg-light text-muted border">planned</span>
                        }
                      </td>
                      <td>
                        <div class="d-flex gap-1 align-items-center">
                          <select
                            class="form-select form-select-sm"
                            [disabled]="saving() === ep.key"
                            [value]="ep.effectiveScope ?? ''"
                            (change)="onScopeChange(ep, $any($event.target).value)">
                            <option value="">open (no scope)</option>
                            @for (s of knownScopes(); track s) {
                              <option [value]="s">{{ s }}</option>
                            }
                          </select>
                          @if (ep.isOverridden) {
                            <button class="btn btn-sm btn-outline-secondary" title="Restore default" [disabled]="saving() === ep.key" (click)="onRestoreDefault(ep)">↩</button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
        @if (visibleGroups().length === 0) {
          <p class="text-muted">No endpoints match the current filter.</p>
        }
      }
    </div>
  `,
})
export class PlatformApiCatalogPage {
  private readonly api = inject(AdminPlatformApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal<string | null>(null);
  readonly filter = signal('');
  readonly scopeFilter = signal('');

  private readonly allItems = signal<PlatformApiEndpoint[]>([]);
  readonly knownScopes = signal<string[]>([]);

  readonly totalCount = computed(() => this.allItems().length);
  readonly implementedCount = computed(() => this.allItems().filter((e) => e.isImplemented).length);
  readonly openCount = computed(() => this.allItems().filter((e) => e.effectiveScope === null).length);

  readonly visibleGroups = computed<GroupedEntry[]>(() => {
    const q = this.filter().toLowerCase();
    const sf = this.scopeFilter();
    const items = this.allItems().filter((ep) => {
      if (q && !ep.path.toLowerCase().includes(q) && !ep.displayName.toLowerCase().includes(q)) return false;
      if (sf === '__open__' && ep.effectiveScope !== null) return false;
      if (sf && sf !== '__open__' && ep.effectiveScope !== sf) return false;
      return true;
    });

    const map = new Map<string, PlatformApiEndpoint[]>();
    for (const ep of items) {
      const k = ep.effectiveScope ?? '__open__';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ep);
    }

    return [...map.entries()].map(([scope, endpoints]) => ({
      scope: scope === '__open__' ? null : scope,
      label: scope === '__open__' ? 'Open (no scope required)' : scope,
      endpoints,
    }));
  });

  constructor() {
    this.api.getApiCatalog().subscribe({
      next: (r) => {
        this.allItems.set(r.items);
        this.knownScopes.set(r.knownScopes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load API catalog.');
        this.loading.set(false);
      },
    });
  }

  methodClass(method: string): string {
    return METHOD_CLASS[method] ?? 'badge bg-secondary';
  }

  onScopeChange(ep: PlatformApiEndpoint, value: string): void {
    const newScope = value === '' ? null : value;
    if (newScope === ep.effectiveScope) return;
    this.saving.set(ep.key);
    this.api.updateEndpointScope(ep.key, newScope).subscribe({
      next: (r) => {
        this.allItems.update((items) =>
          items.map((i) =>
            i.key === ep.key ? { ...i, effectiveScope: r.effectiveScope, isOverridden: r.isOverridden } : i,
          ),
        );
        this.saving.set(null);
      },
      error: () => this.saving.set(null),
    });
  }

  onRestoreDefault(ep: PlatformApiEndpoint): void {
    this.saving.set(ep.key);
    this.api.updateEndpointScope(ep.key, ep.defaultScope).subscribe({
      next: (r) => {
        this.allItems.update((items) =>
          items.map((i) =>
            i.key === ep.key ? { ...i, effectiveScope: r.effectiveScope, isOverridden: r.isOverridden } : i,
          ),
        );
        this.saving.set(null);
      },
      error: () => this.saving.set(null),
    });
  }
}
