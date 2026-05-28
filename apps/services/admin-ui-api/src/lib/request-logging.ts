import { createRequestLoggingMiddleware } from '@spectra/logger-express';

import { getServiceLog } from './service-logger';

export const requestLoggingMiddleware = createRequestLoggingMiddleware({
  getLog: getServiceLog,
});
