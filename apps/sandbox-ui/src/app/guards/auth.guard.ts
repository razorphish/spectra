import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { BffAuthService } from '../core/bff-auth.service';

/**
 * Route guard that works in both auth modes:
 * - BFF mode: check /bff/me; redirect to /bff/login when anonymous.
 * - Auth0 SPA mode (default): delegate to the Auth0 AuthGuard (unchanged behavior).
 */
export const authGuard: CanActivateFn = (route, state) => {
  if (!environment.bffAuth) {
    return inject(AuthGuard).canActivate(route, state);
  }
  const bff = inject(BffAuthService);
  return bff.loadMe().pipe(
    map((user) => {
      if (user) return true;
      bff.login(state.url);
      return false;
    }),
  );
};
