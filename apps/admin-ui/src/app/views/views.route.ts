import { Routes } from '@angular/router';
import { templateNavVisibilityGuard } from '@/app/guards/template-nav-visibility.guard';
import { BlankPage } from '@/app/views/blank-page/blank-page';
import { Error404 } from '@/app/views/error/error-404';
import { UserProfile } from '@/app/views/user-profile/user-profile';

export const VIEWS_ROUTES: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./dashboards/dashboards.route').then((m) => m.DASHBOARDS_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./icons/icons.route').then((m) => m.ICONS_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./tables/tables.route').then((m) => m.TABLES_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./tanstack-tables/tanstack-tables.route').then(
        (m) => m.TANSTACK_TABLES_ROUTES,
      ),
  },
  {
    path: '',
    loadChildren: () =>
      import('./settings/settings.route').then((m) => m.SETTINGS_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./integrations/integrations.route').then((m) => m.INTEGRATIONS_ROUTES),
  },
  {
    path: 'blank-page',
    canActivate: [templateNavVisibilityGuard],
    component: BlankPage,
    data: { title: 'Blank Page', templateNavMenuKey: 'blank_page' },
  },
  {
    path: 'user-profile',
    canActivate: [templateNavVisibilityGuard],
    component: UserProfile,
    data: { title: 'User Profile', templateNavMenuKey: 'user_profile' },
  },
  {
    path: 'error/404',
    canActivate: [templateNavVisibilityGuard],
    component: Error404,
    data: { title: 'Error 404', templateNavMenuKey: 'error_pages' },
  },
];
