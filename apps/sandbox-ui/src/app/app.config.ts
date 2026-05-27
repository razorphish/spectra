import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth0 } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

function isAuth0Configured(): boolean {
  const { domain, clientId } = environment.auth0;
  return Boolean(domain?.trim() && clientId?.trim());
}

function auth0Providers(): ApplicationConfig['providers'] {
  if (!isAuth0Configured()) {
    return [];
  }
  return [
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri:
          typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    }),
  ];
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withFetch()),
    ...auth0Providers(),
  ],
};
