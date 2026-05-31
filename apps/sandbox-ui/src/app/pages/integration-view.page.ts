import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SandboxPortalService } from '../services/sandbox-portal.service';

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
            <p class="meta">Last updated {{ r.updatedAt | date: 'medium' }}</p>
          </div>
          <div class="view-actions">
            <a [routerLink]="['/integrations', r.id, 'edit']" class="btn-secondary">Edit integration</a>
            <button type="button" class="btn-danger" (click)="confirmRevoke.set(true)">
              Revoke integration
            </button>
          </div>
        </header>

        <section class="spectra-probe block">
          <h2>Client credentials</h2>
          <div class="cred-field-group">
            <p class="meta"><span class="label">Client ID</span></p>
            <input
              readonly
              class="wide"
              [type]="showClientId() ? 'text' : 'password'"
              [value]="r.clientId"
              (click)="copy(r.clientId)"
            />
            <button type="button" class="linkish" (click)="showClientId.update((v) => !v)">
              {{ showClientId() ? 'Hide' : 'Show' }} client ID
            </button>
          </div>
          <div class="cred-field-group">
            <p class="meta"><span class="label">Client secret</span></p>
            @if (clientSecretPlain(); as secret) {
              <input
                readonly
                class="wide"
                [type]="showClientSecret() ? 'text' : 'password'"
                [value]="secret"
                (click)="copy(secret)"
              />
              <p class="hint">Click the field to copy. Anyone with this secret can mint tokens for this integration.</p>
              <button type="button" class="linkish" (click)="showClientSecret.update((v) => !v)">
                {{ showClientSecret() ? 'Hide' : 'Show' }} client secret
              </button>
            } @else if (r.hasClientSecret) {
              <p class="hint">
                The secret is stored hashed and cannot be shown again in this browser. Generate a new secret if you
                lost the previous one (this invalidates the old secret immediately).
              </p>
              <button type="button" class="btn-secondary cred-rotate" (click)="openRotateConfirm()">
                Generate new client secret
              </button>
            } @else {
              <p class="hint">No client secret is configured for this integration.</p>
            }
          </div>
          @if (opErr(); as oe) {
            <p class="spectra-auth-error cred-rotate-err">{{ oe }}</p>
          }
        </section>

        <section class="spectra-probe block">
          <h2>Integration details</h2>
          <dl class="sandbox-detail-dl">
            <dt>Grant type</dt>
            <dd><code>client_credentials</code></dd>
            <dt>Granted scopes</dt>
            <dd>
              @if (r.grantedScopes && r.grantedScopes.trim()) {
                <code>{{ r.grantedScopes }}</code>
              } @else {
                <span class="sandbox-detail-empty">None configured</span>
              }
            </dd>
            <dt>Description</dt>
            <dd class="sandbox-detail-multiline">
              {{ displayMultiline(r.description, "You haven't entered a description.") }}
            </dd>
          </dl>
        </section>

        <p><a routerLink="/dashboard">Back to dashboard</a></p>
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
          <button type="button" (click)="confirmRevoke.set(false)">Cancel</button>
          <button type="button" class="btn-danger" (click)="revoke()">Confirm revoke</button>
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
          <button type="button" (click)="confirmRotateSecret.set(false)">Cancel</button>
          <button type="button" class="btn-danger" (click)="rotateSecret()">Confirm rotate</button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .sandbox-view {
        max-width: 48rem;
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
      }
      .btn-secondary,
      .btn-danger {
        padding: 0.45rem 0.9rem;
        border-radius: var(--spectra-radius-sm);
        font-weight: 600;
        cursor: pointer;
        border: none;
        text-decoration: none;
        display: inline-block;
      }
      .btn-secondary {
        background: rgb(255 255 255 / 0.12);
        color: #f8fafc;
        border: 1px solid rgb(255 255 255 / 0.25);
      }
      .btn-danger {
        background: #b91c1c;
        color: #fff;
      }
      .block {
        margin-top: 1.25rem;
      }
      .sandbox-detail-dl {
        display: grid;
        grid-template-columns: minmax(11rem, max-content) minmax(0, 1fr);
        column-gap: 1.25rem;
        row-gap: 0.65rem;
        align-items: start;
        margin: 0;
      }
      .sandbox-detail-dl dt {
        margin: 0;
        padding-top: 0.1rem;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--spectra-color-panel-muted);
      }
      .sandbox-detail-dl dd {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        word-break: break-word;
        min-width: 0;
      }
      .sandbox-detail-dl dd.sandbox-detail-multiline {
        white-space: pre-line;
      }
      .sandbox-detail-empty {
        color: var(--spectra-color-panel-muted);
        font-style: italic;
      }
      .wide {
        width: 100%;
        max-width: 28rem;
      }
      .linkish {
        margin-top: 0.5rem;
        background: none;
        border: none;
        color: var(--spectra-color-panel-link);
        cursor: pointer;
        text-decoration: underline;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgb(0 0 0 / 0.45);
        z-index: 80;
      }
      .modal {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 90;
        background: var(--spectra-color-card);
        color: var(--spectra-color-text);
        padding: 1.25rem 1.5rem;
        border-radius: var(--spectra-radius-md);
        box-shadow: var(--spectra-shadow-md);
        min-width: min(26rem, 92vw);
        max-width: min(32rem, 94vw);
      }
      .modal h2 {
        margin: 0 0 0.75rem;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--spectra-color-navy);
      }
      .modal-review {
        margin: 0.5rem 0 1rem;
        padding: 0.75rem 1rem;
        border-radius: var(--spectra-radius-sm);
        border: 1px solid var(--spectra-color-border);
        background: var(--spectra-color-surface);
      }
      .modal-review-dl {
        display: grid;
        grid-template-columns: minmax(7.5rem, max-content) minmax(0, 1fr);
        gap: 0.35rem 1rem;
        margin: 0;
        font-size: 0.9rem;
      }
      .modal-review-dl dt {
        margin: 0;
        font-weight: 600;
        color: var(--spectra-color-muted);
      }
      .modal-review-dl dd {
        margin: 0;
        word-break: break-word;
        min-width: 0;
      }
      .modal-code {
        font-size: 0.82rem;
      }
      .modal-review-empty {
        color: var(--spectra-color-muted);
        font-style: italic;
      }
      .modal-lede {
        margin: 0 0 1rem;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--spectra-color-text);
      }
      .modal-actions {
        margin-top: 0;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .modal-actions button {
        padding: 0.45rem 0.9rem;
        border-radius: var(--spectra-radius-sm);
        font-weight: 600;
        cursor: pointer;
        border: 1px solid var(--spectra-color-border);
        background: var(--spectra-color-card);
        color: var(--spectra-color-text);
      }
      .modal-actions .btn-danger {
        background: #b91c1c !important;
        color: #fff !important;
        border-color: #991b1b !important;
      }
      .cred-field-group {
        margin-top: 1rem;
      }
      .cred-field-group:first-of-type {
        margin-top: 0;
      }
      .cred-rotate {
        margin-top: 0.5rem;
      }
      .cred-rotate-err {
        margin-top: 0.75rem;
        margin-bottom: 0;
      }
    `,
  ],
})
export class IntegrationViewPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  constructor() {
    const st = this.router.currentNavigation()?.extras?.state as { clientSecret?: string } | undefined;
    if (st?.clientSecret) this.clientSecretPlain.set(st.clientSecret);
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadErr.set('Missing id');
      return;
    }
    this.api.getIntegration(id).subscribe({
      next: (r) => this.row.set(r),
      error: (e: unknown) =>
        this.loadErr.set(e instanceof Error ? e.message : 'Failed to load integration'),
    });
  }

  protected copy(t: string): void {
    void navigator.clipboard.writeText(t);
  }

  protected displayMultiline(value: string | null | undefined, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const t = value.trim();
    return t.length > 0 ? t : fallback;
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
