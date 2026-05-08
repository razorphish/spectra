import { Route } from '@angular/router';
import { HomeComponent } from './pages/home.component';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', component: HomeComponent },
];
