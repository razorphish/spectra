import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import { bffHttpInterceptor } from './core/bff-http.interceptor';

function isAuth0Configured(): boolean {
  const { domain, clientId, enabled } = environment.auth0;
  return Boolean(enabled && domain?.trim() && clientId?.trim());
}

function apiV1Prefix(): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  return `${base}/v1/`;
}

function auth0Providers(): ApplicationConfig['providers'] {
  if (!isAuth0Configured()) {
    return [];
  }
  const a = environment.auth0;
  return [
    provideAuth0({
      domain: a.domain,
      clientId: a.clientId,
      useRefreshTokens: true,
      // In-memory cache (not localStorage): an XSS can't read persisted access/refresh
      // tokens. Trade-off: a full page reload does a silent re-auth instead of reading
      // tokens from storage. Revert to 'localstorage' only if that UX is unacceptable.
      cacheLocation: 'memory',
      authorizationParams: {
        audience: a.audience || undefined,
        redirect_uri:
          typeof window !== 'undefined' ? window.location.origin : undefined,
      },
      httpInterceptor: {
        allowedList: [
          {
            uriMatcher: (uri) => {
              const path = uri.split('?')[0]?.split('#')[0] ?? uri;
              return path.startsWith(apiV1Prefix());
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
    provideAnimations(),
    provideToastr({ positionClass: 'toast-bottom-right' }),
    provideRouter(appRoutes),
    provideHttpClient(
      withFetch(),
      ...(environment.bffAuth ? [withInterceptors([bffHttpInterceptor])]
      : isAuth0Configured() ? [withInterceptors([authHttpInterceptorFn])]
      : []),
    ),
    // Auth0 SPA providers only in non-BFF mode; BFF mode uses cookie sessions via the edge.
    ...(environment.bffAuth ? [] : auth0Providers()),
  ],
};
