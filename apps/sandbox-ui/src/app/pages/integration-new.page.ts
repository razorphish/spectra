import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SandboxPortalService } from '../services/sandbox-portal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-integration-new',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="spectra-page form-page">
      <h1>Add an integration</h1>
      <p class="lede">
        Server-to-server access with OAuth2 <code>client_credentials</code>. No redirect URIs; use a
        client id and secret from this integration.
      </p>

      @if (error()) {
        <p class="spectra-auth-error">{{ error() }}</p>
      }

      <label class="field">
        <span>Integration name</span>
        <input type="text" name="name" [(ngModel)]="name" required />
      </label>

      <label class="field">
        <span>Granted scopes (space-separated)</span>
        <input type="text" name="scopes" [(ngModel)]="grantedScopes" />
        <span class="field-hint">
          Default <code>platform:read</code> is enough for <code>GET /v1/platform/hello</code> when token verification
          is enabled on the API.
        </span>
      </label>

      <button type="button" class="toggle-opt" (click)="optionalOpen.update((v) => !v)">
        {{ optionalOpen() ? 'Hide' : 'Show' }} optional integration information
      </button>

      @if (optionalOpen()) {
        <section class="optional-block">
          <label class="field">
            <span>Description</span>
            <textarea rows="3" name="desc" [(ngModel)]="description"></textarea>
          </label>
        </section>
      }

      <div class="actions">
        <button type="button" class="btn-primary" [disabled]="saving()" (click)="submit()">
          Save integration
        </button>
        <a routerLink="/dashboard">Cancel</a>
      </div>
    </main>
  `,
  styles: [
    `
      .form-page {
        max-width: 40rem;
        padding-top: 1rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-top: 1rem;
      }
      .field span:first-child {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .field-hint {
        font-size: 0.85rem;
        color: var(--spectra-color-muted);
      }
      input[type='text'],
      textarea {
        font: inherit;
        padding: 0.45rem 0.55rem;
        border-radius: var(--spectra-radius-sm);
        border: 1px solid var(--spectra-color-border);
      }
      .toggle-opt {
        margin-top: 1rem;
        background: none;
        border: none;
        color: var(--spectra-color-link);
        cursor: pointer;
        text-decoration: underline;
        font: inherit;
        padding: 0;
      }
      .optional-block {
        margin-top: 0.75rem;
        padding: 1rem;
        border: 1px solid var(--spectra-color-border);
        border-radius: var(--spectra-radius-md);
        background: var(--spectra-color-card);
      }
      .actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .btn-primary {
        padding: 0.55rem 1.15rem;
        border-radius: var(--spectra-radius-sm);
        background: var(--spectra-color-accent);
        color: #fff;
        border: none;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class IntegrationNewPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly router = inject(Router);

  protected name = '';
  protected description = '';
  protected grantedScopes = 'platform:read';
  protected readonly optionalOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api
      .createIntegration({
        name: this.name.trim(),
        description: this.description.trim() || undefined,
        grantedScopes: this.grantedScopes.trim() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.saving.set(false);
          void this.router.navigate(['/integrations', r.id], {
            state: { clientSecret: r.clientSecret },
          });
        },
        error: (e: unknown) => {
          this.error.set(e instanceof Error ? e.message : 'Create failed');
          this.saving.set(false);
        },
      });
  }
}
