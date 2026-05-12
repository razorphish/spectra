import { APP_INITIALIZER, Provider } from '@angular/core';
import { environment } from '../../../environments/environment';

function telemetryInit(): () => void {
  return () => {
    if (environment.telemetry.enabled) {
      console.debug('[telemetry] APP_INITIALIZER — attach RUM / tracing SDK here.');
    }
  };
}

export function provideTelemetryInit(): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: telemetryInit,
    },
  ];
}
