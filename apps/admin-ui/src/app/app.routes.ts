import { Routes } from '@angular/router';
import { mainLayoutAuthGuard } from './guards/main-layout-auth.guard';
import { templateNavVisibilityGuard } from './guards/template-nav-visibility.guard';
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
    canActivate: [mainLayoutAuthGuard, templateNavVisibilityGuard],
    loadComponent: () =>
      import('./views/landing/landing').then((m) => m.Landing),
    data: { title: 'Landing', templateNavMenuKey: 'landing' },
  },
  {
    path: 'error/404-2',
    canActivate: [templateNavVisibilityGuard],
    loadComponent: () =>
      import('./views/error/error-404-alt').then((m) => m.Error404Alt),
    data: { title: 'Error 404 Alt', templateNavMenuKey: 'error_pages' },
  },
  {
    path: 'error/500',
    canActivate: [templateNavVisibilityGuard],
    loadComponent: () =>
      import('./views/error/error-500').then((m) => m.Error500),
    data: { title: 'Error 500', templateNavMenuKey: 'error_pages' },
  },
  {
    path: 'tables/style-generator',
    canActivate: [mainLayoutAuthGuard, templateNavVisibilityGuard],
    loadComponent: () =>
      import('./views/tables/table-style-generator/table-style-generator').then(
        (m) => m.TableStyleGenerator,
      ),
    data: { title: 'Table Style Generator', templateNavMenuKey: 'tables' },
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [mainLayoutAuthGuard],
    loadChildren: () =>
      import('./views/views.route').then((m) => m.VIEWS_ROUTES),
  },
];
