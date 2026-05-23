import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { from, map, of, switchMap, take } from 'rxjs';
import { SidebarNavVisibilityService } from '../core/services/sidebar-nav-visibility.service';

/**
 * Blocks main-shell template routes when their `templateNavMenuKey` is hidden (Settings → General).
 * Unauthenticated users: allow (so `/auth/*` and unauthenticated error routes stay reachable).
 * Does not run on `/auth/*` routes (those routes omit this guard).
 *
 * Waits for `SidebarNavVisibilityService.ensureLoaded()` so cold deep links see the same rules as the sidebar.
 */
export const templateNavVisibilityGuard: CanActivateFn = (route) => {
  const injector = inject(Injector);
  const router = inject(Router);
  return from(Promise.resolve()).pipe(
    switchMap(() => {
      const auth = injector.get(AuthService);
      return auth.isAuthenticated$.pipe(
        take(1),
        switchMap((loggedIn) => {
          if (!loggedIn) {
            return of(true);
          }
          const vis = injector.get(SidebarNavVisibilityService);
          return from(vis.ensureLoaded()).pipe(
            map(() => {
              const key = route.data['templateNavMenuKey'] as string | undefined;
              if (!key) {
                return true;
              }
              if (!vis.isHidden(key)) {
                return true;
              }
              return router.createUrlTree(['/dashboards/control-center']);
            }),
          );
        }),
      );
    }),
  );
};
