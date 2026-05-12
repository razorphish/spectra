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
  selector: 'app-table-with-delete-buttons',
    imports: [
        PageBreadcrumb,
        TablePagination,
        TanstackTable
    ],
  templateUrl: './table-with-delete-buttons.html',
  styles: ``
})
export class TableWithDeleteButtons {
  deleteUser = (id: number) => {
    this.data.update(users => users.filter(user => user.id !== id));
  };
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
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: () => null
    }
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
