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
    <main class="spectra-page" style="max-width:40rem;padding-top:1rem">
      <p><a routerLink="/dashboard">← Dashboard</a></p>
      <h1>New M2M integration</h1>
      <p class="hint">Server-to-server OAuth2 client credentials (no redirect URIs).</p>
      @if (err(); as e) {
        <p class="spectra-auth-error">{{ e }}</p>
      }
      <form class="vstack gap-3 mt-3" (ngSubmit)="submit()">
        <label class="d-block">
          <span class="form-label">Name</span>
          <input class="form-control" name="name" [(ngModel)]="name" required />
        </label>
        <label class="d-block">
          <span class="form-label">Description (optional)</span>
          <textarea class="form-control" name="desc" rows="2" [(ngModel)]="description"></textarea>
        </label>
        <label class="d-block">
          <span class="form-label">Granted scopes (space-separated)</span>
          <input class="form-control" name="scopes" [(ngModel)]="grantedScopes" />
          <span class="hint small">Default <code>platform:read</code> for <code>/v1/platform/hello</code>.</span>
        </label>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">Create</button>
      </form>
    </main>
  `,
})
export class IntegrationNewPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly router = inject(Router);

  protected name = '';
  protected description = '';
  protected grantedScopes = 'platform:read';
  protected readonly saving = signal(false);
  protected readonly err = signal<string | null>(null);

  protected submit(): void {
    this.saving.set(true);
    this.err.set(null);
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
          this.err.set(e instanceof Error ? e.message : 'Create failed');
          this.saving.set(false);
        },
      });
  }
}
