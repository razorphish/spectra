import { Routes } from '@angular/router';
import { templateNavVisibilityGuard } from '@/app/guards/template-nav-visibility.guard';
import { TableFlagship } from '@/app/views/tanstack-tables/table-flagship/table-flagship';
import { TableWithSearch } from '@/app/views/tanstack-tables/table-with-search/table-with-search';
import { TableWithPagination } from '@/app/views/tanstack-tables/table-with-pagination/table-with-pagination';
import { TableWithCheckbox } from '@/app/views/tanstack-tables/table-with-checkbox/table-with-checkbox';
import { TableWithDeleteButtons } from '@/app/views/tanstack-tables/table-with-delete-buttons/table-with-delete-buttons';
import { TableWithSorting } from '@/app/views/tanstack-tables/table-with-sorting/table-with-sorting';
import { TableWithFilters } from '@/app/views/tanstack-tables/table-with-filters/table-with-filters';

const tanstackData = { templateNavMenuKey: 'tanstack_table' as const };

export const TANSTACK_TABLES_ROUTES: Routes = [
  {
    path: 'tanstack-tables/full',
    canActivate: [templateNavVisibilityGuard],
    component: TableFlagship,
    data: { title: 'Data table', ...tanstackData },
  },
  {
    path: 'tanstack-tables/search',
    canActivate: [templateNavVisibilityGuard],
    component: TableWithSearch,
    data: { title: 'Table with Search', ...tanstackData },
  },
  {
    path: 'tanstack-tables/pagination',
    canActivate: [templateNavVisibilityGuard],
    component: TableWithPagination,
    data: { title: 'Table with Pagination', ...tanstackData },
  },
  {
    path: 'tanstack-tables/checkbox-select',
    canActivate: [templateNavVisibilityGuard],
    component: TableWithCheckbox,
    data: { title: 'Table with Checkbox', ...tanstackData },
  },
  {
    path: 'tanstack-tables/delete-buttons',
    canActivate: [templateNavVisibilityGuard],
    component: TableWithDeleteButtons,
    data: { title: 'Table with Delete Buttons', ...tanstackData },
  },
  {
    path: 'tanstack-tables/sorting',
    canActivate: [templateNavVisibilityGuard],
    component: TableWithSorting,
    data: { title: 'Table with Sorting', ...tanstackData },
  },
  {
    path: 'tanstack-tables/filters',
    canActivate: [templateNavVisibilityGuard],
    component: TableWithFilters,
    data: { title: 'Table with Filters', ...tanstackData },
  },
];
