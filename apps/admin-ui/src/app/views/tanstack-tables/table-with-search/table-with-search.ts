import {Component, signal} from '@angular/core';
import {
  ColumnDef,
  createAngularTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/angular-table';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TanstackTable} from '@app/components/tanstack-table';
import {users, UserType} from '@/app/views/tanstack-tables/data';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';


@Component({
  selector: 'app-table-with-search',
  imports: [TanstackTable, ReactiveFormsModule, FormsModule, PageBreadcrumb],
  templateUrl: './table-with-search.html',
  styles: ``
})
export class TableWithSearch {

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
    },
    {
      accessorKey: 'amount',
      header: 'Due',
      enableSorting: false,
      cell: info => info.getValue(),
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
  }));



}

