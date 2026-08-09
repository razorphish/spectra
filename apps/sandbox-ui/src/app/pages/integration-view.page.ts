import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SandboxPortalService } from '../services/sandbox-portal.service';

type IntegrationViewTabId = 'par' | 'creds' | 'details';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-integration-view',
  imports: [RouterLink, DatePipe],
  template: `
    @if (row(); as r) {
      <main class="spectra-page sandbox-view">
        <header class="view-head">
          <div>
            <h1>{{ r.name }}</h1>
            <p class="meta text-muted">Last updated {{ r.updatedAt | date: 'medium' }}</p>
          </div>
          <div class="view-actions">
            <button type="button" class="btn btn-danger" (click)="confirmRevoke.set(true)">
              Revoke integration
            </button>
          </div>
        </header>

        <div class="int-card">
          <div
            class="nav-tabs-wrap"
            role="tablist"
            aria-label="Integration sections"
          >
            @if (parPortalEnabled()) {
              <button
                type="button"
                role="tab"
                class="nav-tab"
                [class.active]="activeTab() === 'par'"
                [attr.aria-selected]="activeTab() === 'par'"
                [attr.tabindex]="activeTab() === 'par' ? 0 : -1"
                id="tab-par"
                aria-controls="panel-par"
                (click)="selectTab('par')"
              >
                Production access
              </button>
            }
            <button
              type="button"
              role="tab"
              class="nav-tab"
              [class.active]="activeTab() === 'creds'"
              [attr.aria-selected]="activeTab() === 'creds'"
              [attr.tabindex]="activeTab() === 'creds' ? 0 : -1"
              id="tab-creds"
              aria-controls="panel-creds"
              (click)="selectTab('creds')"
            >
              Credentials
            </button>
            <button
              type="button"
              role="tab"
              class="nav-tab"
              [class.active]="activeTab() === 'details'"
              [attr.aria-selected]="activeTab() === 'details'"
              [attr.tabindex]="activeTab() === 'details' ? 0 : -1"
              id="tab-details"
              aria-controls="panel-details"
              (click)="selectTab('details')"
            >
              Details
            </button>
          </div>

          <div class="tab-panels">
            @if (parPortalEnabled() && activeTab() === 'par') {
              <div
                id="panel-par"
                role="tabpanel"
                aria-labelledby="tab-par"
                class="tab-panel"
              >
                <h2 class="tab-panel-title">Production API access</h2>
                @if (parLoadErr(); as pe) {
                  <p class="form-error">{{ pe }}</p>
                } @else if (parRequest(); as pr) {
                  <p class="text-muted small">Request <code class="code-inline">{{ pr.id }}</code></p>
                  <p class="mb-2">
                    <span class="text-muted fw-semibold">Status</span>
                    <code class="code-inline ms-1">{{ pr.statusId }}</code>
                  </p>
                  @if (pr.customerStatusMessage) {
                    <div class="alert alert-info">
                      <p class="alert-label">Message from Spectra</p>
                      <p class="alert-body">{{ pr.customerStatusMessage }}</p>
                    </div>
                  }
                  <p class="text-muted small mb-0">
                    Typical review window: <strong>{{ pr.productionAccessReviewSlaBusinessDays }}</strong> business days.
                    @if (pr.productionAccessReviewSlaDisclaimer) {
                      {{ pr.productionAccessReviewSlaDisclaimer }}
                    }
                  </p>
                } @else if (parNoRequestYet()) {
                  <p class="text-muted">
                    Submit a request when you are ready for Spectra staff to review production access for this integration.
                  </p>
                  <div class="stack gap-3 mt-3">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="par-sandbox"
                        [checked]="parSandboxDone()"
                        (change)="toggleSandboxDone($event)"
                      />
                      <label class="form-check-label" for="par-sandbox">Sandbox testing completed for this integration</label>
                    </div>
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="par-terms"
                        [checked]="parTermsAccepted()"
                        (change)="toggleTermsAccepted($event)"
                      />
                      <label class="form-check-label" for="par-terms">I accept the production access terms for this submission</label>
                    </div>
                    <div class="mb-0">
                      <label class="form-label" for="par-terms-version">Terms version</label>
                      <input
                        id="par-terms-version"
                        type="text"
                        class="form-control"
                        placeholder="par-v1"
                        [value]="parTermsVersion()"
                        (input)="parTermsVersion.set($any($event.target).value)"
                      />
                      <p class="form-text mb-0">
                        Identifier for <strong>which</strong> production-access terms the submitter agreed to (stored on
                        the request for audit). <code class="code-inline">par-v1</code> is the default for
                        <strong>revision 1</strong> of Spectra’s production-access terms in this sandbox. Use whatever
                        version string your legal / customer docs publish when they update the terms (for example
                        <code class="code-inline">par-v2</code>).
                      </p>
                    </div>
                    <div class="mb-0">
                      <label class="form-label" for="par-accepted">Accepted at (ISO-8601)</label>
                      <input
                        id="par-accepted"
                        type="text"
                        class="form-control"
                        [value]="parAcceptedAt()"
                        (input)="parAcceptedAt.set($any($event.target).value)"
                      />
                      <p class="form-text mb-0">
                        Timestamp when the person submitting checked the boxes above (UTC recommended), e.g.
                        <code class="code-inline">2026-06-08T12:00:00.000Z</code>. Defaults to “now”; change only if
                        you are backdating to match a signed agreement time.
                      </p>
                    </div>
                    <div class="mb-0">
                      <label class="form-label" for="par-tenant">Intended production tenant (optional)</label>
                      <input
                        id="par-tenant"
                        type="text"
                        class="form-control"
                        [value]="parTenantHint()"
                        (input)="parTenantHint.set($any($event.target).value)"
                      />
                    </div>
                    @if (parSubmitErr(); as se) {
                      <p class="form-error">{{ se }}</p>
                    }
                    <button type="button" class="btn btn-primary" [disabled]="parSubmitting()" (click)="submitPar()">
                      {{ parSubmitting() ? 'Submitting…' : 'Submit production access request' }}
                    </button>
                  </div>
                } @else {
                  <p class="text-muted mb-0">Loading request status…</p>
                }
              </div>
            }

            @if (activeTab() === 'creds') {
              <div
                id="panel-creds"
                role="tabpanel"
                aria-labelledby="tab-creds"
                class="tab-panel"
              >
                <h2 class="tab-panel-title">Client credentials</h2>
                @if (parCredentialsEnabled() === false) {
                  <div class="alert alert-warning">
                    Production credential pickup is disabled for this deployment. Sandbox client credentials below still
                    apply for non-production testing.
                  </div>
                }
                <div class="field-block">
                  <label class="form-label" for="cred-client-id">Client ID</label>
                  <input
                    id="cred-client-id"
                    readonly
                    class="form-control font-monospace"
                    [type]="showClientId() ? 'text' : 'password'"
                    [value]="r.clientId"
                    (click)="copy(r.clientId)"
                  />
                  <button type="button" class="btn btn-link btn-sm px-0" (click)="showClientId.update((v) => !v)">
                    {{ showClientId() ? 'Hide' : 'Show' }} client ID
                  </button>
                </div>
                <div class="field-block">
                  <span class="form-label d-block">Client secret</span>
                  @if (clientSecretPlain(); as secret) {
                    <input
                      readonly
                      class="form-control font-monospace"
                      [type]="showClientSecret() ? 'text' : 'password'"
                      [value]="secret"
                      (click)="copy(secret)"
                    />
                    <p class="form-text">Click the field to copy. Anyone with this secret can mint tokens for this integration.</p>
                    <button type="button" class="btn btn-link btn-sm px-0" (click)="showClientSecret.update((v) => !v)">
                      {{ showClientSecret() ? 'Hide' : 'Show' }} client secret
                    </button>
                  } @else if (r.hasClientSecret) {
                    <p class="text-muted small">
                      The secret is stored hashed and cannot be shown again in this browser. Generate a new secret if you
                      lost the previous one (this invalidates the old secret immediately).
                    </p>
                    <button type="button" class="btn btn-primary mt-2" (click)="openRotateConfirm()">
                      Generate new client secret
                    </button>
                  } @else {
                    <p class="text-muted small mb-0">No client secret is configured for this integration.</p>
                  }
                </div>
                @if (opErr(); as oe) {
                  <p class="form-error cred-rotate-err">{{ oe }}</p>
                }
              </div>
            }

            @if (activeTab() === 'details') {
              <div
                id="panel-details"
                role="tabpanel"
                aria-labelledby="tab-details"
                class="tab-panel"
              >
                <h2 class="tab-panel-title">Integration details</h2>
                <p class="text-muted small mb-3">
                  Update the display name, description, or granted scopes. Grant type stays
                  <code class="code-inline">client_credentials</code> and cannot be changed.
                </p>
                @if (detailsError(); as de) {
                  <p class="form-error">{{ de }}</p>
                }
                <div class="field-block">
                  <label class="form-label" for="int-edit-name">Integration name</label>
                  <input
                    id="int-edit-name"
                    type="text"
                    class="form-control"
                    autocomplete="off"
                    [value]="editName()"
                    (input)="editName.set($any($event.target).value)"
                  />
                </div>
                <div class="field-block">
                  <span class="form-label d-block">Grant type</span>
                  <p class="mb-0">
                    <code class="code-inline">client_credentials</code>
                  </p>
                  <p class="form-text mb-0">Fixed for sandbox integrations.</p>
                </div>
                <div class="field-block">
                  <label class="form-label" for="int-edit-scopes">Granted scopes (space-separated)</label>
                  <input
                    id="int-edit-scopes"
                    type="text"
                    class="form-control font-monospace"
                    spellcheck="false"
                    autocomplete="off"
                    [value]="editGrantedScopes()"
                    (input)="editGrantedScopes.set($any($event.target).value)"
                  />
                  <p class="form-text">
                    Use only scopes your deployment recognizes (e.g. <code class="code-inline">platform:read</code> for
                    <code class="code-inline">GET /v1/platform/hello</code> when verification is enabled).
                  </p>
                </div>
                <div class="field-block">
                  <label class="form-label" for="int-edit-desc">Description</label>
                  <textarea
                    id="int-edit-desc"
                    class="form-control"
                    rows="4"
                    [value]="editDescription()"
                    (input)="editDescription.set($any($event.target).value)"
                  ></textarea>
                </div>
                <div class="details-save-actions">
                  <button type="button" class="btn btn-primary" [disabled]="savingDetails()" (click)="saveDetails()">
                    {{ savingDetails() ? 'Saving…' : 'Save changes' }}
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <p class="mt-3"><a routerLink="/dashboard">Back to dashboard</a></p>
      </main>
    } @else if (loadErr(); as le) {
      <main class="spectra-page sandbox-view">
        <p class="spectra-auth-error">{{ le }}</p>
      </main>
    } @else {
      <main class="spectra-page sandbox-view">
        <p>Loading…</p>
      </main>
    }

    @if (confirmRevoke() && row(); as revRow) {
      <div class="modal-backdrop" role="presentation" (click)="confirmRevoke.set(false)"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="revoke-title">
        <h2 id="revoke-title">Review: revoke integration</h2>
        <div class="modal-review">
          <dl class="modal-review-dl">
            <dt>Integration</dt>
            <dd>{{ revRow.name }}</dd>
            <dt>Client ID</dt>
            <dd><code class="modal-code">{{ revRow.clientId }}</code></dd>
            <dt>Granted scopes</dt>
            <dd>
              @if (revRow.grantedScopes && revRow.grantedScopes.trim()) {
                <code class="modal-code">{{ revRow.grantedScopes }}</code>
              } @else {
                <span class="modal-review-empty">None</span>
              }
            </dd>
            <dt>Last updated</dt>
            <dd>{{ revRow.updatedAt | date: 'medium' }}</dd>
          </dl>
        </div>
        <p class="modal-lede">
          This revokes <strong>{{ revRow.name }}</strong>. Token mints for this client will stop. This action cannot be
          undone from the portal.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline-secondary" (click)="confirmRevoke.set(false)">Cancel</button>
          <button type="button" class="btn btn-danger" (click)="revoke()">Confirm revoke</button>
        </div>
      </div>
    }

    @if (confirmRotateSecret() && row(); as rotRow) {
      <div class="modal-backdrop" role="presentation" (click)="confirmRotateSecret.set(false)"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rotate-title">
        <h2 id="rotate-title">Review: rotate client secret</h2>
        <div class="modal-review">
          <dl class="modal-review-dl">
            <dt>Integration</dt>
            <dd>{{ rotRow.name }}</dd>
            <dt>Client ID</dt>
            <dd><code class="modal-code">{{ rotRow.clientId }}</code></dd>
            <dt>Granted scopes</dt>
            <dd>
              @if (rotRow.grantedScopes && rotRow.grantedScopes.trim()) {
                <code class="modal-code">{{ rotRow.grantedScopes }}</code>
              } @else {
                <span class="modal-review-empty">None</span>
              }
            </dd>
            <dt>Last updated</dt>
            <dd>{{ rotRow.updatedAt | date: 'medium' }}</dd>
          </dl>
        </div>
        <p class="modal-lede">
          This replaces the secret for <strong>{{ rotRow.name }}</strong>. The old secret stops working immediately.
          Update any systems that use it.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline-secondary" (click)="confirmRotateSecret.set(false)">Cancel</button>
          <button type="button" class="btn btn-danger" (click)="rotateSecret()">Confirm rotate</button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .sandbox-view {
        max-width: 52rem;
        padding-top: 1rem;
      }
      .view-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
      }
      .view-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .cred-rotate-err {
        margin-top: 0.75rem;
        margin-bottom: 0;
      }
      .details-save-actions {
        margin-top: 1.25rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
    `,
  ],
})
export class IntegrationViewPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private integrationId = '';

  protected readonly row = signal<{
    id: string;
    name: string;
    description: string | null;
    updatedAt: string;
    clientId: string;
    grantedScopes: string;
    hasClientSecret: boolean;
  } | null>(null);
  protected readonly loadErr = signal<string | null>(null);
  protected readonly clientSecretPlain = signal<string | null>(null);
  protected readonly opErr = signal<string | null>(null);
  protected readonly showClientId = signal(false);
  protected readonly showClientSecret = signal(false);
  protected readonly confirmRevoke = signal(false);
  protected readonly confirmRotateSecret = signal(false);

  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editGrantedScopes = signal('');
  protected readonly savingDetails = signal(false);
  protected readonly detailsError = signal<string | null>(null);

  /** After session: false hides the whole PAR block. */
  protected readonly parPortalEnabled = signal(true);
  /** When false, show notice above sandbox credentials (production pickup disabled). */
  protected readonly parCredentialsEnabled = signal(true);
  protected readonly parParLoaded = signal(false);
  protected readonly parRequest = signal<{
    id: string;
    statusId: string;
    customerStatusMessage: string | null;
    documents: unknown;
    productionAccessReviewSlaBusinessDays: number;
    productionAccessReviewSlaDisclaimer: string | null;
    productionAccessIntegratorPortalEnabled: boolean;
    productionAccessIntegratorCredentialsUiEnabled: boolean;
  } | null>(null);
  protected readonly parNoRequestYet = signal(false);
  protected readonly parLoadErr = signal<string | null>(null);
  protected readonly parSubmitting = signal(false);
  protected readonly parSubmitErr = signal<string | null>(null);
  protected readonly parSandboxDone = signal(false);
  protected readonly parTermsAccepted = signal(false);
  protected readonly parTermsVersion = signal('par-v1');
  protected readonly parAcceptedAt = signal(new Date().toISOString());
  protected readonly parTenantHint = signal('');

  /** Active tab; defaults to Credentials. */
  protected readonly activeTab = signal<IntegrationViewTabId>('creds');

  constructor() {
    const st = this.router.currentNavigation()?.extras?.state as { clientSecret?: string } | undefined;
    if (st?.clientSecret) {
      this.clientSecretPlain.set(st.clientSecret);
      // Scrub the secret from window.history.state so it isn't readable later via
      // history.state after the one-shot handoff from create/rotate.
      if (typeof history !== 'undefined') {
        const rest = { ...((history.state ?? {}) as Record<string, unknown>) };
        delete rest['clientSecret'];
        history.replaceState(rest, '');
      }
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadErr.set('Missing id');
      return;
    }
    this.integrationId = id;
    const defaultTab = this.route.snapshot.data['integrationDefaultTab'] as IntegrationViewTabId | undefined;
    if (defaultTab === 'details') {
      this.activeTab.set('details');
    } else if (defaultTab === 'par') {
      this.activeTab.set('par');
    }
    this.api.session().subscribe({
      next: (s) => {
        this.parPortalEnabled.set(s.productionAccessIntegratorPortalEnabled !== false);
        this.parCredentialsEnabled.set(s.productionAccessIntegratorCredentialsUiEnabled !== false);
        if (!this.parPortalEnabled() && this.activeTab() === 'par') {
          this.activeTab.set('creds');
        }
        if (this.parPortalEnabled()) {
          this.refreshParStatus();
        } else {
          this.parParLoaded.set(true);
        }
      },
      error: () => {
        this.parPortalEnabled.set(true);
        this.parCredentialsEnabled.set(true);
        this.refreshParStatus();
      },
    });
    this.api.getIntegration(id).subscribe({
      next: (r) => {
        this.row.set(r);
        this.hydrateEditFormFromRow(r);
      },
      error: (e: unknown) =>
        this.loadErr.set(e instanceof Error ? e.message : 'Failed to load integration'),
    });
  }

  protected copy(t: string): void {
    void navigator.clipboard.writeText(t);
  }

  protected saveDetails(): void {
    const id = this.row()?.id;
    if (!id) return;
    const name = this.editName().trim();
    if (!name) {
      this.detailsError.set('Name is required.');
      return;
    }
    this.savingDetails.set(true);
    this.detailsError.set(null);
    this.api
      .updateIntegration(id, {
        name,
        description: this.editDescription().trim() || null,
        grantedScopes: this.editGrantedScopes().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingDetails.set(false);
          this.api.getIntegration(id).subscribe({
            next: (r) => {
              this.row.set(r);
              this.hydrateEditFormFromRow(r);
            },
            error: (e: unknown) =>
              this.detailsError.set(e instanceof Error ? e.message : 'Failed to reload integration'),
          });
        },
        error: (e: unknown) => {
          this.savingDetails.set(false);
          if (e instanceof HttpErrorResponse) {
            const b = e.error as { message?: string } | null;
            this.detailsError.set(b?.message ?? e.message);
          } else {
            this.detailsError.set(e instanceof Error ? e.message : 'Save failed');
          }
        },
      });
  }

  private hydrateEditFormFromRow(r: {
    name: string;
    description: string | null;
    grantedScopes: string;
  }): void {
    this.editName.set(r.name);
    this.editDescription.set(r.description ?? '');
    this.editGrantedScopes.set(r.grantedScopes?.trim() ? r.grantedScopes : 'platform:read');
  }

  protected toggleSandboxDone(ev: Event): void {
    const t = ev.target as HTMLInputElement;
    this.parSandboxDone.set(!!t.checked);
  }

  protected toggleTermsAccepted(ev: Event): void {
    const t = ev.target as HTMLInputElement;
    this.parTermsAccepted.set(!!t.checked);
  }

  protected selectTab(tab: IntegrationViewTabId): void {
    if (tab === 'par' && !this.parPortalEnabled()) return;
    this.activeTab.set(tab);
  }

  private refreshParStatus(): void {
    const id = this.integrationId;
    if (!id) return;
    this.parLoadErr.set(null);
    this.parParLoaded.set(false);
    this.api.getProductionAccessRequest(id).subscribe({
      next: (r) => {
        this.parRequest.set(r);
        this.parNoRequestYet.set(false);
        this.parParLoaded.set(true);
      },
      error: (e: unknown) => {
        this.parParLoaded.set(true);
        if (e instanceof HttpErrorResponse) {
          if (e.status === 404) {
            this.parRequest.set(null);
            this.parNoRequestYet.set(true);
            return;
          }
          if (e.status === 403) {
            this.parLoadErr.set('Production access is disabled for this deployment.');
            return;
          }
        }
        this.parLoadErr.set(e instanceof Error ? e.message : 'Failed to load production access status');
      },
    });
  }

  protected submitPar(): void {
    const id = this.integrationId;
    if (!id) return;
    this.parSubmitErr.set(null);
    const attest: Record<string, boolean> = {};
    if (this.parSandboxDone()) attest['sandboxTestingCompleted'] = true;
    if (this.parTermsAccepted()) attest['productionTermsAccepted'] = true;
    const termsVersion = this.parTermsVersion().trim();
    const acceptedAt = this.parAcceptedAt().trim();
    const tenant = this.parTenantHint().trim();
    if (Object.keys(attest).length > 0) {
      if (!termsVersion) {
        const msg = 'Terms version is required when attestations are checked.';
        this.parSubmitErr.set(msg);
        this.toastr.error(msg, 'Cannot submit');
        return;
      }
      if (!acceptedAt) {
        const msg = 'Accepted at is required when attestations are checked.';
        this.parSubmitErr.set(msg);
        this.toastr.error(msg, 'Cannot submit');
        return;
      }
    }
    const questionnaire: Record<string, unknown> = {
      v: 1,
      ...(Object.keys(attest).length ? { attestations: attest, termsVersion, acceptedAt } : {}),
      ...(tenant ? { intendedProductionTenantId: tenant } : {}),
    };
    this.parSubmitting.set(true);
    this.api.submitProductionAccessRequest(id, { documents: { questionnaire } }).subscribe({
      next: () => {
        this.parSubmitting.set(false);
        this.parSubmitErr.set(null);
        this.toastr.success(
          'Spectra staff will review your request. You can return here to check status.',
          'Production access request submitted',
        );
        this.refreshParStatus();
      },
      error: (e: unknown) => {
        this.parSubmitting.set(false);
        let msg = 'Submit failed';
        if (e instanceof HttpErrorResponse && e.status === 409) {
          msg = 'An open request already exists for this integration. Refresh the page.';
        } else if (e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'issues' in e.error) {
          const issues = (e.error as { issues?: { path: string; message: string }[] }).issues;
          if (issues?.length) {
            msg = issues.map((i) => `${i.path}: ${i.message}`).join('; ');
          }
        } else if (e instanceof HttpErrorResponse && e.error && typeof e.error === 'object') {
          const m = (e.error as { message?: string }).message;
          if (typeof m === 'string' && m.trim()) msg = m.trim();
          else if (e.message) msg = e.message;
        } else if (e instanceof Error) {
          msg = e.message;
        }
        this.parSubmitErr.set(msg);
        this.toastr.error(msg, 'Submit failed');
      },
    });
  }

  protected openRotateConfirm(): void {
    this.opErr.set(null);
    this.confirmRotateSecret.set(true);
  }

  protected rotateSecret(): void {
    const id = this.row()?.id;
    if (!id) return;
    this.opErr.set(null);
    this.api.rotateIntegrationSecret(id).subscribe({
      next: (res) => {
        this.clientSecretPlain.set(res.clientSecret);
        this.confirmRotateSecret.set(false);
        this.showClientSecret.set(false);
      },
      error: (e: unknown) => {
        this.opErr.set(e instanceof Error ? e.message : 'Rotate failed');
        this.confirmRotateSecret.set(false);
      },
    });
  }

  protected revoke(): void {
    const id = this.row()?.id;
    if (!id) return;
    this.opErr.set(null);
    this.api.deleteIntegration(id).subscribe({
      next: () => {
        this.confirmRevoke.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (e: unknown) => {
        this.opErr.set(e instanceof Error ? e.message : 'Revoke failed');
        this.confirmRevoke.set(false);
      },
    });
  }
}
