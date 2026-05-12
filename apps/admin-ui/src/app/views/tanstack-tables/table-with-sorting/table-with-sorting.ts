import {Component, signal} from '@angular/core';
import {PageBreadcrumb} from "@app/components/page-breadcrumb";
import {TablePagination} from "@app/components/table-pagination";
import {TanstackTable} from "@app/components/tanstack-table";
import {users, UserType} from '@/app/views/tanstack-tables/data';
import {
  ColumnDef,
  createAngularTable,
  getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/angular-table';

@Component({
  selector: 'app-table-with-sorting',
    imports: [
        PageBreadcrumb,
        TablePagination,
        TanstackTable
    ],
  templateUrl: './table-with-sorting.html',
  styles: ``
})
export class TableWithSorting {

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
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'amount',
      header: 'Due',
      cell: info => info.getValue(),
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
