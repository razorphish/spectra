import { Route } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import { AccountPageComponent } from './pages/account.page';
import { ApplicationFormPageComponent } from './pages/application-form.page';
import { ApplicationViewPageComponent } from './pages/application-view.page';
import { DashboardPageComponent } from './pages/dashboard.page';
import { IntegrationNewPageComponent } from './pages/integration-new.page';
import { IntegrationViewPageComponent } from './pages/integration-view.page';
import { LandingPageComponent } from './pages/landing.page';

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
    path: 'integrations/:id',
    component: IntegrationViewPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'applications/new',
    component: ApplicationFormPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'applications/:id/edit',
    component: ApplicationFormPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'applications/:id',
    component: ApplicationViewPageComponent,
    canActivate: [AuthGuard],
  },
];
