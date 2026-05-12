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
  {
    path: '',
    component: MainLayout,
    canActivate: [mainLayoutAuthGuard],
    loadChildren: () =>
      import('./views/views.route').then((m) => m.VIEWS_ROUTES),
  },
  {
    path: '',
    component: AuthLayout,
    loadChildren: () =>
      import('./views/auth/auth.route').then((m) => m.AUTH_ROUTES),
  },
];
