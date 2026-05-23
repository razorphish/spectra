import { Routes } from '@angular/router';
import { mainLayoutAuthGuard } from './guards/main-layout-auth.guard';
import { AuthLayout } from '@layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  // Match `auth/*` before the empty-path main shell so guards never touch Auth0 during auth-route activation.
  {
    path: 'auth',
    component: AuthLayout,
    loadChildren: () =>
      import('./views/auth/auth.route').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'landing',
    canActivate: [mainLayoutAuthGuard],
    loadComponent: () =>
      import('./views/landing/landing').then((m) => m.Landing),
    data: { title: 'Landing' },
  },
  {
    path: 'error/404-2',
    loadComponent: () =>
      import('./views/error/error-404-alt').then((m) => m.Error404Alt),
    data: { title: 'Error 404 Alt' },
  },
  {
    path: 'error/500',
    loadComponent: () =>
      import('./views/error/error-500').then((m) => m.Error500),
    data: { title: 'Error 500' },
  },
  {
    path: 'tables/style-generator',
    canActivate: [mainLayoutAuthGuard],
    loadComponent: () =>
      import('./views/tables/table-style-generator/table-style-generator').then(
        (m) => m.TableStyleGenerator,
      ),
    data: { title: 'Table Style Generator' },
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [mainLayoutAuthGuard],
    loadChildren: () =>
      import('./views/views.route').then((m) => m.VIEWS_ROUTES),
  },
];
