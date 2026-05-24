import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-home',
  imports: [JsonPipe, RouterLink],
  template: `
    <div class="hero">
      <div class="hero-inner spectra-page">
        <p class="eyebrow">Developer &amp; partner API</p>
        <h1>Spectra</h1>
        <p class="hero-lede">
          Public discovery, documentation, and sandbox access for integrating with Spectra — structured like the
          <a href="https://bluebutton.cms.gov/" rel="noopener noreferrer" target="_blank">CMS Blue Button</a> developer
          experience.
        </p>
        <div class="hero-actions">
          <a routerLink="/docs" class="btn btn-primary">API Documentation</a>
          @if (sandboxUiUrl) {
            <a [href]="sandboxUiUrl" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Open Sandbox</a>
          }
        </div>
      </div>
    </div>

    <section class="spectra-page value-section" aria-labelledby="value-heading">
      <h2 id="value-heading">Why Spectra</h2>
      <p class="section-lede">Placeholder value props — copy to be aligned with your go-to-market narrative.</p>
      <ul class="value-grid">
        @for (card of valuePlaceholders; track card.title) {
          <li class="value-card">
            <h3>{{ card.title }}</h3>
            <p>{{ card.body }}</p>
          </li>
        }
      </ul>
    </section>

    <section class="dev-strip" aria-labelledby="dev-heading">
      <div class="spectra-page dev-strip-inner">
        <h2 id="dev-heading">API status</h2>
        <p class="dev-hint">Probe of the <strong>local-edge</strong> dev server health (development build uses <code>apiBaseUrl</code>).</p>
        <div class="probe">
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
              <code>apiBaseUrl</code> is empty (production default). Point the SPA and API at the same origin, or use
              the development build for localhost probes.
            </p>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero {
      background: linear-gradient(
        160deg,
        var(--spectra-color-navy) 0%,
        var(--spectra-color-navy-mid) 55%,
        #1e3a5f 100%
      );
      color: #e8edf4;
      padding: 3rem 0 3.5rem;
    }

    .hero-inner {
      padding-top: 0.5rem;
      padding-bottom: 0;
    }

    .hero-inner h1 {
      color: #f8fafc;
      font-size: clamp(2.25rem, 4vw, 3rem);
      margin: 0.25rem 0 1rem;
    }

    .eyebrow {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #fdba74;
    }

    .hero-lede {
      margin: 0 0 1.5rem;
      max-width: 38rem;
      font-size: 1.1rem;
      line-height: 1.55;
      color: #cbd5e1;
    }

    .hero-lede a {
      color: #93c5fd;
    }

    .hero-lede a:hover {
      color: #bfdbfe;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .btn {
      display: inline-block;
      padding: 0.55rem 1.15rem;
      border-radius: var(--spectra-radius-sm);
      font-weight: 600;
      text-decoration: none;
      font-size: 0.95rem;
    }

    .btn-primary {
      background: var(--spectra-color-accent);
      color: #fff !important;
    }

    .btn-primary:hover {
      background: var(--spectra-color-accent-hover);
      color: #fff !important;
    }

    .btn-secondary {
      background: rgb(255 255 255 / 0.12);
      color: #f8fafc !important;
      border: 1px solid rgb(255 255 255 / 0.25);
    }

    .btn-secondary:hover {
      background: rgb(255 255 255 / 0.2);
      color: #fff !important;
    }

    .value-section h2 {
      margin: 0 0 0.35rem;
      font-size: 1.5rem;
      color: var(--spectra-color-navy);
    }

    .section-lede {
      margin: 0 0 1.5rem;
      color: var(--spectra-color-muted);
      max-width: 40rem;
    }

    .value-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 1.25rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .value-card {
      margin: 0;
      padding: 1.25rem 1.35rem;
      background: var(--spectra-color-card);
      border: 1px solid var(--spectra-color-border);
      border-radius: var(--spectra-radius-md);
      box-shadow: var(--spectra-shadow-sm);
    }

    .value-card h3 {
      margin: 0 0 0.5rem;
      font-size: 1.05rem;
      color: var(--spectra-color-navy);
    }

    .value-card p {
      margin: 0;
      font-size: 0.95rem;
      color: var(--spectra-color-muted);
    }

    .dev-strip {
      margin-top: 2rem;
      padding-bottom: 3rem;
    }

    .dev-strip-inner h2 {
      margin: 0 0 0.35rem;
      font-size: 1.25rem;
      color: var(--spectra-color-navy);
    }

    .dev-hint {
      margin: 0 0 1rem;
      color: var(--spectra-color-muted);
      font-size: 0.95rem;
    }

    .probe {
      padding: 1rem 1.25rem;
      border-radius: var(--spectra-radius-md);
      background: #0f172a;
      color: #e2e8f0;
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
})
export class HomeComponent implements OnInit {
  protected readonly environment = environment;
  protected readonly sandboxUiUrl = environment.sandboxUiUrl;

  protected readonly valuePlaceholders = [
    {
      title: 'For developers',
      body: 'Explore the API model, authorization, and integration patterns.',
    },
    {
      title: 'For organizations',
      body: 'Reduce manual data entry and ship faster with standards-based access.',
    },
    {
      title: 'For operators',
      body: 'Production access, monitoring hooks, and support paths — details to follow.',
    },
  ] as const;

  private readonly http = inject(HttpClient);

  readonly baseLabel = signal(
    environment.apiBaseUrl || '(same origin — use reverse proxy in prod)',
  );
  readonly healthUrl = signal('');
  readonly health = signal<unknown>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    if (!environment.apiBaseUrl) return;
    const url = `${environment.apiBaseUrl}/v1/local-edge/health`;
    this.healthUrl.set(url);
    this.http.get<unknown>(url).subscribe({
      next: (body) => {
        this.health.set(body);
        this.error.set(null);
      },
      error: (e: unknown) =>
        this.error.set(e instanceof Error ? e.message : 'Request failed'),
    });
  }
}
