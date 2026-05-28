import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type HelloResult =
  | { status: 'ok'; body: unknown }
  | { status: 'err'; message: string };

const SEGMENTS = [
  { segment: 'platform', label: 'aviate-api' },
  { segment: 'seq', label: 'seq-api' },
  { segment: 'quantum', label: 'quantum-api' },
  { segment: 'corridor', label: 'corridor-api' },
] as const;

@Component({
  standalone: true,
  selector: 'sandbox-home',
  imports: [JsonPipe],
  template: `
    <main class="wrap">
      <h1>Developer portal</h1>
      <p>Authenticated sandbox: apps, OAuth credentials, scope requests, Try API.</p>
      <section class="probe">
        <h2>Unified API (local-edge)</h2>
        <p class="meta">
          <span class="label">Configured base</span>
          <code>{{ baseLabel() }}</code>
        </p>
        @if (!environment.auth0.enabled) {
          <p class="hint">
            Set <code>SANDBOX_UI_AUTH0_*</code> in <code>apps/sandbox-ui/.env</code> and run
            <code>nx run sandbox-ui:env-sync</code>, then sign in to call
            <code>/hello</code> routes.
          </p>
        }
        @if (environment.apiBaseUrl) {
          <p class="meta">
            <a [href]="docsUrl()" target="_blank" rel="noopener noreferrer">Open Swagger UI</a>
            (<code>{{ docsUrl() }}</code>)
          </p>
          @for (row of segments; track row.segment) {
            <div class="hello-row">
              <p class="meta">
                <span class="label">GET</span>
                <code>/v1/{{ row.segment }}/hello</code>
              </p>
              @if (helloFor(row.segment); as hello) {
                @if (hello.status === 'ok') {
                  <pre class="ok">{{ hello.body | json }}</pre>
                } @else {
                  <p class="err">{{ hello.message }}</p>
                }
              }
            </div>
          }
        }
      </section>
    </main>
  `,
  styles: [
    `
      .wrap {
        font-family: system-ui, sans-serif;
        max-width: 42rem;
        margin: 3rem auto;
        padding: 0 1rem;
      }
      .probe {
        margin-top: 2rem;
        padding: 1rem 1.25rem;
        border-radius: 8px;
        background: #0f172a;
        color: #e2e8f0;
      }
      .probe h2 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        font-weight: 600;
      }
      .hello-row {
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid #334155;
      }
      .meta {
        margin: 0.35rem 0;
        font-size: 0.9rem;
      }
      .label {
        display: inline-block;
        min-width: 7rem;
        color: #94a3b8;
      }
      code {
        font-size: 0.85rem;
        word-break: break-all;
      }
      pre.ok {
        margin: 0.75rem 0 0;
        padding: 0.75rem;
        border-radius: 6px;
        background: #020617;
        overflow: auto;
        font-size: 0.8rem;
      }
      .err {
        color: #fecaca;
        margin: 0.5rem 0 0;
      }
      .hint {
        margin: 0;
        color: #94a3b8;
        font-size: 0.9rem;
      }
      a {
        color: #7dd3fc;
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  protected readonly environment = environment;
  protected readonly segments = SEGMENTS;

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService, { optional: true });

  readonly baseLabel = signal(
    environment.apiBaseUrl || '(same origin — use reverse proxy in prod)'
  );
  private readonly helloResults = signal<Record<string, HelloResult>>({});

  ngOnInit() {
    if (!environment.apiBaseUrl) return;
    void this.loadHellos();
  }

  docsUrl(): string {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    return `${base}/docs`;
  }

  helloFor(segment: string): HelloResult | undefined {
    return this.helloResults()[segment];
  }

  private async loadHellos(): Promise<void> {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const isAuthed = await this.isAuthenticated();

    for (const { segment } of SEGMENTS) {
      const url = `${base}/v1/${segment}/hello`;
      if (!isAuthed) {
        this.helloResults.update((m) => ({
          ...m,
          [segment]: {
            status: 'err',
            message: 'Sign in to call /hello (requires Bearer token).',
          },
        }));
        continue;
      }
      this.http.get<unknown>(url).subscribe({
        next: (body) => {
          this.helloResults.update((m) => ({
            ...m,
            [segment]: { status: 'ok', body },
          }));
        },
        error: (e: unknown) => {
          const message =
            e && typeof e === 'object' && 'error' in e &&
            typeof (e as { error?: unknown }).error === 'object' ?
              JSON.stringify((e as { error: unknown }).error)
            : e instanceof Error ? e.message
            : 'Request failed';
          this.helloResults.update((m) => ({
            ...m,
            [segment]: { status: 'err', message },
          }));
        },
      });
    }
  }

  private async isAuthenticated(): Promise<boolean> {
    if (!environment.auth0.enabled || !this.auth) {
      return false;
    }
    try {
      return await firstValueFrom(this.auth.isAuthenticated$);
    } catch {
      return false;
    }
  }
}
