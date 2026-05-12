import { ErrorHandler, Injectable, isDevMode } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Extension point for Sentry / Datadog / OpenTelemetry.
 */
@Injectable()
export class SpectraGlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (environment.telemetry.enabled && isDevMode()) {
      console.debug('[telemetry] uncaught error', error);
    }
    console.error(error);
  }
}
