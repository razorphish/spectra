import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { SandboxPortalService } from '../services/sandbox-portal.service';

/** Blocks `/applications/*` when sandbox applications UI is disabled in platform settings. */
export const developerApplicationsGuard: CanActivateFn = () => {
  const api = inject(SandboxPortalService);
  const router = inject(Router);
  return api.session().pipe(
    map((s) =>
      s.developerApplicationsUiEnabled === true ? true : router.createUrlTree(['/dashboard']),
    ),
    catchError(() => of(router.createUrlTree(['/dashboard']))),
  );
};
