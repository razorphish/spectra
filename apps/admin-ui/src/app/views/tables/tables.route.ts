import { Routes } from '@angular/router';
import { templateNavVisibilityGuard } from '@/app/guards/template-nav-visibility.guard';
import { Basic } from '@/app/views/tables/basic/basic';
import { TableStyleGenerator } from '@/app/views/tables/table-style-generator/table-style-generator';

export const TABLES_ROUTES: Routes = [
  {
    path: 'tables/basic',
    canActivate: [templateNavVisibilityGuard],
    component: Basic,
    data: { title: 'Basic Tables', templateNavMenuKey: 'tables' },
  },
];
