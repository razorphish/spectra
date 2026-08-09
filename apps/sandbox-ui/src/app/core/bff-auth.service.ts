import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type BffUser = { sub: string; email?: string; name?: string };

/** Reads a cookie value by name (used for the JS-readable CSRF token). */
export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/**
 * Auth client for BFF mode: the browser holds only the session cookie; this talks to the
 * same-origin /bff/* endpoints. Used only when `environment.bffAuth` is true.
 */
@Injectable({ providedIn: 'root' })
export class BffAuthService {
  private readonly http = inject(HttpClient);
  /** undefined = not checked yet, null = anonymous, object = signed in. */
  readonly user = signal<BffUser | null | undefined>(undefined);

  private base(): string {
    return environment.apiBaseUrl.replace(/\/$/, '');
  }

  /** GET /bff/me; caches into the `user` signal. Never throws. */
  loadMe(): Observable<BffUser | null> {
    return this.http.get<BffUser>(`${this.base()}/bff/me`, { withCredentials: true }).pipe(
      tap((u) => this.user.set(u)),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
    );
  }

  /** Top-level navigation to start the OAuth login (server sets the session cookie). */
  login(returnTo?: string): void {
    const url = `${this.base()}/bff/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
    window.location.assign(url);
  }

  /** POST /bff/logout with the CSRF header, then follow the returned Auth0 logout URL. */
  logout(): void {
    const csrf = readCookie('bff_csrf');
    fetch(`${this.base()}/bff/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { 'X-CSRF-Token': csrf } : {},
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ logoutUrl?: string }>) : null))
      .then((j) => window.location.assign(j?.logoutUrl ?? '/'))
      .catch(() => window.location.assign('/'));
  }
}
