import { Routes } from '@angular/router';
import { templateNavVisibilityGuard } from '@/app/guards/template-nav-visibility.guard';

export const INTEGRATIONS_ROUTES: Routes = [
  {
    path: 'integrations',
    canActivate: [templateNavVisibilityGuard],
    loadComponent: () =>
      import('./integrations-list-page/integrations-list-page').then((m) => m.IntegrationsListPage),
    data: { title: 'Integrations' },
  },
  {
    path: 'integrations/:id',
    canActivate: [templateNavVisibilityGuard],
    loadComponent: () =>
      import('./integration-detail-page/integration-detail-page').then((m) => m.IntegrationDetailPage),
    data: { title: 'Integration' },
  },
];
