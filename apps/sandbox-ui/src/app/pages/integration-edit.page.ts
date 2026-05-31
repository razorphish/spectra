import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SandboxPortalService } from '../services/sandbox-portal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-integration-edit',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="spectra-page form-page">
      @if (loadErr(); as le) {
        <p class="spectra-auth-error">{{ le }}</p>
        <p><a routerLink="/dashboard">Back to dashboard</a></p>
      } @else if (!loaded()) {
        <p>Loading…</p>
      } @else {
        <h1>Edit integration</h1>
        <p class="lede">
          Update the display name, description, or granted scopes for this integration’s OAuth2 client credentials.
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
            Use only scopes your deployment recognizes (e.g. <code>platform:read</code> for
            <code>GET /v1/platform/hello</code> when verification is enabled).
          </span>
        </label>

        <label class="field">
          <span>Description</span>
          <textarea rows="3" name="desc" [(ngModel)]="description"></textarea>
        </label>

        <div class="actions">
          <button type="button" class="btn-primary" [disabled]="saving()" (click)="submit()">
            Save changes
          </button>
          <a [routerLink]="['/integrations', integrationId()]">Cancel</a>
        </div>
      }
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
export class IntegrationEditPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly integrationId = signal('');
  protected readonly loaded = signal(false);
  protected readonly loadErr = signal<string | null>(null);
  protected name = '';
  protected description = '';
  protected grantedScopes = '';
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadErr.set('Missing integration id');
      return;
    }
    this.integrationId.set(id);
    this.api.getIntegration(id).subscribe({
      next: (r) => {
        this.name = r.name;
        this.description = r.description ?? '';
        this.grantedScopes = r.grantedScopes?.trim() ? r.grantedScopes : 'platform:read';
        this.loaded.set(true);
      },
      error: (e: unknown) => {
        let msg = 'Failed to load integration';
        if (e instanceof HttpErrorResponse) {
          const b = e.error as { message?: string } | null;
          msg = b?.message ?? e.message;
        } else if (e instanceof Error) {
          msg = e.message;
        }
        this.loadErr.set(msg);
      },
    });
  }

  protected submit(): void {
    const id = this.integrationId();
    if (!id) return;
    const name = this.name.trim();
    if (!name) {
      this.error.set('Name is required.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .updateIntegration(id, {
        name,
        description: this.description.trim() || null,
        grantedScopes: this.grantedScopes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          void this.router.navigate(['/integrations', id]);
        },
        error: (e: unknown) => {
          let msg = 'Save failed';
          if (e instanceof HttpErrorResponse) {
            const b = e.error as { message?: string } | null;
            msg = b?.message ?? e.message;
          } else if (e instanceof Error) {
            msg = e.message;
          }
          this.error.set(msg);
          this.saving.set(false);
        },
      });
  }
}
