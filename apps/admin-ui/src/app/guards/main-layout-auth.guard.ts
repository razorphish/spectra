import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { from, map, of, switchMap, take } from 'rxjs';
import { isAuth0EnvIncomplete, isAuth0RuntimeConfigured } from '../core/auth/auth0-env';
import { AdminSessionService } from '../core/services/admin-session.service';

const auth0RuntimeReady = () => isAuth0RuntimeConfigured();

export const mainLayoutAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const injector = inject(Injector);
  const session = inject(AdminSessionService);

  if (auth0RuntimeReady()) {
    // Defer `AuthService` until after the current synchronous router work. `AuthService`
    // pulls `Router` via `AbstractNavigator`; resolving it during activation causes NG0200.
    return from(Promise.resolve()).pipe(
      switchMap(() => {
        const auth = injector.get(AuthService);
        return auth.isAuthenticated$.pipe(
          take(1),
          map((loggedIn) =>
            loggedIn ? true : router.createUrlTree(['/auth/login']),
          ),
        );
      }),
    );
  }

  if (isAuth0EnvIncomplete()) {
    if (session.isLoggedIn()) {
      session.clear();
    }
    return of(router.createUrlTree(['/auth/login']));
  }

  if (session.isLoggedIn()) {
    return true;
  }
  return of(router.createUrlTree(['/auth/login']));
};
