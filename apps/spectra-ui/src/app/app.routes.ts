import { Route } from '@angular/router';
import { DataPageComponent } from './pages/data-page.component';
import { DocsPageComponent } from './pages/docs-page.component';
import { HomeComponent } from './pages/home.component';
import { ProductionAccessPageComponent } from './pages/production-access-page.component';
import { SupportPageComponent } from './pages/support-page.component';
import { TermsPageComponent } from './pages/terms-page.component';
import { UseCasesPageComponent } from './pages/use-cases-page.component';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'use-cases', component: UseCasesPageComponent },
  { path: 'docs', component: DocsPageComponent },
  { path: 'data', component: DataPageComponent },
  { path: 'production-access', component: ProductionAccessPageComponent },
  { path: 'support', component: SupportPageComponent },
  { path: 'terms', component: TermsPageComponent },
];
