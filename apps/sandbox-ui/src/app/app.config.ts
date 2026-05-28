import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

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
      cacheLocation: 'localstorage',
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
    provideRouter(appRoutes),
    provideHttpClient(
      withFetch(),
      ...(isAuth0Configured() ? [withInterceptors([authHttpInterceptorFn])] : [])
    ),
    ...auth0Providers(),
  ],
};
