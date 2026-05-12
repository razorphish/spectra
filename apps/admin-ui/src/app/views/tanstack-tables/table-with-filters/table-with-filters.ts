import {Component, signal} from '@angular/core';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';
import {TablePagination} from '@app/components/table-pagination';
import {TanstackTable} from '@app/components/tanstack-table';
import {users, UserType} from '@/app/views/tanstack-tables/data';
import {
  ColumnDef,
  createAngularTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/angular-table';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-table-with-filters',
  imports: [
    PageBreadcrumb,
    TablePagination,
    TanstackTable,
    FormsModule,
  ],
  templateUrl: './table-with-filters.html',
  styles: ``
})
export class TableWithFilters {

  data = signal<UserType[]>(users);

  columns: ColumnDef<UserType>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      enableSorting: false,
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: false,
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: false,
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      enableSorting: false,
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: false,
      cell: info => info.getValue(),
      filterFn: (row, id, filterValue) => {
        if (filterValue === 'All') return true;
        return row.getValue(id) === filterValue;
      },
    },
    {
      accessorKey: 'amount',
      header: 'Due',
      enableSorting: false,
      cell: info => info.getValue(),

      filterFn: (row, id, filterValue) => {
        if (!filterValue) return true;
        const price = Number(row.getValue(id));

        if (filterValue === '0-100') return price >= 0 && price <= 100;
        if (filterValue === '100-200') return price >= 100 && price <= 200;
        if (filterValue === '200-300') return price >= 200 && price <= 300;
        if (filterValue === '300-400') return price >= 300 && price <= 400;
        if (filterValue === '400+') return price > 400;

        return true;
      },
    },
  ]

  table = createAngularTable<UserType>(() => ({
    data: this.data(),
    columns: this.columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  }));
  protected readonly Math = Math;
}
