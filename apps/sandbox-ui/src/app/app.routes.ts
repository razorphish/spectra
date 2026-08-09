import { Route } from '@angular/router';
import { authGuard as AuthGuard } from './guards/auth.guard';
import { AccountPageComponent } from './pages/account.page';
import { ApplicationFormPageComponent } from './pages/application-form.page';
import { ApplicationViewPageComponent } from './pages/application-view.page';
import { DashboardPageComponent } from './pages/dashboard.page';
import { developerApplicationsGuard } from './guards/developer-applications.guard';
import { IntegrationNewPageComponent } from './pages/integration-new.page';
import { IntegrationViewPageComponent } from './pages/integration-view.page';
import { LandingPageComponent } from './pages/landing.page';
import { CustomEndpointsPageComponent } from './pages/custom-endpoints.page';
import { CustomEndpointsShellPageComponent } from './pages/custom-endpoints-shell.page';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', component: LandingPageComponent },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [AuthGuard] },
  { path: 'account', component: AccountPageComponent, canActivate: [AuthGuard] },
  {
    path: 'integrations/new',
    component: IntegrationNewPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'integrations/:id/production-access',
    component: IntegrationViewPageComponent,
    canActivate: [AuthGuard],
    data: { integrationDefaultTab: 'par' },
  },
  {
    path: 'integrations/:id/edit',
    component: IntegrationViewPageComponent,
    canActivate: [AuthGuard],
    data: { integrationDefaultTab: 'details' },
  },
  {
    path: 'integrations/:id',
    component: IntegrationViewPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'applications/new',
    component: ApplicationFormPageComponent,
    canActivate: [AuthGuard, developerApplicationsGuard],
  },
  {
    path: 'applications/:id/edit',
    component: ApplicationFormPageComponent,
    canActivate: [AuthGuard, developerApplicationsGuard],
  },
  {
    path: 'applications/:id',
    component: ApplicationViewPageComponent,
    canActivate: [AuthGuard, developerApplicationsGuard],
  },
  {
    path: 'custom-endpoints',
    component: CustomEndpointsShellPageComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: CustomEndpointsPageComponent,
        data: { customEndpointsMode: 'list' },
      },
      {
        path: 'new',
        component: CustomEndpointsPageComponent,
        data: { customEndpointsMode: 'new' },
      },
      {
        path: ':id',
        component: CustomEndpointsPageComponent,
        data: { customEndpointsMode: 'focus' },
      },
    ],
  },
];
