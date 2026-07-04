import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SpectraIconComponent } from '@spectra/shared-ui';
import { ToastrService } from 'ngx-toastr';
import { catchError, debounceTime, distinctUntilChanged, filter, map, merge, of, Subject, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  aiEndpointProductionRequestStateLabel,
  developerAiEndpointLifecycleLabel,
  genericRowStatusLabel,
} from '../lib/custom-endpoint-catalog-labels';
import { SandboxPortalService, SandboxSession } from '../services/sandbox-portal.service';

/** A preview response from the dry-run endpoint. */
type EndpointPreview = {
  spec: Record<string, unknown>;
  result: unknown;
  httpStatus: number;
  slugSuggestion: string;
};

/** Extracts `{ table, rows }` from a fixture-read preview result, if present. */
function previewRows(result: unknown): { table: string | null; rows: Record<string, unknown>[] } | null {
  if (!result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  if (!Array.isArray(r['rows'])) return null;
  return { table: typeof r['table'] === 'string' ? r['table'] : null, rows: r['rows'] as Record<string, unknown>[] };
}

/** Returns the userPrompt of the highest-revision version, or '' if none. */
function latestUserPrompt(versions: Record<string, unknown>[]): string {
  let best: { rev: number; prompt: string } | null = null;
  for (const v of versions) {
    const rev = typeof v['revision'] === 'number' ? v['revision'] : -1;
    const prompt = typeof v['userPrompt'] === 'string' ? v['userPrompt'] : '';
    if (!best || rev > best.rev) best = { rev, prompt };
  }
  return best?.prompt ?? '';
}

/** Slugifies the first few words of a string into a slug base (no uniqueness suffix). */
function slugifyBase(text: string): string {
  const base = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return base.length >= 2 ? base : 'endpoint';
}

/** Short, URL-safe suffix keeping auto-generated slugs unique per draft. */
function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 6) || 'a1b2';
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CustomEndpointsMode = 'list' | 'new' | 'focus';

type EndpointListItem = {
  id: string;
  slug: string;
  statusId: string;
  approvedProductionVersionId: string | null;
  createdAt: string;
  /** True when an open production request exists (pending review / needs info / awaiting user). */
  pendingProductionRequest: boolean;
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
  imports: [RouterLink, DatePipe, SpectraIconComponent],
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
            <button
              type="button"
              class="btn btn-outline-secondary"
              [disabled]="reseeding()"
              title="Delete and regenerate this org's MRP demo dataset"
              (click)="resetDemoData()"
            >
              {{ reseeding() ? 'Resetting…' : 'Reset demo data' }}
            </button>
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
              <label for="ce-prompt">Instructions</label>
              <textarea
                id="ce-prompt"
                class="form-control"
                rows="4"
                placeholder="Describe what this endpoint should return, e.g. 'List purchased items with lead time over 5 days, showing sku, description and lead time'."
                [value]="createUserPrompt()"
                (input)="onCreateUserPromptInput($event)"
              ></textarea>
              <span class="text-muted small">
                Plain-language instructions — the preview below updates as you type (about a second after you pause).
              </span>
            </div>

            <div class="form-group">
              <label for="ce-slug">Slug <span class="text-muted small">(optional — auto-generated if blank)</span></label>
              <input
                id="ce-slug"
                class="form-control"
                type="text"
                autocomplete="off"
                [value]="createSlug()"
                (input)="onCreateSlugInput($event)"
              />
              <p class="ce-url">
                <span class="ce-url-label">Endpoint URL</span>
                <code class="ce-url-value">{{ endpointUrl() }}</code>
              </p>
            </div>

            <div class="ce-preview-head">
              <h3 class="h6 mb-0">Sample data preview</h3>
              <div class="ce-preview-actions">
                @if (previewLoading()) {
                  <span class="text-muted small">Generating…</span>
                }
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  [disabled]="previewLoading() || createUserPrompt().trim().length < 10"
                  (click)="runPreview()"
                >
                  Run preview
                </button>
              </div>
            </div>
            @if (previewError()) {
              <p class="form-error">{{ previewError() }}</p>
            }
            @if (previewResult(); as pv) {
              <div class="ce-tabs" role="tablist" aria-label="Preview format">
                <button
                  type="button"
                  role="tab"
                  class="ce-tab"
                  [class.active]="previewTab() === 'list'"
                  [attr.aria-selected]="previewTab() === 'list'"
                  (click)="previewTab.set('list')"
                >
                  List
                </button>
                <button
                  type="button"
                  role="tab"
                  class="ce-tab"
                  [class.active]="previewTab() === 'json'"
                  [attr.aria-selected]="previewTab() === 'json'"
                  (click)="previewTab.set('json')"
                >
                  JSON
                </button>
              </div>

              @if (previewTab() === 'list') {
                @if (previewTable(); as t) {
                  @if (t.rows.length === 0) {
                    <p class="text-muted small">No rows match — try adjusting the instructions.</p>
                  } @else {
                    <div class="table-responsive">
                      <table class="table table-sm">
                        <thead>
                          <tr>
                            @for (col of previewColumns(); track col) {
                              <th>{{ col }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of t.rows; track $index) {
                            <tr>
                              @for (col of previewColumns(); track col) {
                                <td>{{ formatCell(row[col]) }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <p class="text-muted small">{{ t.rows.length }} row(s){{ t.table ? ' from ' + t.table : '' }}.</p>
                  }
                } @else {
                  <p class="text-muted small">This preview is not a row list — see the JSON tab.</p>
                }
              } @else {
                <pre class="ce-spec-pre small">{{ formatJson({ spec: pv.spec, result: pv.result }) }}</pre>
              }
            } @else if (!previewLoading()) {
              <p class="text-muted small">Start typing instructions to see a live sample.</p>
            }

            @if (createError()) {
              <p class="form-error">{{ createError() }}</p>
            }
            <div class="ce-create-actions">
              <button type="button" class="btn btn-primary" [disabled]="createSubmitting()" (click)="submitCreate()">
                {{ createSubmitting() ? 'Creating…' : 'Create' }}
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
                      <th class="ce-actions-col">Actions</th>
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
                          <div class="ce-actions">
                            <button
                              type="button"
                              class="icon-btn"
                              title="View spec (JSON)"
                              aria-label="View spec JSON for revision {{ v['revision'] }}"
                              (click)="openSpecModal(v)"
                            >
                              <spectra-icon name="code" />
                            </button>
                          </div>
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

            @if (specModalVersion(); as sv) {
              <div class="modal-backdrop" role="presentation" (click)="closeSpecModal()"></div>
              <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ce-spec-modal-title">
                <h2 id="ce-spec-modal-title">Spec — revision {{ sv['revision'] }}</h2>
                <pre class="ce-spec-modal-pre small">{{ formatJson(sv['spec']) }}</pre>
                <div class="modal-actions">
                  <button type="button" class="btn btn-outline-secondary" (click)="closeSpecModal()">Close</button>
                </div>
              </div>
            }
          }
        }

        @if (mode() === 'list' && !listLoading()) {
          <div class="ce-list-toolbar">
            <p class="ce-tenant text-muted small mb-0">Tenant <code>{{ tenantId() ?? '—' }}</code></p>
            <input
              type="search"
              class="form-control form-control-sm ce-search"
              placeholder="Filter by slug or status…"
              [value]="listSearch()"
              (input)="onListSearchInput($event)"
              aria-label="Filter endpoints"
            />
          </div>

          <div class="table-responsive ce-table-wrap">
            <table class="table table-hover align-middle ce-list-table">
              <thead>
                <tr>
                  <th class="ce-sortable" (click)="toggleSort('slug')" [attr.aria-sort]="ariaSort('slug')">
                    Slug{{ sortIndicator('slug') }}
                  </th>
                  <th class="ce-sortable" (click)="toggleSort('status')" [attr.aria-sort]="ariaSort('status')">
                    Status{{ sortIndicator('status') }}
                  </th>
                  <th class="ce-sortable" (click)="toggleSort('created')" [attr.aria-sort]="ariaSort('created')">
                    Created{{ sortIndicator('created') }}
                  </th>
                  <th class="ce-actions-col text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (e of visibleEndpoints(); track e.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/custom-endpoints', e.id]" class="fw-semibold">{{ e.slug }}</a>
                    </td>
                    <td>
                      <span class="badge {{ statusBadgeClass(e.statusId) }}">{{ endpointLifecycleLabel(e.statusId) }}</span>
                      @if (e.approvedProductionVersionId) {
                        <span class="badge text-bg-success ms-1" title="Has an approved production version">Prod</span>
                      }
                    </td>
                    <td class="text-nowrap small text-muted">{{ e.createdAt | date: 'medium' }}</td>
                    <td class="ce-actions-col">
                      <div class="ce-actions justify-content-end">
                        <button
                          type="button"
                          class="icon-btn"
                          title="Regenerate (edit instructions or re-run as-is)"
                          aria-label="Regenerate {{ e.slug }}"
                          [disabled]="isGenerating(e.id)"
                          (click)="openRegenerate(e.id)"
                        >
                          <spectra-icon name="pencil" />
                        </button>
                        @if (!e.approvedProductionVersionId) {
                          <button
                            type="button"
                            class="icon-btn"
                            [class.icon-btn--pending]="e.pendingProductionRequest"
                            [title]="!hasAnyIntegration() ? 'Create an integration before submitting for production' : e.pendingProductionRequest ? 'Submission in progress — resubmit latest revision' : 'Submit for production'"
                            [attr.aria-label]="
                              !hasAnyIntegration() ? 'No integration — create one before submitting ' + e.slug + ' for production' :
                              (e.pendingProductionRequest ? 'Submission in progress for ' : 'Submit ') + e.slug + ' for production'
                            "
                            [disabled]="submittingId() === e.id || !hasAnyIntegration()"
                            (click)="openSubmit(e.id)"
                          >
                            <spectra-icon name="document" />
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
                @if (visibleEndpoints().length === 0) {
                  <tr>
                    <td colspan="4" class="text-center text-muted py-3">
                      @if (items().length === 0) {
                        No endpoints yet. Use <strong>New draft</strong> to create one.
                      } @else {
                        No endpoints match “{{ listSearch() }}”.
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (items().length > 0) {
            <p class="text-muted small ce-list-count">
              Showing {{ visibleEndpoints().length }} of {{ items().length }} endpoint(s)
            </p>
          }

          @if (regenModalId(); as rid) {
            <div class="modal-backdrop" role="presentation" (click)="closeRegenerate()"></div>
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ce-regen-title">
              <h2 id="ce-regen-title" class="h5">Regenerate endpoint</h2>
              <p class="text-muted small">
                Edit the instructions for <code>{{ regenModalSlug() }}</code> and regenerate, or leave them as-is to
                re-run the AI. Either way this creates a <strong>new revision</strong>.
              </p>
              @if (regenLoading()) {
                <p class="text-muted small mb-0">Loading current instructions…</p>
              } @else {
                <textarea
                  class="form-control"
                  rows="5"
                  [value]="promptOverrideByEndpoint()[rid] || ''"
                  (input)="onPromptOverrideInput(rid, $event)"
                  placeholder="Describe what this endpoint should return…"
                ></textarea>
              }
              <div class="modal-actions">
                <button type="button" class="btn btn-outline-secondary" (click)="closeRegenerate()">Cancel</button>
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="regenLoading() || isGenerating(rid)"
                  (click)="confirmRegenerate()"
                >
                  {{ isGenerating(rid) ? 'Regenerating…' : 'Regenerate' }}
                </button>
              </div>
            </div>
          }

          @if (submitModalId(); as sid) {
            <div class="modal-backdrop" role="presentation" (click)="closeSubmit()"></div>
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ce-submit-title">
              <h2 id="ce-submit-title" class="h5">Submit for production</h2>
              @if (submitModalPending()) {
                <div class="alert alert-warning py-2 small mb-3">
                  A submission for <code>{{ submitModalSlug() }}</code> is already in progress. Submitting again replaces it
                  with your current latest revision and restarts staff review.
                </div>
              }
              <p class="small mb-2">
                This sends the <strong>latest revision</strong> of <code>{{ submitModalSlug() }}</code> to Spectra staff
                for production approval. Once approved it becomes callable via production M2M.
              </p>
              <p class="small text-muted mb-0">
                The request is pinned to the revision as it is now. If you generate <strong>any new revisions</strong> after
                submitting, they are <strong>not</strong> part of this request — the pending submission is superseded and
                you must resubmit to include them.
              </p>
              <div class="alert alert-info py-2 small mt-3 mb-0">
                Your integration must also have an approved production access request before this endpoint is callable via M2M.
                Go to <strong>Integrations → Production access</strong> if you haven't submitted one yet.
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-outline-secondary" (click)="closeSubmit()">Cancel</button>
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="submittingId() === sid"
                  (click)="confirmSubmit()"
                >
                  {{ submittingId() === sid ? 'Submitting…' : submitModalPending() ? 'Resubmit' : 'Submit for production' }}
                </button>
              </div>
            </div>
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
      .ce-list-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .ce-search {
        flex: 1 1 16rem;
        max-width: 24rem;
      }
      .ce-list-table th.ce-sortable {
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
      }
      /* Amber submit icon when a production submission is in progress. */
      .icon-btn.icon-btn--pending {
        background: #fde68a;
        color: #92400e;
      }
      .ce-list-count {
        margin-top: 0.5rem;
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
      .ce-url {
        margin: 0.5rem 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        align-items: baseline;
      }
      .ce-url-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--spectra-color-navy);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .ce-url-value {
        font-size: 0.82rem;
        word-break: break-all;
        color: var(--spectra-color-text);
      }
      .ce-preview-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin: 1.25rem 0 0.5rem;
      }
      .ce-preview-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .ce-tabs {
        display: flex;
        gap: 0.25rem;
        border-bottom: 1px solid var(--spectra-color-border);
        margin-bottom: 0.75rem;
      }
      .ce-tab {
        border: none;
        background: transparent;
        padding: 0.4rem 0.8rem;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--spectra-color-muted);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
      }
      .ce-tab.active {
        color: var(--spectra-color-navy);
        border-bottom-color: var(--spectra-color-accent);
      }
      .ce-spec-pre {
        max-height: 14rem;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .ce-actions-col {
        width: 1%;
        white-space: nowrap;
      }
      .ce-actions {
        display: flex;
        gap: 0.4rem;
        align-items: center;
      }
      .ce-spec-modal-pre {
        max-height: 60vh;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        padding: 0.75rem 1rem;
        border-radius: var(--spectra-radius-sm);
        border: 1px solid var(--spectra-color-border);
        background: var(--spectra-color-surface);
      }
      .icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        padding: 0;
        border-radius: var(--spectra-radius-sm);
        border: none;
        background: #e2e8f0;
        color: #0f172a;
        cursor: pointer;
        flex-shrink: 0;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
      }
      .icon-btn:hover {
        background: #f8fafc;
        color: #020617;
      }
      .icon-btn:active {
        transform: translateY(1px);
        box-shadow: 0 0 1px rgb(0 0 0 / 0.2);
      }
      .icon-btn:focus-visible {
        outline: 2px solid var(--spectra-color-accent);
        outline-offset: 2px;
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

  // List-view datatable state: search filter, column sort, and override modal.
  readonly listSearch = signal('');
  readonly sortKey = signal<'slug' | 'status' | 'created'>('created');
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  readonly regenModalId = signal<string | null>(null);
  readonly regenLoading = signal(false);
  readonly submitModalId = signal<string | null>(null);

  /** Filtered + sorted rows shown in the list table. */
  readonly visibleEndpoints = computed<EndpointListItem[]>(() => {
    const q = this.listSearch().trim().toLowerCase();
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const rows = this.items().filter((e) => {
      if (!q) return true;
      const status = this.endpointLifecycleLabel(e.statusId).toLowerCase();
      return e.slug.toLowerCase().includes(q) || status.includes(q);
    });
    return [...rows].sort((a, b) => {
      const av = this.sortValue(a, key);
      const bv = this.sortValue(b, key);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  readonly sandboxAiEndpointsEnabled = signal(false);

  readonly createSlug = signal('');
  readonly createUserPrompt = signal('');
  readonly createError = signal<string | null>(null);
  readonly createSubmitting = signal(false);

  /** Live preview state for the new-draft page. */
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly previewResult = signal<EndpointPreview | null>(null);
  readonly previewTab = signal<'list' | 'json'>('list');
  /** Random suffix that keeps an auto-generated slug stable for this draft (bumped on conflict). */
  private readonly slugSuffix = signal(randomSlugSuffix());
  private readonly promptInput$ = new Subject<string>();
  private readonly manualPreview$ = new Subject<string>();

  /** Slug used when the user leaves the field blank: prompt/suggestion base + a uniqueness suffix. */
  readonly autoSlug = computed(() => {
    const base = slugifyBase(this.previewResult()?.slugSuggestion || this.createUserPrompt());
    return `${base}-${this.slugSuffix()}`.slice(0, 63).replace(/-+$/g, '');
  });
  /** The slug that will actually be used: explicit value if valid-ish, else the auto slug. */
  readonly effectiveSlug = computed(() => this.createSlug().trim() || this.autoSlug());
  /** Hosted invoke URL preview for the effective slug. */
  readonly endpointUrl = computed(() => {
    const base = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
    return `${base}/v1/platform/tenant-runtime/endpoints/${this.effectiveSlug()}/invoke`;
  });
  /** Parsed `{ table, rows }` of the current preview, if it is a row list. */
  readonly previewTable = computed(() => previewRows(this.previewResult()?.result));
  /** Union of column keys across preview rows (stable order from the first row, then extras). */
  readonly previewColumns = computed<string[]>(() => {
    const t = this.previewTable();
    if (!t || t.rows.length === 0) return [];
    const seen = new Set<string>();
    const cols: string[] = [];
    for (const row of t.rows) {
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) {
          seen.add(k);
          cols.push(k);
        }
      }
    }
    return cols;
  });

  readonly generatingById = signal<Record<string, boolean>>({});
  readonly promptOverrideByEndpoint = signal<Record<string, string>>({});
  readonly submittingId = signal<string | null>(null);

  readonly hasAnyIntegration = signal(false);

  readonly openapiDownloading = signal(false);
  readonly openapiError = signal<string | null>(null);
  readonly reseeding = signal(false);

  readonly focusLoading = signal(false);
  readonly focusNotFound = signal(false);
  readonly focusBadUuid = signal(false);
  readonly focusSlug = signal('');
  readonly focusEndpointLifecycleLabel = signal('');
  readonly focusApprovedVersionId = signal<string | null>(null);
  readonly focusEndpointCreatedAt = signal<string | null>(null);
  readonly focusVersions = signal<Record<string, unknown>[]>([]);
  /** Version whose spec is shown in the JSON modal, or null when closed. */
  readonly specModalVersion = signal<Record<string, unknown> | null>(null);

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

    // Live preview pipeline: debounce keystrokes, dedupe, or fire immediately on manual Run.
    // switchMap cancels any in-flight request when a newer one starts.
    merge(
      this.promptInput$.pipe(debounceTime(1000), map((p) => p.trim()), distinctUntilChanged()),
      this.manualPreview$.pipe(map((p) => p.trim())),
    )
      .pipe(
        filter((p) => p.length >= 10),
        tap(() => {
          this.previewLoading.set(true);
          this.previewError.set(null);
        }),
        switchMap((userPrompt) =>
          this.api.previewCustomAiEndpoint({ userPrompt }).pipe(
            map((res) => ({ ok: true as const, res })),
            catchError((err: unknown) => of({ ok: false as const, err })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((out) => {
        this.previewLoading.set(false);
        if (out.ok) {
          this.previewResult.set(out.res);
          this.previewError.set(null);
        } else {
          this.previewError.set(apiErrorMessage(out.err));
        }
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
    const value = (ev.target as HTMLTextAreaElement).value ?? '';
    this.createUserPrompt.set(value);
    this.promptInput$.next(value);
  }

  /** Manual preview trigger (bypasses the debounce). */
  runPreview(): void {
    this.manualPreview$.next(this.createUserPrompt());
  }

  /** Regenerates the org's MRP demo fixtures, then reloads the list. */
  resetDemoData(): void {
    if (this.reseeding()) return;
    this.reseeding.set(true);
    this.api.reseedSandboxFixtures().subscribe({
      next: (r) => {
        this.reseeding.set(false);
        this.toastr.success(`Demo dataset regenerated (${r.itemCount} items).`, 'Reset demo data');
        if (this.mode() === 'list') this.reloadList();
      },
      error: (e: unknown) => {
        this.reseeding.set(false);
        this.toastr.error(apiErrorMessage(e), 'Reset failed');
      },
    });
  }

  /** Renders a cell value for the List tab. */
  formatCell(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
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
    this.specModalVersion.set(null);
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
    this.api.listIntegrations().subscribe({
      next: (r) => this.hasAnyIntegration.set(r.integrations.length > 0),
      error: () => {
        /* best-effort: integration presence is optional context */
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

  openSpecModal(v: Record<string, unknown>): void {
    this.specModalVersion.set(v);
  }

  closeSpecModal(): void {
    this.specModalVersion.set(null);
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

  // --- List datatable: search, sort, and override modal ---
  onListSearchInput(ev: Event): void {
    this.listSearch.set((ev.target as HTMLInputElement).value);
  }

  toggleSort(key: 'slug' | 'status' | 'created'): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  sortIndicator(key: 'slug' | 'status' | 'created'): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? ' ▲' : ' ▼';
  }

  ariaSort(key: 'slug' | 'status' | 'created'): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  private sortValue(e: EndpointListItem, key: 'slug' | 'status' | 'created'): string {
    if (key === 'slug') return e.slug.toLowerCase();
    if (key === 'status') return this.endpointLifecycleLabel(e.statusId).toLowerCase();
    return e.createdAt; // ISO string sorts chronologically
  }

  /** Bootstrap contextual class for a lifecycle-status badge. */
  statusBadgeClass(statusId: string): string {
    switch (this.endpointLifecycleLabel(statusId)) {
      case 'Active':
        return 'text-bg-success';
      case 'Draft':
        return 'text-bg-secondary';
      case 'Archived':
        return 'text-bg-dark';
      default:
        return 'text-bg-light';
    }
  }

  openRegenerate(id: string): void {
    this.regenModalId.set(id);
    // Pre-fill the textarea with the endpoint's latest instructions (fetch-on-open),
    // unless the user already has unsaved text for this endpoint.
    if (this.promptOverrideByEndpoint()[id] != null) return;
    this.regenLoading.set(true);
    this.api.getCustomAiEndpoint(id).subscribe({
      next: (r) => {
        this.promptOverrideByEndpoint.set({
          ...this.promptOverrideByEndpoint(),
          [id]: latestUserPrompt(r.versions),
        });
        this.regenLoading.set(false);
      },
      error: () => {
        // Leave the textarea blank; a blank prompt regenerates from the stored instructions.
        this.promptOverrideByEndpoint.set({ ...this.promptOverrideByEndpoint(), [id]: '' });
        this.regenLoading.set(false);
      },
    });
  }

  closeRegenerate(): void {
    this.regenModalId.set(null);
  }

  regenModalSlug(): string {
    const id = this.regenModalId();
    return this.items().find((e) => e.id === id)?.slug ?? '';
  }

  confirmRegenerate(): void {
    const id = this.regenModalId();
    if (!id) return;
    this.generateWithOverride(id);
    this.closeRegenerate();
  }

  openSubmit(id: string): void {
    this.submitModalId.set(id);
  }

  closeSubmit(): void {
    this.submitModalId.set(null);
  }

  private submitModalItem(): EndpointListItem | undefined {
    const id = this.submitModalId();
    return this.items().find((e) => e.id === id);
  }

  submitModalSlug(): string {
    return this.submitModalItem()?.slug ?? '';
  }

  submitModalPending(): boolean {
    return this.submitModalItem()?.pendingProductionRequest ?? false;
  }

  confirmSubmit(): void {
    const id = this.submitModalId();
    if (!id) return;
    this.submitApproval(id);
    this.closeSubmit();
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

  submitCreate(retried = false): void {
    const userPrompt = this.createUserPrompt().trim();
    const slug = this.effectiveSlug();
    this.createError.set(null);
    if (!userPrompt) {
      this.createError.set('Instructions are required.');
      return;
    }
    if (!SLUG_RE.test(slug)) {
      this.createError.set('Slug must be lowercase letters, digits, hyphens (2–64 chars).');
      return;
    }
    this.createSubmitting.set(true);
    this.api.createCustomAiEndpoint({ slug, userPrompt }).subscribe({
      next: (res) => {
        this.createSubmitting.set(false);
        const newId = (res.endpoint as { id?: string })?.id;
        if (newId) void this.router.navigate(['/custom-endpoints', newId]);
        else void this.router.navigate(['/custom-endpoints']);
      },
      error: (e: unknown) => {
        this.createSubmitting.set(false);
        // Auto-generated slug collided — bump the suffix and retry once.
        if (
          !retried &&
          !this.createSlug().trim() &&
          e instanceof HttpErrorResponse &&
          e.status === 409
        ) {
          this.slugSuffix.set(randomSlugSuffix());
          this.submitCreate(true);
          return;
        }
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
