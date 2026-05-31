import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth0ClientService, AuthService } from '@auth0/auth0-angular';
import { filter, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { buildPublicApiSwaggerUrl } from '../public-api-docs-url';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-landing',
  imports: [RouterLink, AsyncPipe],
  template: `
    <main class="sandbox-landing-main">
      <div class="sandbox-hero">
        <div class="sandbox-hero-inner spectra-page">
          <p class="sandbox-hero-eyebrow">Developer sandbox</p>
          <h1>Spectra developer sandbox</h1>
          <p class="sandbox-hero-lede">
            Register applications, manage OAuth-style client credentials, and explore the unified
            OpenAPI platform behind Spectra's public APIs — built for a clear, developer-first experience.
          </p>
          <div class="sandbox-hero-actions">
            @if (environment.auth0.enabled) {
              @if (auth.isAuthenticated$ | async) {
                <a routerLink="/dashboard" class="sandbox-btn sandbox-btn-primary">Go to dashboard</a>
              } @else {
                <button type="button" class="sandbox-btn sandbox-btn-primary" (click)="login()">
                  Log in
                </button>
              }
            } @else {
              <p class="sandbox-hero-hint">
                Configure <code>SANDBOX_UI_AUTH0_*</code> in <code>apps/sandbox-ui/.env</code> and run
                <code>nx run sandbox-ui:env-sync</code> to enable sign-in.
              </p>
            }
          </div>
        </div>
      </div>

      <section class="spectra-page sandbox-landing-body">
        <section class="spectra-probe landing-panel">
          <h2>What you can do here</h2>
          <ul class="landing-list">
            <li>Create <strong>sandbox applications</strong> with redirect URIs and optional branding.</li>
            <li>
              Receive a <strong>client ID and secret</strong> for confidential, authorization-code style flows.
            </li>
            <li>Jump to <strong>live API reference</strong> (Swagger) on the same gateway you integrate against.</li>
          </ul>
          <p class="meta">
            <span class="label">Documentation</span>
            <a [href]="discoverUrl('/docs')" target="_blank" rel="noopener noreferrer">Product docs on Spectra</a>
          </p>
          <p class="meta">
            <span class="label">API reference</span>
            <a [href]="swaggerUrl" target="_blank" rel="noopener noreferrer">OpenAPI / Swagger</a>
          </p>
        </section>
      </section>
    </main>
  `,
  styles: [
    `
      .sandbox-landing-main {
        margin: 0;
        padding: 0;
      }

      /* Match spectra-ui home hero (navy band + eyebrow + white title + lede). */
      .sandbox-hero {
        background: linear-gradient(
          160deg,
          var(--spectra-color-navy) 0%,
          var(--spectra-color-navy-mid) 55%,
          #1e3a5f 100%
        );
        color: #e8edf4;
        padding: 2.5rem 0 3rem;
      }

      .sandbox-hero-inner {
        padding-top: 0.25rem;
        padding-bottom: 0;
      }

      .sandbox-hero-eyebrow {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #fdba74;
      }

      .sandbox-hero-inner h1 {
        color: #f8fafc;
        font-size: clamp(2rem, 3.5vw, 2.75rem);
        font-weight: 700;
        margin: 0.35rem 0 1rem;
        line-height: 1.15;
      }

      .sandbox-hero-lede {
        margin: 0 0 1.5rem;
        max-width: 40rem;
        font-size: 1.05rem;
        line-height: 1.55;
        color: #cbd5e1;
      }

      .sandbox-hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }

      .sandbox-hero-hint {
        margin: 0;
        max-width: 40rem;
        font-size: 0.95rem;
        color: #94a3b8;
      }

      .sandbox-hero-hint code {
        font-size: 0.85rem;
        color: #e2e8f0;
      }

      .sandbox-btn {
        display: inline-block;
        padding: 0.55rem 1.25rem;
        border-radius: var(--spectra-radius-sm);
        font-weight: 600;
        text-decoration: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
      }

      .sandbox-btn-primary {
        background: var(--spectra-color-accent);
        color: #fff !important;
      }

      .sandbox-btn-primary:hover {
        background: var(--spectra-color-accent-hover);
      }

      .sandbox-landing-body {
        padding-top: 2rem;
        padding-bottom: 3rem;
      }

      .landing-panel {
        margin-top: 0;
      }

      .landing-list {
        margin: 0 0 1rem;
        padding-left: 1.25rem;
        color: var(--spectra-color-panel-text);
      }
    `,
  ],
})
export class LandingPageComponent {
  protected readonly environment = environment;
  protected readonly auth = inject(AuthService);
  private readonly auth0 = inject(Auth0ClientService);
  private readonly router = inject(Router);

  protected readonly swaggerUrl = buildPublicApiSwaggerUrl(
    environment.apiBaseUrl,
    environment.publicApiDocsBaseUrl,
  );

  constructor() {
    if (!environment.auth0.enabled) return;
    this.auth.isAuthenticated$
      .pipe(
        filter(Boolean),
        take(1),
      )
      .subscribe(() => void this.router.navigateByUrl('/dashboard'));
  }

  protected discoverUrl(path: string): string {
    const b = environment.spectraMarketingUrl?.trim();
    if (!b) return '#';
    return `${b.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }

  login(): void {
    void this.auth0
      .loginWithRedirect({
        openUrl: (url) => {
          window.location.replace(url);
        },
      })
      .catch((err) => console.error('[sandbox-ui] loginWithRedirect failed', err));
  }
}
