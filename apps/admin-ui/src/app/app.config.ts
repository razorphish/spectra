import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAuth0 } from '@auth0/auth0-angular';
import { provideToastr } from 'ngx-toastr';
import { environment } from '../environments/environment';
import { SpectraGlobalErrorHandler } from './core/telemetry/spectra-global-error-handler';
import { provideTelemetryInit } from './core/telemetry/telemetry-init';
import { appRoutes } from './app.routes';

function auth0Config() {
  const a = environment.auth0;
  if (!a.enabled || !a.domain || !a.clientId) {
    return [];
  }
  return [
    provideAuth0({
      domain: a.domain,
      clientId: a.clientId,
      authorizationParams: {
        audience: a.audience || undefined,
        redirect_uri: a.redirectUri || undefined,
      },
      httpInterceptor: {
        allowedList: [],
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
    provideHttpClient(withFetch()),
    { provide: ErrorHandler, useClass: SpectraGlobalErrorHandler },
    ...provideTelemetryInit(),
    ...auth0Config(),
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
  ],
};
