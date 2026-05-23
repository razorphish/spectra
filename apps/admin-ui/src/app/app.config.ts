import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';
import { provideToastr } from 'ngx-toastr';
import { environment } from '../environments/environment';
import { isAuth0RuntimeConfigured } from './core/auth/auth0-env';
import { SpectraGlobalErrorHandler } from './core/telemetry/spectra-global-error-handler';
import { provideTelemetryInit } from './core/telemetry/telemetry-init';
import { appRoutes } from './app.routes';

function adminApiTokenPrefix(): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  return `${base}/v1/admin`;
}

function auth0RedirectUri(): string | undefined {
  const explicit = environment.auth0.redirectUri?.trim();
  if (explicit) {
    return explicit;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/callback`;
  }
  return undefined;
}

function auth0Config() {
  const a = environment.auth0;
  if (!isAuth0RuntimeConfigured()) {
    return [];
  }
  return [
    provideAuth0({
      domain: a.domain,
      clientId: a.clientId,
      authorizationParams: {
        audience: a.audience || undefined,
        redirect_uri: auth0RedirectUri(),
      },
      httpInterceptor: {
        allowedList: [
          {
            uriMatcher: (uri) => {
              const path = uri.split('?')[0]?.split('#')[0] ?? uri;
              return path.startsWith(adminApiTokenPrefix());
            },
            ...(a.audience ?
              {
                tokenOptions: {
                  authorizationParams: { audience: a.audience },
                },
              }
            : {}),
          },
        ],
      },
    }),
  ];
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideToastr({ positionClass: 'toast-bottom-right' }),
    provideHttpClient(
      withFetch(),
      ...(isAuth0RuntimeConfigured() ? [withInterceptors([authHttpInterceptorFn])] : []),
    ),
    { provide: ErrorHandler, useClass: SpectraGlobalErrorHandler },
    ...provideTelemetryInit(),
    ...auth0Config(),
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
  ],
};
