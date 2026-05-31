import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  SandboxApplicationDetail,
  SandboxPortalService,
} from '../services/sandbox-portal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-application-view',
  imports: [RouterLink, DatePipe],
  template: `
    @if (app(); as a) {
      <main class="spectra-page sandbox-view">
        <header class="view-head">
          <div>
            <h1>{{ a.name }}</h1>
            <p class="meta">Last updated {{ a.updatedAt | date: 'medium' }}</p>
          </div>
          <div class="view-actions">
            <a [routerLink]="['/applications', a.id, 'edit']" class="btn-secondary">Edit application</a>
            <button type="button" class="btn-danger" (click)="confirmDelete.set(true)">
              Delete application
            </button>
          </div>
        </header>

        <section class="spectra-probe block">
          <h2>App credentials</h2>
          <div class="cred-field-group">
            <p class="meta"><span class="label">Client ID</span></p>
            <input
              readonly
              class="wide"
              [type]="showClientId() ? 'text' : 'password'"
              [value]="a.clientId"
              (click)="copy(a.clientId)"
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
              <p class="hint">Click the field to copy. Anyone with this secret can call your OAuth client.</p>
              <button type="button" class="linkish" (click)="showClientSecret.update((v) => !v)">
                {{ showClientSecret() ? 'Hide' : 'Show' }} client secret
              </button>
            } @else if (a.hasClientSecret) {
              <p class="hint">
                The secret is stored hashed and cannot be shown again in this browser. Generate a new secret
                if you lost the previous one (this invalidates the old secret immediately).
              </p>
              <button type="button" class="btn-secondary cred-rotate" (click)="openRotateConfirm()">
                Generate new client secret
              </button>
            } @else {
              <p class="hint">No client secret is configured for this application.</p>
            }
          </div>
          @if (rotateErr(); as re) {
            <p class="spectra-auth-error cred-rotate-err">{{ re }}</p>
          }
        </section>

        <section class="spectra-probe block">
          <h2>OAuth configuration</h2>
          <dl class="sandbox-detail-dl">
            <dt>Client type</dt>
            <dd>{{ a.oauthClientType }}</dd>
            <dt>Grant type</dt>
            <dd>{{ a.oauthGrantType }}</dd>
            <dt>Redirect URIs</dt>
            <dd>
              @if (a.redirectUris.length) {
                <ul class="sandbox-uri-list">
                  @for (u of a.redirectUris; track u) {
                    <li><code>{{ u }}</code></li>
                  }
                </ul>
              } @else {
                <span class="sandbox-detail-empty">None configured</span>
              }
            </dd>
          </dl>
        </section>

        <section class="spectra-probe block">
          <h2>App details</h2>
          <dl class="sandbox-detail-dl">
            <dt>Logo</dt>
            <dd>
              @if (a.logoUploadId) {
                Upload ID {{ a.logoUploadId }}
              } @else {
                <span class="sandbox-detail-empty">No logo uploaded</span>
              }
            </dd>
            <dt>Privacy</dt>
            <dd>
              @if (a.privacyPolicyUrl) {
                <a [href]="a.privacyPolicyUrl!" target="_blank" rel="noopener noreferrer">{{
                  a.privacyPolicyUrl
                }}</a>
              } @else {
                <span class="sandbox-detail-empty">No privacy policy URL</span>
              }
            </dd>
            <dt>Terms of service</dt>
            <dd>
              @if (a.applicationTosUrl) {
                <a [href]="a.applicationTosUrl!" target="_blank" rel="noopener noreferrer">{{
                  a.applicationTosUrl
                }}</a>
              } @else {
                <span class="sandbox-detail-empty">No terms of service URL</span>
              }
            </dd>
            <dt>Organization website</dt>
            <dd>
              @if (a.companyWebsiteUrl) {
                {{ a.companyWebsiteUrl }}
              } @else {
                <span class="sandbox-detail-empty">No website entered</span>
              }
            </dd>
            <dt>Description</dt>
            <dd class="sandbox-detail-multiline">{{ displayMultiline(a.description, "You haven't entered an application description.") }}</dd>
            <dt>Application contacts</dt>
            <dd class="sandbox-detail-multiline">{{ displayMultiline(a.developmentContacts, "You haven't entered contacts.") }}</dd>
            <dt>Support email</dt>
            <dd>
              @if (a.supportEmail) {
                {{ a.supportEmail }}
              } @else {
                <span class="sandbox-detail-empty">No support email</span>
              }
            </dd>
            @if (a.supportPhone) {
              <dt>Support phone</dt>
              <dd>{{ a.supportPhone }}</dd>
            }
          </dl>
        </section>

        <p><a routerLink="/dashboard">Back to dashboard</a></p>
      </main>
    } @else if (err()) {
      <main class="spectra-page">
        <p class="spectra-auth-error">{{ err() }}</p>
      </main>
    } @else {
      <main class="spectra-page">
        <p>Loading…</p>
      </main>
    }

    @if (confirmDelete() && app(); as delApp) {
      <div class="modal-backdrop" role="presentation" (click)="confirmDelete.set(false)"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="del-title">
        <h2 id="del-title">Delete application?</h2>
        <p>This will soft-delete <strong>{{ delApp.name }}</strong> and its OAuth client.</p>
        <div class="modal-actions">
          <button type="button" (click)="confirmDelete.set(false)">Cancel</button>
          <button type="button" class="btn-danger" (click)="delete()">Delete</button>
        </div>
      </div>
    }

    @if (confirmRotateSecret() && app(); as rotApp) {
      <div class="modal-backdrop" role="presentation" (click)="confirmRotateSecret.set(false)"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rotate-title">
        <h2 id="rotate-title">Generate new client secret?</h2>
        <p>
          This replaces the secret for <strong>{{ rotApp.name }}</strong>. The old secret stops working
          immediately. Update any integrations that use it.
        </p>
        <div class="modal-actions">
          <button type="button" (click)="confirmRotateSecret.set(false)">Cancel</button>
          <button type="button" class="btn-danger" (click)="rotateSecret()">Generate new secret</button>
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
      .sandbox-uri-list {
        margin: 0;
        padding-left: 1.15rem;
      }
      .sandbox-uri-list li {
        margin: 0.15rem 0;
        line-height: 1.45;
      }
      .sandbox-uri-list li::marker {
        color: var(--spectra-color-panel-muted);
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
        min-width: min(22rem, 92vw);
      }
      .modal-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
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
export class ApplicationViewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(SandboxPortalService);

  protected readonly app = signal<SandboxApplicationDetail | null>(null);
  protected readonly showClientId = signal(false);
  protected readonly showClientSecret = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly confirmRotateSecret = signal(false);
  protected readonly err = signal<string | null>(null);
  protected readonly rotateErr = signal<string | null>(null);

  /** Plaintext secret when known (just after create, or after rotate). */
  protected readonly clientSecretPlain = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    try {
      const k = `spectra_sandbox_client_secret:${id}`;
      const s = sessionStorage.getItem(k);
      if (s) {
        this.clientSecretPlain.set(s);
        sessionStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
    this.api.getApplication(id).subscribe({
      next: (row) => this.app.set(row),
      error: () => this.err.set('Failed to load application'),
    });
  }

  protected copy(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  /** Trim accidental outer whitespace; keeps internal newlines for pre-line display. */
  protected displayMultiline(value: string | null | undefined, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const t = value.trim();
    return t.length > 0 ? t : fallback;
  }

  protected openRotateConfirm(): void {
    this.rotateErr.set(null);
    this.confirmRotateSecret.set(true);
  }

  protected rotateSecret(): void {
    const a = this.app();
    if (!a) return;
    this.rotateErr.set(null);
    this.api.rotateClientSecret(a.id).subscribe({
      next: (r) => {
        this.clientSecretPlain.set(r.clientSecret);
        this.confirmRotateSecret.set(false);
        this.showClientSecret.set(false);
      },
      error: () => {
        this.rotateErr.set('Failed to generate a new client secret. Try again.');
        this.confirmRotateSecret.set(false);
      },
    });
  }

  protected delete(): void {
    const a = this.app();
    if (!a) return;
    this.api.deleteApplication(a.id).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => this.err.set('Delete failed'),
    });
    this.confirmDelete.set(false);
  }
}
