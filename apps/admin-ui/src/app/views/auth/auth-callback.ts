import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ToastrService } from 'ngx-toastr';
import { catchError, EMPTY, filter, of, switchMap, take, tap } from 'rxjs';
import { isAuth0RuntimeConfigured } from '../../core/auth/auth0-env';
import {
  STAFF_PROFILE_SYNCED_SESSION_KEY,
  staffMeSyncUrl,
} from '../../core/auth/staff-profile-sync';
import { environment } from '../../../environments/environment';

function decodeOAuthErrorDescription(raw: string | null): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    return raw;
  }
}

/**
 * OAuth2 redirect target. Auth0 returns here with `?code=` and `?state=`; `AuthService`
 * handles the exchange once this component is created (it injects `AuthService`).
 */
@Component({
  selector: 'app-auth-callback',
  imports: [],
  template: `
    <div class="row justify-content-center mt-5">
      <div class="col-auto text-white">Signing you in…</div>
    </div>
  `,
})
export class AuthCallback {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  constructor() {
    const dashboard = '/dashboards/control-center';
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const oauthError = sp.get('error');
      if (oauthError) {
        const desc = decodeOAuthErrorDescription(sp.get('error_description'));
        const combined = `${oauthError} ${desc}`.toLowerCase();
        const looksLikeCallbackMismatch =
          combined.includes('callback') ||
          combined.includes('redirect_uri') ||
          combined.includes('redirect uri');
        const looksLikeResourceServerDenied = combined.includes(
          'not authorized to access resource server',
        );
        let detail = desc || oauthError;
        if (looksLikeCallbackMismatch) {
          detail += ` — In Auth0 → Applications → your SPA → Allowed Callback URLs, add exactly: ${window.location.origin}/auth/callback (same host as the address bar; add both localhost and 127.0.0.1 if you use either).`;
        } else if (looksLikeResourceServerDenied) {
          detail +=
            ' — Auth0 → Applications → APIs → open the API with Identifier matching your audience → Application Access → Edit → grant User-Delegated Access to this SPA. (Per-app API policy requires this; “APIs” on the application alone may not be enough.)';
        }
        this.toastr.error(detail, 'Auth0 sign-in');
        void this.router.navigateByUrl('/auth/login', { replaceUrl: true });
        return;
      }
    }
    this.auth.isLoading$
      .pipe(
        filter((loading) => !loading),
        take(1),
        switchMap(() => this.auth.isAuthenticated$.pipe(take(1))),
        switchMap((authed) => {
          if (!authed) {
            void this.router.navigateByUrl('/auth/login', { replaceUrl: true });
            return EMPTY;
          }
          const shouldSync =
            isAuth0RuntimeConfigured() &&
            typeof sessionStorage !== 'undefined' &&
            !sessionStorage.getItem(STAFF_PROFILE_SYNCED_SESSION_KEY);
          if (!shouldSync) {
            void this.router.navigateByUrl(dashboard, { replaceUrl: true });
            return EMPTY;
          }
          return this.http.post(staffMeSyncUrl(environment.apiBaseUrl), {}).pipe(
            tap(() => {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(STAFF_PROFILE_SYNCED_SESSION_KEY, '1');
              }
            }),
            catchError(() => {
              this.toastr.error(
                'Could not sync your staff profile to Spectra. You are signed in; try again later or contact an admin.',
                'Profile sync',
              );
              return of(undefined);
            }),
            tap(() => void this.router.navigateByUrl(dashboard, { replaceUrl: true })),
          );
        }),
      )
      .subscribe();
  }
}
