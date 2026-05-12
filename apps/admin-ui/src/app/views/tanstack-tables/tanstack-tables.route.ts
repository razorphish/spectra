import { Routes } from '@angular/router';
import { TableFlagship } from '@/app/views/tanstack-tables/table-flagship/table-flagship';
import { TableWithSearch } from '@/app/views/tanstack-tables/table-with-search/table-with-search';
import { TableWithPagination } from '@/app/views/tanstack-tables/table-with-pagination/table-with-pagination';
import { TableWithCheckbox } from '@/app/views/tanstack-tables/table-with-checkbox/table-with-checkbox';
import { TableWithDeleteButtons } from '@/app/views/tanstack-tables/table-with-delete-buttons/table-with-delete-buttons';
import { TableWithSorting } from '@/app/views/tanstack-tables/table-with-sorting/table-with-sorting';
import { TableWithFilters } from '@/app/views/tanstack-tables/table-with-filters/table-with-filters';

export const TANSTACK_TABLES_ROUTES: Routes = [
  {
    path: 'tanstack-tables/full',
    component: TableFlagship,
    data: { title: 'Data table' },
  },
  {
    path: 'tanstack-tables/search',
    component: TableWithSearch,
    data: { title: 'Table with Search' },
  },
  {
    path: 'tanstack-tables/pagination',
    component: TableWithPagination,
    data: { title: 'Table with Pagination' },
  },
  {
    path: 'tanstack-tables/checkbox-select',
    component: TableWithCheckbox,
    data: { title: 'Table with Checkbox' },
  },
  {
    path: 'tanstack-tables/delete-buttons',
    component: TableWithDeleteButtons,
    data: { title: 'Table with Delete Buttons' },
  },
  {
    path: 'tanstack-tables/sorting',
    component: TableWithSorting,
    data: { title: 'Table with Sorting' },
  },
  {
    path: 'tanstack-tables/filters',
    component: TableWithFilters,
    data: { title: 'Table with Filters' },
  },
];
