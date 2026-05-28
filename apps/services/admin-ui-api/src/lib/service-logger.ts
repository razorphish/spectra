import { createServiceLogging } from '@spectra/logger-express';

const logging = createServiceLogging({ service: 'admin-ui-api' });

export const {
  getServiceLog,
  initServiceLogging,
  refreshServiceLoggingFromPlatform,
} = logging;
