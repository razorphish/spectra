import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  SandboxApplicationSummary,
  SandboxPortalService,
} from '../services/sandbox-portal.service';

type SandboxIntegrationSummary = {
  id: string;
  name: string;
  updatedAt: string;
  clientId: string;
  grantedScopes: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-dashboard',
  imports: [RouterLink, DatePipe],
  template: `
    <main class="spectra-page sandbox-dashboard">
      <header class="dash-head">
        <div>
          <h1>Developer dashboard</h1>
          <p class="lede">Manage sandbox applications and credentials.</p>
        </div>
        <div class="dash-actions">
          <a routerLink="/applications/new" class="btn-add">Add an application</a>
          <a routerLink="/integrations/new" class="btn-add btn-add-secondary">New M2M integration</a>
        </div>
      </header>

      @if (error()) {
        <p class="spectra-auth-error">{{ error() }}</p>
      }

      <section class="spectra-probe apps-panel" aria-labelledby="apps-heading">
        <h2 id="apps-heading">My Sandbox Apps</h2>
        @if (loading()) {
          <p>Loading…</p>
        } @else if (apps().length === 0) {
          <p class="hint">No applications yet. Create one to get a client ID and secret.</p>
        } @else {
          <table class="apps-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Updated</th>
                <th>Client ID</th>
                <th>Client secret</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (row of apps(); track row.id) {
                <tr>
                  <td>{{ row.name }}</td>
                  <td>{{ row.updatedAt | date: 'medium' }}</td>
                  <td>
                    <input
                      readonly
                      class="cred-field"
                      [type]="showSecrets() ? 'text' : 'password'"
                      [value]="row.clientId"
                      (click)="copy(row.clientId)"
                    />
                  </td>
                  <td>
                    <input
                      readonly
                      class="cred-field"
                      [type]="showSecrets() ? 'text' : 'password'"
                      value="••••••••••••••••"
                      title="Secret is only shown once when the app is created"
                      (click)="copyHint()"
                    />
                  </td>
                  <td class="actions">
                    <button type="button" class="linkish" (click)="toggleSecrets()">
                      {{ showSecrets() ? 'Hide' : 'Show' }} credentials
                    </button>
                    <a [routerLink]="['/applications', row.id]">View</a>
                    <a [routerLink]="['/applications', row.id, 'edit']">Edit</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="spectra-probe apps-panel" aria-labelledby="int-heading">
        <h2 id="int-heading">M2M integrations</h2>
        @if (intLoading()) {
          <p>Loading…</p>
        } @else if (intErr(); as ie) {
          <p class="spectra-auth-error">{{ ie }}</p>
        } @else if (integrations().length === 0) {
          <p class="hint">No M2M integrations yet. Create one for <code>client_credentials</code> tokens.</p>
        } @else {
          <table class="apps-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Updated</th>
                <th>Client ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (row of integrations(); track row.id) {
                <tr>
                  <td>{{ row.name }}</td>
                  <td>{{ row.updatedAt | date: 'medium' }}</td>
                  <td>
                    <input readonly class="cred-field" [value]="row.clientId" (click)="copy(row.clientId)" />
                  </td>
                  <td class="actions">
                    <a [routerLink]="['/integrations', row.id]">View</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .sandbox-dashboard {
        max-width: 56rem;
        padding-top: 1rem;
      }
      .dash-head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }
      .dash-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .btn-add {
        display: inline-block;
        padding: 0.45rem 1rem;
        border-radius: var(--spectra-radius-sm);
        background: var(--spectra-color-accent);
        color: #fff !important;
        font-weight: 600;
        text-decoration: none;
      }
      .btn-add-secondary {
        background: var(--spectra-color-panel-border);
        color: var(--spectra-color-text) !important;
      }
      .apps-panel {
        margin-top: 1.5rem;
      }
      .apps-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      .apps-table th,
      .apps-table td {
        padding: 0.5rem 0.35rem;
        border-bottom: 1px solid var(--spectra-color-panel-border);
        vertical-align: middle;
      }
      .cred-field {
        width: 100%;
        max-width: 14rem;
        font-size: 0.8rem;
      }
      .actions {
        white-space: nowrap;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .linkish {
        background: none;
        border: none;
        color: var(--spectra-color-panel-link);
        cursor: pointer;
        text-decoration: underline;
        padding: 0;
        font: inherit;
      }
    `,
  ],
})
export class DashboardPageComponent {
  private readonly api = inject(SandboxPortalService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly apps = signal<SandboxApplicationSummary[]>([]);
  protected readonly intLoading = signal(true);
  protected readonly intErr = signal<string | null>(null);
  protected readonly integrations = signal<SandboxIntegrationSummary[]>([]);
  protected readonly showSecrets = signal(false);

  constructor() {
    void this.load();
    void this.loadIntegrations();
  }

  private loadIntegrations(): void {
    this.intLoading.set(true);
    this.intErr.set(null);
    this.api.listIntegrations().subscribe({
      next: (r) => {
        this.integrations.set(r.integrations);
        this.intLoading.set(false);
      },
      error: (e: unknown) => {
        this.intErr.set(e instanceof Error ? e.message : 'Failed to load integrations');
        this.intLoading.set(false);
      },
    });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.api.listApplications().subscribe({
      next: (r) => {
        this.apps.set(r.applications);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(e instanceof Error ? e.message : 'Failed to load applications');
        this.loading.set(false);
      },
    });
  }

  protected toggleSecrets(): void {
    this.showSecrets.update((v) => !v);
  }

  protected copy(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  protected copyHint(): void {
    void navigator.clipboard.writeText(
      'Client secret is only shown once when you create the application. Rotate flow not implemented.',
    );
  }
}
