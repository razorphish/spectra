import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Auth0ClientService, AuthService } from '@auth0/auth0-angular';
import { SpectraBrandBarComponent } from '@spectra/shared-ui';
import { environment } from '../environments/environment';
import { BffAuthService } from './core/bff-auth.service';
import { buildPublicApiSwaggerUrl } from './public-api-docs-url';

@Component({
  imports: [RouterModule, AsyncPipe, SpectraBrandBarComponent],
  selector: 'sandbox-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly window = window;
  protected readonly environment = environment;
  /** Shown once after we stripped a failed Auth0 redirect (?error&state without code). */
  protected readonly oauthReturnError = signal<{
    error: string;
    error_description: string;
  } | null>(null);
  protected readonly appOrigin = typeof location !== 'undefined' ? location.origin : '';
  protected readonly auth0AudienceHint =
    environment.auth0.audience?.trim() || 'your SANDBOX_UI_AUTH0_AUDIENCE value';
  protected readonly marketingHomeHref =
    environment.spectraMarketingUrl?.trim() || null;

  protected readonly documentationUrl = joinExternal(
    environment.spectraMarketingUrl,
    '/docs',
  );
  protected readonly supportUrl = joinExternal(environment.spectraMarketingUrl, '/support');
  protected readonly apiDocsUrl = buildPublicApiSwaggerUrl(
    environment.apiBaseUrl,
    environment.publicApiDocsBaseUrl,
  );

  protected readonly auth0Configured = Boolean(
    environment.auth0.enabled &&
      environment.auth0.domain?.trim() &&
      environment.auth0.clientId?.trim(),
  );
  protected readonly auth = inject(AuthService, { optional: true });
  /** SPA SDK instance (bypass AuthService Observable wrapper for reliable redirect). */
  protected readonly auth0 = inject(Auth0ClientService, { optional: true });
  /** BFF cookie-session auth (used when environment.bffAuth is true). */
  protected readonly bffMode = environment.bffAuth;
  protected readonly bffAuth = inject(BffAuthService);

  constructor() {
    if (this.bffMode) this.bffAuth.loadMe().subscribe();
    try {
      const raw = sessionStorage.getItem('spectra_sandbox_oauth_error');
      if (raw) {
        sessionStorage.removeItem('spectra_sandbox_oauth_error');
        const j = JSON.parse(raw) as { error?: string; error_description?: string };
        if (j?.error) {
          this.oauthReturnError.set({
            error: j.error,
            error_description: String(j.error_description ?? ''),
          });
        }
      }
    } catch {
      sessionStorage.removeItem('spectra_sandbox_oauth_error');
    }
  }

  protected dismissOauthError(): void {
    this.oauthReturnError.set(null);
  }

  protected login(): void {
    if (this.bffMode) {
      this.bffAuth.login();
      return;
    }
    const c = this.auth0;
    if (!c) return;
    void c
      .loginWithRedirect({
        openUrl: (url) => {
          window.location.replace(url);
        },
      })
      .catch((err) => console.error('[sandbox-ui] loginWithRedirect failed', err));
  }

  protected logout(): void {
    if (this.bffMode) {
      this.bffAuth.logout();
      return;
    }
    const c = this.auth0;
    if (!c) return;
    void c
      .logout({
        logoutParams: { returnTo: window.location.origin },
        openUrl: (url) => {
          window.location.assign(url);
        },
      })
      .catch((err) => console.error('[sandbox-ui] logout failed', err));
  }
}

function joinExternal(base: string | undefined, path: string): string {
  const b = base?.trim();
  if (!b) return '#';
  return `${b.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
