import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageBreadcrumb } from '@app/components/page-breadcrumb';
import { TablePagination } from '@app/components/table-pagination';
import { TanstackTable } from '@app/components/tanstack-table';
import { users, UserType } from '@/app/views/tanstack-tables/data';
import {
  ColumnDef,
  createAngularTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/angular-table';

@Component({
  selector: 'app-table-flagship',
  imports: [PageBreadcrumb, TablePagination, TanstackTable, FormsModule],
  templateUrl: './table-flagship.html',
  styles: ``,
})
export class TableFlagship {
  readonly Math = Math;

  deleteUser = (id: number) => {
    this.data.update((rows) => rows.filter((u) => u.id !== id));
  };

  data = signal<UserType[]>(users);

  columns: ColumnDef<UserType>[] = [
    {
      id: 'select',
      header: 'Select',
      enableSorting: false,
      cell: () => null,
    },
    {
      accessorKey: 'id',
      header: 'ID',
      enableSorting: true,
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      enableSorting: false,
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (info) => info.getValue(),
      filterFn: (row, id, filterValue) => {
        if (filterValue === 'All') return true;
        return row.getValue(id) === filterValue;
      },
    },
    {
      accessorKey: 'amount',
      header: 'Due',
      enableSorting: true,
      cell: (info) => info.getValue(),
      filterFn: (row, id, filterValue) => {
        if (!filterValue || filterValue === 'All') return true;
        const price = Number(row.getValue(id));
        if (filterValue === '0-100') return price >= 0 && price <= 100;
        if (filterValue === '100-200') return price >= 100 && price <= 200;
        if (filterValue === '200-300') return price >= 200 && price <= 300;
        if (filterValue === '300-400') return price >= 300 && price <= 400;
        if (filterValue === '400+') return price > 400;
        return true;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: () => null,
    },
  ];

  table = createAngularTable<UserType>(() => ({
    data: this.data(),
    columns: this.columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
    enableRowSelection: true,
  }));
}
