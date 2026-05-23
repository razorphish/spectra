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
