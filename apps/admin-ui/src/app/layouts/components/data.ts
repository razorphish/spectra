import { MenuItemType } from '@/app/types/layout';

export const menuItems: MenuItemType[] = [
  { label: 'Insights', isTitle: true },
  {
    label: 'Dashboards',
    icon: '/assets/icons/sprite.svg#trello',
    isCollapsed: true,
    badge: { variant: 'danger', text: 'New' },
    children: [
      { label: 'Control Center', url: '/dashboards/control-center' },
      { label: 'Subscription & Billing', url: '/dashboards/subscription' },
      { label: 'Marketing & Sales', url: '/dashboards/marketing' },
      { label: 'Project Management', url: '/dashboards/project-management' },
    ],
  },
  {
    icon: '/assets/icons/sprite.svg#home',
    label: 'Blank Page',
    url: '/blank-page',
  },
  {
    label: 'Layouts',
    isTitle: true,
  },
  {
    icon: '/assets/icons/sprite.svg#slash',
    isCollapsed: true,
    label: 'Authentication Pages',
    children: [
      { label: 'Login', url: '/auth/login' },
      { label: 'Register', url: '/auth/register' },
      { label: 'Forget Password', url: '/auth/forgot-password' },
      { label: '2FA', url: '/auth/two-factor' },
      { label: 'Lock Screen', url: '/auth/lockscreen' },
    ],
  },
  {
    isCollapsed: true,
    icon: '/assets/icons/sprite.svg#alert-triangle',
    label: 'Error Pages',
    children: [{ label: '404 Not Found', url: '/error/404' }],
  },
  {
    icon: '/assets/icons/sprite.svg#user',
    label: 'User Profile',
    url: '/user-profile',
  },
  {
    isCollapsed: true,
    icon: '/assets/icons/sprite.svg#database',
    label: 'TanStack Table',
    children: [
      { label: 'Data table (default)', url: '/tanstack-tables/full' },
      { label: 'Table With Search', url: '/tanstack-tables/search' },
      { label: 'Table With Pagination', url: '/tanstack-tables/pagination' },
      { label: 'Table With Checkbox', url: '/tanstack-tables/checkbox-select' },
      { label: 'Table With Delete Buttons', url: '/tanstack-tables/delete-buttons' },
      { label: 'Table With Filters', url: '/tanstack-tables/filters' },
      { label: 'Table With Sorting', url: '/tanstack-tables/sorting' },
    ],
  },
];
