import { Routes } from '@angular/router';
import { templateNavVisibilityGuard } from '@/app/guards/template-nav-visibility.guard';
import { System } from '@/app/views/icons/system/system';
import { FontAwesome } from '@/app/views/icons/font-awesome/font-awesome';
import { SmartAdmin } from '@/app/views/icons/smart-admin/smart-admin';

export const ICONS_ROUTES: Routes = [
  {
    path: 'icons/system',
    canActivate: [templateNavVisibilityGuard],
    component: System,
    data: { title: 'System Icons', templateNavMenuKey: 'iconography' },
  },
  {
    path: 'icons/font-awesome',
    canActivate: [templateNavVisibilityGuard],
    component: FontAwesome,
    data: { title: 'Font Awesome Icons', templateNavMenuKey: 'iconography' },
  },
  {
    path: 'icons/smart-admin',
    canActivate: [templateNavVisibilityGuard],
    component: SmartAdmin,
    data: { title: 'Smart Admin Icons', templateNavMenuKey: 'iconography' },
  },
];
