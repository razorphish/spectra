import { Routes } from '@angular/router';
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
      import('./tanstack-tables/tanstack-tables.route').then(
        (m) => m.TANSTACK_TABLES_ROUTES,
      ),
  },
  {
    path: 'blank-page',
    component: BlankPage,
    data: { title: 'Blank Page' },
  },
  {
    path: 'user-profile',
    component: UserProfile,
    data: { title: 'User Profile' },
  },
  {
    path: 'error/404',
    component: Error404,
    data: { title: 'Error 404' },
  },
];
