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
    <main class="spectra-page" style="max-width:48rem;padding-top:1rem">
      <p><a routerLink="/dashboard">← Dashboard</a></p>
      @if (row(); as r) {
        <h1>{{ r.name }}</h1>
        <p class="meta">Updated {{ r.updatedAt | date: 'medium' }}</p>
        <section class="spectra-probe block mt-3">
          <h2>M2M credentials</h2>
          <p><span class="label">Client ID</span></p>
          <input readonly class="form-control mb-2" [value]="r.clientId" (click)="copy(r.clientId)" />
          <p><span class="label">Granted scopes</span></p>
          <pre class="small">{{ r.grantedScopes }}</pre>
          @if (secret(); as s) {
            <p class="label">Client secret (copy now)</p>
            <input readonly class="form-control mb-2" [value]="s" (click)="copy(s)" />
          }
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button type="button" class="btn btn-outline-secondary" (click)="rotate()">Rotate secret</button>
            <button type="button" class="btn btn-outline-danger" (click)="revoke()">Revoke integration</button>
          </div>
          @if (opErr(); as oe) {
            <p class="spectra-auth-error mt-2">{{ oe }}</p>
          }
        </section>
      } @else if (loadErr(); as le) {
        <p class="spectra-auth-error">{{ le }}</p>
      } @else {
        <p>Loading…</p>
      }
    </main>
  `,
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
  protected readonly secret = signal<string | null>(null);
  protected readonly opErr = signal<string | null>(null);

  constructor() {
    const st = this.router.currentNavigation()?.extras?.state as { clientSecret?: string } | undefined;
    if (st?.clientSecret) this.secret.set(st.clientSecret);
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

  protected rotate(): void {
    const id = this.row()?.id;
    if (!id) return;
    this.opErr.set(null);
    this.api.rotateIntegrationSecret(id).subscribe({
      next: (r) => {
        this.secret.set(r.clientSecret);
      },
      error: (e: unknown) => this.opErr.set(e instanceof Error ? e.message : 'Rotate failed'),
    });
  }

  protected revoke(): void {
    const id = this.row()?.id;
    if (!id || !confirm('Revoke this integration? M2M mints will stop.')) return;
    this.opErr.set(null);
    this.api.deleteIntegration(id).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: (e: unknown) => this.opErr.set(e instanceof Error ? e.message : 'Revoke failed'),
    });
  }
}
