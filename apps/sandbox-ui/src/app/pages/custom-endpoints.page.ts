import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { map, merge } from 'rxjs';
import {
  aiEndpointProductionRequestStateLabel,
  developerAiEndpointLifecycleLabel,
  genericRowStatusLabel,
} from '../lib/custom-endpoint-catalog-labels';
import { SandboxPortalService, SandboxSession } from '../services/sandbox-portal.service';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CustomEndpointsMode = 'list' | 'new' | 'focus';

type EndpointListItem = {
  id: string;
  slug: string;
  statusId: string;
  approvedProductionVersionId: string | null;
  createdAt: string;
};

function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const b = err.error;
    if (b && typeof b === 'object' && 'message' in b && typeof (b as { message: unknown }).message === 'string') {
      return (b as { message: string }).message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Request failed';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-custom-endpoints',
  imports: [RouterLink, DatePipe],
  template: `
    <main class="spectra-page sandbox-custom-endpoints">
      <header class="ce-head">
        <div class="ce-head-text">
          <h1>Custom API endpoints</h1>
          <p class="lede">Sandbox AI endpoints (staff approval → production M2M).</p>
        </div>
        <div class="ce-head-actions">
          <a routerLink="/dashboard" class="btn btn-outline-secondary">← Dashboard</a>
          @if (mode() !== 'list') {
            <a routerLink="/custom-endpoints" class="btn btn-outline-secondary">All endpoints</a>
          }
          @if (mode() === 'list') {
            <a routerLink="/custom-endpoints/new" class="btn btn-primary">New draft</a>
          }
        </div>
      </header>

      @if (bootstrapError()) {
        <p class="spectra-auth-error">{{ bootstrapError() }}</p>
      } @else if (bootstrapLoading()) {
        <p>Preparing tenant…</p>
      } @else {
        @if (pageError()) {
          <p class="spectra-auth-error">{{ pageError() }}</p>
        }

        @if (mode() === 'list' && sandboxAiEndpointsEnabled()) {
          <section class="int-card mb-4" aria-labelledby="ce-openapi-heading">
            <h2 id="ce-openapi-heading" class="h5">Org preview OpenAPI</h2>
            <p class="text-muted small mb-2">
              Downloads a single OpenAPI 3.0.3 file that merges <strong>all</strong> of your org's custom endpoints
              (each endpoint's <strong>latest</strong> revision) into one document — ready to import into Swagger UI,
              Postman, or an SDK generator to explore and call them as one API.
            </p>
            <p class="text-muted small">
              It does <strong>not</strong> publish anything: it is a session-authenticated, org-private preview that
              may include <strong>draft</strong> paths and uses the latest revision (not necessarily the
              production-approved version). This is not the public integrator catalog.
            </p>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="openapiDownloading()"
              (click)="downloadOpenApi()"
            >
              Download merged OpenAPI (JSON)
            </button>
            @if (openapiError()) {
              <p class="form-error mt-2">{{ openapiError() }}</p>
            }
          </section>
        }

        @if (mode() === 'new') {
          <section class="int-card mb-4" aria-labelledby="ce-create-heading">
            <h2 id="ce-create-heading" class="h5">Create draft</h2>
            <div class="form-group">
              <label for="ce-slug">Slug</label>
              <input
                id="ce-slug"
                class="form-control"
                type="text"
                autocomplete="off"
                [value]="createSlug()"
                (input)="onCreateSlugInput($event)"
              />
              <span class="text-muted small">Lowercase letters, digits, hyphens; 2–64 characters.</span>
            </div>
            <div class="form-group">
              <label for="ce-prompt">Instructions</label>
              <textarea
                id="ce-prompt"
                class="form-control"
                rows="4"
                [value]="createUserPrompt()"
                (input)="onCreateUserPromptInput($event)"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="ce-model">Model ID (optional)</label>
              <input
                id="ce-model"
                class="form-control"
                type="text"
                autocomplete="off"
                [value]="createModelId()"
                (input)="onCreateModelIdInput($event)"
              />
            </div>
            @if (createError()) {
              <p class="form-error">{{ createError() }}</p>
            }
            <div class="ce-create-actions">
              <button type="button" class="btn btn-primary" [disabled]="createSubmitting()" (click)="submitCreate()">
                Create
              </button>
            </div>
          </section>
        }

        @if (mode() === 'focus') {
          @if (focusBadUuid()) {
            <p class="spectra-auth-error">That URL is not a valid endpoint id.</p>
            <a routerLink="/custom-endpoints" class="btn btn-primary">Back to list</a>
          } @else if (focusNotFound()) {
            <p class="spectra-auth-error">Endpoint not found or not accessible.</p>
            <a routerLink="/custom-endpoints" class="btn btn-primary">Back to list</a>
          } @else if (focusLoading()) {
            <p>Loading endpoint…</p>
          } @else {
            <section class="int-card mb-4">
              <h2 class="h5">{{ focusSlug() }}</h2>
              <p class="text-muted small">
                Lifecycle: <strong>{{ focusEndpointLifecycleLabel() }}</strong>
                @if (focusApprovedVersionId()) {
                  · Approved production version <code>{{ focusApprovedVersionId() }}</code>
                }
              </p>
              <p class="text-muted small">Created {{ focusEndpointCreatedAt() | date: 'medium' }}</p>

              <h3 class="h6 mt-3">Versions</h3>
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Rev</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Instructions</th>
                      <th>Spec</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (v of focusVersions(); track v['_rowKey']) {
                      <tr>
                        <td>{{ v['revision'] }}</td>
                        <td>{{ versionCreatedAt(v) | date: 'medium' }}</td>
                        <td>{{ versionStatusLabel(v) }}</td>
                        <td>
                          <span class="small">{{ clipPrompt(v['userPrompt']) }}</span>
                          @if (promptLen(v['userPrompt']) > 160) {
                            <details class="small">
                              <summary>Full text</summary>
                              <pre class="small text-wrap">{{ v['userPrompt'] }}</pre>
                            </details>
                          }
                        </td>
                        <td>
                          <pre class="ce-spec-pre small">{{ formatJson(v['spec']) }}</pre>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>

            <section class="int-card mb-4" aria-labelledby="ce-par-heading">
              <h2 id="ce-par-heading" class="h6">Production approval</h2>
              @if (approvalLoading()) {
                <p class="text-muted small">Loading…</p>
              } @else if (approvalError()) {
                <p class="form-error">{{ approvalError() }}</p>
              } @else if (approvalRequest() === undefined) {
                <p class="text-muted small">Loading…</p>
              } @else if (approvalRequest() === null) {
                <p class="small">
                  No production approval request yet. Use Submit for production to create one.
                </p>
              } @else {
                <p class="small">
                  State:
                  <strong>{{ approvalRequestStateLabel() }}</strong>
                  @if (approvalRequestUpdated(); as au) {
                    · Updated {{ au | date: 'medium' }}
                  }
                </p>
                <pre class="ce-spec-pre small">{{ formatJson(approvalRequest()) }}</pre>
              }
            </section>

            <section class="int-card mb-4" aria-labelledby="ce-try-heading">
              <h2 id="ce-try-heading" class="h6">Try it</h2>
              <div class="form-group">
                <label for="ce-invoke-json">Request JSON</label>
                <textarea
                  id="ce-invoke-json"
                  class="form-control font-monospace"
                  rows="5"
                  [value]="tryBodyText()"
                  (input)="onTryBodyInput($event)"
                ></textarea>
              </div>
              <div class="form-group">
                <label for="ce-invoke-rev">Revision (optional)</label>
                <input
                  id="ce-invoke-rev"
                  class="form-control"
                  type="text"
                  inputmode="numeric"
                  [value]="tryRevisionText()"
                  (input)="onTryRevisionInput($event)"
                />
              </div>
              @if (tryParseError()) {
                <p class="form-error">{{ tryParseError() }}</p>
              }
              @if (tryApiError()) {
                <p class="form-error">{{ tryApiError() }}</p>
              }
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="trySending()"
                (click)="sendTryIt()"
              >
                Send
              </button>
              @if (tryResultStatus() !== null) {
                <p class="mt-2 small"><strong>HTTP {{ tryResultStatus() }}</strong></p>
                <pre class="ce-spec-pre small">{{ tryResultBodyText() }}</pre>
              }
            </section>
          }
        }

        @if (mode() === 'list' && !listLoading()) {
          <p class="ce-tenant text-muted small">Tenant <code>{{ tenantId() ?? '—' }}</code></p>
          <div class="table-responsive ce-table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (e of items(); track e.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/custom-endpoints', e.id]">{{ e.slug }}</a>
                    </td>
                    <td>{{ endpointLifecycleLabel(e.statusId) }}</td>
                    <td>{{ e.createdAt | date: 'medium' }}</td>
                    <td class="ce-row-actions">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        [disabled]="isGenerating(e.id)"
                        (click)="generate(e.id)"
                      >
                        Generate
                      </button>
                      @if (!e.approvedProductionVersionId) {
                        <button
                          type="button"
                          class="btn btn-sm btn-primary"
                          [disabled]="submittingId() === e.id"
                          (click)="submitApproval(e.id)"
                        >
                          Submit for production
                        </button>
                      }
                      <details class="d-inline-block">
                        <summary class="small">Update instructions</summary>
                        <div class="py-2" style="min-width: 12rem;">
                          <textarea
                            class="form-control form-control-sm"
                            rows="2"
                            [value]="promptOverrideByEndpoint()[e.id] || ''"
                            (input)="onPromptOverrideInput(e.id, $event)"
                            placeholder="Optional prompt override"
                          ></textarea>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary mt-1"
                            [disabled]="isGenerating(e.id)"
                            (click)="generateWithOverride(e.id)"
                          >
                            Generate with override
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (items().length === 0) {
            <p class="ce-empty text-muted">No endpoints yet. Use <strong>New draft</strong> to create one.</p>
          }
        } @else if (mode() === 'list' && listLoading()) {
          <p>Loading…</p>
        }
      }
    </main>
  `,
  styles: [
    `
      .sandbox-custom-endpoints {
        max-width: var(--spectra-max-width);
        padding-top: 1rem;
      }
      .sandbox-custom-endpoints .int-card {
        padding: 1.25rem 1.5rem;
      }
      .sandbox-custom-endpoints .int-card > h2:first-child {
        margin-top: 0;
      }
      .sandbox-custom-endpoints .form-group {
        margin-bottom: 1.25rem;
      }
      .sandbox-custom-endpoints .form-group:last-of-type {
        margin-bottom: 0;
      }
      .ce-head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .ce-head-text {
        min-width: 16rem;
      }
      .ce-head-text h1 {
        margin-bottom: 0.25rem;
      }
      .ce-head-text .lede {
        margin-bottom: 0;
      }
      .ce-head-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .ce-tenant {
        margin-bottom: 0.5rem;
      }
      .ce-table-wrap {
        margin-bottom: 1rem;
      }
      .ce-row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        align-items: flex-start;
      }
      .ce-empty {
        margin: 0.5rem 0 0;
      }
      .ce-create-actions {
        margin-top: 1.25rem;
      }
      .ce-spec-pre {
        max-height: 14rem;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `,
  ],
})
export class CustomEndpointsPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = toSignal(
    this.route.data.pipe(map((d) => d['customEndpointsMode'] as CustomEndpointsMode)),
    { initialValue: this.route.snapshot.data['customEndpointsMode'] as CustomEndpointsMode },
  );

  readonly focusEndpointId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  readonly bootstrapLoading = signal(true);
  readonly bootstrapError = signal<string | null>(null);
  readonly pageError = signal<string | null>(null);
  readonly listLoading = signal(false);
  readonly tenantId = signal<string | null>(null);
  readonly items = signal<EndpointListItem[]>([]);

  readonly sandboxAiEndpointsEnabled = signal(false);

  readonly createSlug = signal('');
  readonly createUserPrompt = signal('');
  readonly createModelId = signal('');
  readonly createError = signal<string | null>(null);
  readonly createSubmitting = signal(false);

  readonly generatingById = signal<Record<string, boolean>>({});
  readonly promptOverrideByEndpoint = signal<Record<string, string>>({});
  readonly submittingId = signal<string | null>(null);

  readonly openapiDownloading = signal(false);
  readonly openapiError = signal<string | null>(null);

  readonly focusLoading = signal(false);
  readonly focusNotFound = signal(false);
  readonly focusBadUuid = signal(false);
  readonly focusSlug = signal('');
  readonly focusEndpointLifecycleLabel = signal('');
  readonly focusApprovedVersionId = signal<string | null>(null);
  readonly focusEndpointCreatedAt = signal<string | null>(null);
  readonly focusVersions = signal<Record<string, unknown>[]>([]);

  readonly approvalLoading = signal(false);
  readonly approvalError = signal<string | null>(null);
  readonly approvalRequest = signal<Record<string, unknown> | null | undefined>(undefined);

  readonly tryBodyText = signal('{}');
  readonly tryRevisionText = signal('');
  readonly tryParseError = signal<string | null>(null);
  readonly tryApiError = signal<string | null>(null);
  readonly trySending = signal(false);
  readonly tryResultStatus = signal<number | null>(null);
  readonly tryResultBodyText = signal('');

  constructor() {
    this.api.session().subscribe({
      next: (s: SandboxSession) => this.sandboxAiEndpointsEnabled.set(s.sandboxAiEndpointsEnabled === true),
      error: () => this.sandboxAiEndpointsEnabled.set(false),
    });

    this.api
      .ensureRuntimeTenant()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.bootstrapLoading.set(false);
          this.bootstrapError.set(null);
          this.refreshListFromRoute();
        },
        error: (e: unknown) => {
          this.bootstrapLoading.set(false);
          this.bootstrapError.set(apiErrorMessage(e));
        },
      });

    merge(this.route.data, this.route.paramMap)
      .pipe(
        map(() => ({ mode: this.route.snapshot.data['customEndpointsMode'] as CustomEndpointsMode, id: this.route.snapshot.paramMap.get('id') })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.pageError.set(null);
        this.refreshListFromRoute();
      });

    effect(() => {
      const m = this.mode();
      const id = this.focusEndpointId();
      if (m !== 'focus' || !id) {
        untracked(() => {
          this.focusBadUuid.set(false);
          this.focusNotFound.set(false);
          if (m !== 'focus') {
            this.resetFocusPanels();
          }
        });
        return;
      }
      if (!UUID_RE.test(id)) {
        untracked(() => {
          this.focusBadUuid.set(true);
          this.focusNotFound.set(false);
          this.focusLoading.set(false);
        });
        return;
      }
      untracked(() => this.loadFocus(id));
    });
  }

  onCreateSlugInput(ev: Event): void {
    this.createSlug.set((ev.target as HTMLInputElement).value ?? '');
  }

  onCreateUserPromptInput(ev: Event): void {
    this.createUserPrompt.set((ev.target as HTMLTextAreaElement).value ?? '');
  }

  onCreateModelIdInput(ev: Event): void {
    this.createModelId.set((ev.target as HTMLInputElement).value ?? '');
  }

  onTryBodyInput(ev: Event): void {
    this.tryBodyText.set((ev.target as HTMLTextAreaElement).value ?? '');
  }

  onTryRevisionInput(ev: Event): void {
    this.tryRevisionText.set((ev.target as HTMLInputElement).value ?? '');
  }

  private resetFocusPanels(): void {
    this.focusLoading.set(false);
    this.focusNotFound.set(false);
    this.focusBadUuid.set(false);
    this.focusSlug.set('');
    this.focusEndpointLifecycleLabel.set('');
    this.focusApprovedVersionId.set(null);
    this.focusEndpointCreatedAt.set(null);
    this.focusVersions.set([]);
    this.approvalRequest.set(undefined);
    this.approvalError.set(null);
    this.tryResultStatus.set(null);
    this.tryResultBodyText.set('');
    this.tryParseError.set(null);
    this.tryApiError.set(null);
  }

  private refreshListFromRoute(): void {
    if (this.bootstrapLoading() || this.bootstrapError()) return;
    if (this.mode() !== 'list') return;
    this.reloadList();
  }

  reloadList(): void {
    this.listLoading.set(true);
    this.pageError.set(null);
    this.api.listCustomAiEndpoints().subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.tenantId.set(r.tenantId);
        this.listLoading.set(false);
      },
      error: (e: unknown) => {
        this.listLoading.set(false);
        this.pageError.set(apiErrorMessage(e));
      },
    });
  }

  private loadFocus(id: string): void {
    this.focusBadUuid.set(false);
    this.focusLoading.set(true);
    this.focusNotFound.set(false);
    this.approvalRequest.set(undefined);
    this.approvalLoading.set(true);
    this.approvalError.set(null);

    this.api.getCustomAiEndpoint(id).subscribe({
      next: (r) => {
        const ep = r.endpoint as Record<string, unknown>;
        const versions = (r.versions as Record<string, unknown>[]).map((row, i) => ({
          ...row,
          _rowKey: `${String(row['revision'])}-${i}`,
        }));
        this.focusSlug.set(String(ep['slug'] ?? ''));
        this.focusEndpointLifecycleLabel.set(developerAiEndpointLifecycleLabel(String(ep['statusId'] ?? '')));
        this.focusApprovedVersionId.set(
          ep['approvedProductionVersionId'] === null || ep['approvedProductionVersionId'] === undefined ?
            null
          : String(ep['approvedProductionVersionId']),
        );
        this.focusEndpointCreatedAt.set(ep['createdAt'] ? String(ep['createdAt']) : null);
        this.focusVersions.set(versions);
        this.focusLoading.set(false);
      },
      error: (e: unknown) => {
        this.focusLoading.set(false);
        if (e instanceof HttpErrorResponse && e.status === 404) {
          this.focusNotFound.set(true);
        } else {
          this.pageError.set(apiErrorMessage(e));
        }
      },
    });

    this.api.getCustomEndpointApproval(id).subscribe({
      next: (r) => {
        this.approvalRequest.set((r.request ?? null) as Record<string, unknown> | null);
        this.approvalLoading.set(false);
      },
      error: (e: unknown) => {
        this.approvalLoading.set(false);
        this.approvalError.set(apiErrorMessage(e));
      },
    });
  }

  versionStatusLabel(v: Record<string, unknown>): string {
    return genericRowStatusLabel(String(v['statusId'] ?? ''));
  }

  versionCreatedAt(v: Record<string, unknown>): string | number | Date | null {
    const x = v['createdAt'];
    if (x instanceof Date) return x;
    if (typeof x === 'string' || typeof x === 'number') return x;
    return null;
  }

  endpointLifecycleLabel(statusId: string): string {
    return developerAiEndpointLifecycleLabel(statusId);
  }

  clipPrompt(v: unknown): string {
    const s = typeof v === 'string' ? v : '';
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  }

  promptLen(v: unknown): number {
    return typeof v === 'string' ? v.length : 0;
  }

  formatJson(v: unknown): string {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }

  approvalRequestStateLabel(): string {
    const req = this.approvalRequest();
    if (!req || typeof req !== 'object') return '';
    const sid = req['statusId'];
    return typeof sid === 'string' ? aiEndpointProductionRequestStateLabel(sid) : '';
  }

  approvalRequestUpdated(): string | null {
    const req = this.approvalRequest();
    if (!req || typeof req !== 'object') return null;
    const u = req['updatedAt'];
    return typeof u === 'string' ? u : null;
  }

  isGenerating(id: string): boolean {
    return Boolean(this.generatingById()[id]);
  }

  onPromptOverrideInput(id: string, ev: Event): void {
    const v = (ev.target as HTMLTextAreaElement).value;
    this.promptOverrideByEndpoint.set({ ...this.promptOverrideByEndpoint(), [id]: v });
  }

  generateWithOverride(id: string): void {
    const raw = this.promptOverrideByEndpoint()[id]?.trim() ?? '';
    this.generate(id, raw || undefined);
  }

  generate(id: string, overridePrompt?: string): void {
    const trimmed = overridePrompt?.trim() ?? '';
    const body = trimmed ? { userPrompt: trimmed } : undefined;
    const next = { ...this.generatingById(), [id]: true };
    this.generatingById.set(next);
    this.api.generateCustomAiEndpoint(id, body).subscribe({
      next: () => {
        this.generatingById.set({ ...this.generatingById(), [id]: false });
        this.toastr.success('New revision generated.', 'Generate');
        if (this.mode() === 'list') this.reloadList();
        else if (this.mode() === 'focus') {
          const fid = this.focusEndpointId();
          if (fid) this.loadFocus(fid);
        }
      },
      error: (e: unknown) => {
        this.generatingById.set({ ...this.generatingById(), [id]: false });
        this.toastr.error(apiErrorMessage(e), 'Generate failed');
      },
    });
  }

  submitApproval(id: string): void {
    this.submittingId.set(id);
    this.api.submitCustomEndpointApproval(id).subscribe({
      next: () => {
        this.api.getCustomEndpointApproval(id).subscribe({
          next: () => {
            this.submittingId.set(null);
            if (this.mode() === 'list') this.reloadList();
            else if (this.mode() === 'focus') this.loadFocus(id);
          },
          error: () => {
            this.submittingId.set(null);
            if (this.mode() === 'list') this.reloadList();
            else if (this.mode() === 'focus') this.loadFocus(id);
          },
        });
      },
      error: (e: unknown) => {
        this.submittingId.set(null);
        this.pageError.set(apiErrorMessage(e));
      },
    });
  }

  submitCreate(): void {
    const slug = this.createSlug().trim();
    const userPrompt = this.createUserPrompt().trim();
    const modelRaw = this.createModelId().trim();
    this.createError.set(null);
    if (!SLUG_RE.test(slug)) {
      this.createError.set('Slug must be lowercase letters, digits, hyphens (2–64 chars).');
      return;
    }
    if (!userPrompt) {
      this.createError.set('Instructions are required.');
      return;
    }
    let modelId: string | undefined;
    if (modelRaw) {
      if (!UUID_RE.test(modelRaw)) {
        this.createError.set('Model ID must be a UUID when provided.');
        return;
      }
      modelId = modelRaw;
    }
    this.createSubmitting.set(true);
    this.api
      .createCustomAiEndpoint(modelId ? { slug, userPrompt, modelId } : { slug, userPrompt })
      .subscribe({
        next: (res) => {
          this.createSubmitting.set(false);
          const newId = (res.endpoint as { id?: string })?.id;
          if (newId) void this.router.navigate(['/custom-endpoints', newId]);
          else void this.router.navigate(['/custom-endpoints']);
        },
        error: (e: unknown) => {
          this.createSubmitting.set(false);
          this.createError.set(apiErrorMessage(e));
        },
      });
  }

  downloadOpenApi(): void {
    this.openapiDownloading.set(true);
    this.openapiError.set(null);
    this.api.getMergedSandboxCustomEndpointsOpenApi().subscribe({
      next: (doc) => {
        this.openapiDownloading.set(false);
        const json = JSON.stringify(doc, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sandbox-custom-endpoints-openapi.json';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e: unknown) => {
        this.openapiDownloading.set(false);
        this.openapiError.set(apiErrorMessage(e));
      },
    });
  }

  sendTryIt(): void {
    const endpointId = this.focusEndpointId();
    if (!endpointId) return;
    this.tryParseError.set(null);
    this.tryApiError.set(null);
    this.tryResultStatus.set(null);
    this.tryResultBodyText.set('');
    let parsed: object;
    try {
      parsed = JSON.parse(this.tryBodyText()) as object;
    } catch {
      this.tryParseError.set('Request body must be valid JSON.');
      return;
    }
    const revRaw = this.tryRevisionText().trim();
    let revision: number | undefined;
    if (revRaw) {
      const n = Number.parseInt(revRaw, 10);
      if (!Number.isFinite(n)) {
        this.tryParseError.set('Revision must be a finite integer.');
        return;
      }
      const allowed = new Set(
        this.focusVersions().map((v) => (typeof v['revision'] === 'number' ? v['revision'] : Number(v['revision']))),
      );
      if (!allowed.has(n)) {
        this.tryParseError.set('Revision must match a loaded version revision.');
        return;
      }
      revision = n;
    }
    this.trySending.set(true);
    this.api.invokeCustomAiEndpointPreview(endpointId, parsed, revision).subscribe({
      next: (resp) => {
        this.trySending.set(false);
        this.tryResultStatus.set(resp.status);
        const body = resp.body;
        this.tryResultBodyText.set(
          typeof body === 'object' && body !== null ? JSON.stringify(body, null, 2) : String(body ?? ''),
        );
      },
      error: (e: unknown) => {
        this.trySending.set(false);
        if (e instanceof HttpErrorResponse) {
          this.tryResultStatus.set(e.status);
          const b = e.error;
          this.tryResultBodyText.set(
            typeof b === 'object' && b !== null ? JSON.stringify(b, null, 2) : String(b ?? ''),
          );
          this.tryApiError.set(apiErrorMessage(e));
        } else {
          this.tryApiError.set(apiErrorMessage(e));
        }
      },
    });
  }
}
