import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  standalone: true,
  selector: 'spectra-home',
  imports: [JsonPipe],
  template: `
    <main class="wrap">
      <h1>Spectra</h1>
      <p>Public docs, marketing, and developer discovery (Blue Button–style IA).</p>
      <section class="probe">
        <h2>API (api-gateway)</h2>
        <p class="meta">
          <span class="label">Configured base</span>
          <code>{{ baseLabel() }}</code>
        </p>
        @if (environment.apiBaseUrl) {
          <p class="meta">
            <span class="label">GET</span>
            <code>{{ healthUrl() }}</code>
          </p>
          @if (health()) {
            <pre class="ok">{{ health() | json }}</pre>
          }
          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
        } @else {
          <p class="hint">
            <code>apiBaseUrl</code> is empty (production default). Point the SPA and API
            at the same origin, or use the development build for localhost probes.
          </p>
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
    `,
  ],
})
export class HomeComponent implements OnInit {
  protected readonly environment = environment;
  private readonly http = inject(HttpClient);

  readonly baseLabel = signal(
    environment.apiBaseUrl || '(same origin — use reverse proxy in prod)'
  );
  readonly healthUrl = signal('');
  readonly health = signal<unknown>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    if (!environment.apiBaseUrl) return;
    const url = `${environment.apiBaseUrl}/v1/gateway/health`;
    this.healthUrl.set(url);
    this.http.get<unknown>(url).subscribe({
      next: (body) => {
        this.health.set(body);
        this.error.set(null);
      },
      error: (e: unknown) =>
        this.error.set(
          e instanceof Error ? e.message : 'Request failed'
        ),
    });
  }
}
