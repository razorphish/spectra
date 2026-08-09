import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { readCookie } from './bff-auth.service';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Requests to our own API/BFF (same-origin or the configured apiBaseUrl). */
function isOwnApi(url: string): boolean {
  if (url.startsWith('/')) return true; // relative → same origin
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  return base ? url.startsWith(base) : false;
}

/**
 * BFF-mode HTTP interceptor: sends the session cookie (`withCredentials`) and, for unsafe
 * methods, the double-submit CSRF header. On 401 (session gone) it bounces to /bff/login.
 * Only touches our own API so third-party requests never get credentials.
 */
export const bffHttpInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isOwnApi(req.url)) return next(req);
  let r = req.clone({ withCredentials: true });
  if (!SAFE.has(req.method)) {
    const csrf = readCookie('bff_csrf');
    if (csrf) r = r.clone({ setHeaders: { 'X-CSRF-Token': csrf } });
  }
  return next(r).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const base = environment.apiBaseUrl.replace(/\/$/, '');
        window.location.assign(`${base}/bff/login?returnTo=${encodeURIComponent(location.pathname)}`);
      }
      return throwError(() => err);
    }),
  );
};
