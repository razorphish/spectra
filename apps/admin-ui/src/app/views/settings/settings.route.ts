import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: 'settings',
    pathMatch: 'full',
    redirectTo: 'settings/migrations',
  },
  {
    path: 'settings/general',
    loadComponent: () =>
      import('./general-settings-page/general-settings-page').then((m) => m.GeneralSettingsPage),
    data: { title: 'General' },
  },
  {
    path: 'settings/migrations',
    loadComponent: () =>
      import('./settings-page/settings-page').then((m) => m.SettingsPage),
    data: { title: 'Settings' },
  },
  {
    path: 'settings/logging',
    loadComponent: () =>
      import('./logging-page/logging-page').then((m) => m.LoggingPage),
    data: { title: 'Logging' },
  },
];
