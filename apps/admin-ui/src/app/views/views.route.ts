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
    path: 'platform/production-access',
    canActivate: [templateNavVisibilityGuard],
    loadComponent: () =>
      import('./platform/production-access-list-page').then((m) => m.ProductionAccessListPage),
    data: { title: 'Production access' },
  },
  {
    path: 'platform/production-access/:id',
    canActivate: [templateNavVisibilityGuard],
    loadComponent: () =>
      import('./platform/production-access-detail-page').then((m) => m.ProductionAccessDetailPage),
    data: { title: 'Production access detail' },
  },
  {
    path: 'platform/sandbox-ai-models',
    loadComponent: () =>
      import('./platform/sandbox-ai-models-list-page').then((m) => m.SandboxAiModelsListPage),
    data: { title: 'Sandbox AI models' },
  },
  {
    path: 'platform/pricing-profiles',
    loadComponent: () =>
      import('./platform/pricing-profiles-list-page').then((m) => m.PricingProfilesListPage),
    data: { title: 'Pricing profiles' },
  },
  {
    path: 'platform/custom-endpoints',
    loadComponent: () =>
      import('./platform/custom-endpoints-approval-list-page').then((m) => m.CustomEndpointsApprovalListPage),
    data: { title: 'Custom endpoint approvals' },
  },
  {
    path: 'platform/custom-endpoints/:id',
    loadComponent: () =>
      import('./platform/custom-endpoints-approval-detail-page').then(
        (m) => m.CustomEndpointsApprovalDetailPage,
      ),
    data: { title: 'Custom endpoint approval' },
  },
  {
    path: 'platform/runtime-tenants',
    loadComponent: () =>
      import('./platform/runtime-tenants-list-page').then((m) => m.RuntimeTenantsListPage),
    data: { title: 'Runtime tenants' },
  },
  {
    path: 'platform/runtime-tenants/:id',
    loadComponent: () =>
      import('./platform/runtime-tenants-detail-page').then((m) => m.RuntimeTenantsDetailPage),
    data: { title: 'Runtime tenant' },
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
