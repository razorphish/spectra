import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { map, take } from 'rxjs';
import { environment } from '../../environments/environment';

const auth0Configured = () =>
  environment.auth0.enabled &&
  !!environment.auth0.domain &&
  !!environment.auth0.clientId;

export const mainLayoutAuthGuard: CanActivateFn = () => {
  if (!auth0Configured()) {
    return true;
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated$.pipe(
    take(1),
    map((loggedIn) =>
      loggedIn ? true : router.createUrlTree(['/auth/login']),
    ),
  );
};
