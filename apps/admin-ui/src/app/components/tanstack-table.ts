import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Cell, FlexRenderDirective, Table} from '@tanstack/angular-table';
import {CommonModule} from '@angular/common';
import {NgIcon} from '@ng-icons/core';

@Component({
    selector: 'app-tanstack-table',
    imports: [FlexRenderDirective, CommonModule, NgIcon],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <div [ngClass]="['table-responsive mb-3 mb-md-0', className]">
        <table class="st-table  table table-striped table-hover">

          @if (showHeaders) {
            <thead class="bg-light align-middle bg-opacity-25 thead-sm">
              @for (headerGroup of table.getHeaderGroups(); track headerGroup) {
                <tr class="fs-xxs">
                  @for (header of headerGroup.headers; track header.id) {
                    <th
                      (click)="header.column.toggleSorting()"
                      [style.cursor]="header.column.getCanSort() ? 'pointer' : 'default'"
                      style="user-select: none"
                    >
                      <div class="d-flex align-items-center">
                        @if (header.column.id === 'select') {
                          <input type="checkbox"
                                 class="form-check-input form-check-input-light fs-14"
                                 [checked]="table.getIsAllRowsSelected()"
                                 [indeterminate]="table.getIsSomeRowsSelected()"
                                 (change)="table.toggleAllRowsSelected($any($event.target).checked)"/>
                        } @else {
                          <ng-container
                            *flexRender="header.column.columnDef.header; props: header.getContext()">
                            {{ header.column.columnDef.header }}
                          </ng-container>
                        }

                        @if (header.column.getCanSort()) {
                          @switch (header.column.getIsSorted()) {
                            @case ('asc') {
                              <ng-icon name="faSolidArrowUp" size="12"  class="ms-1"/>
                            }
                            @case ('desc') {
                              <ng-icon name="faSolidArrowDown"  size="12" class="ms-1"/>
                            }
                          }
                        }
                      </div>
                    </th>
                  }
                </tr>
              }
            </thead>
          }

          <tbody>
            @if (table.getRowModel().rows.length === 0) {
              <tr>
                <td [attr.colspan]="columns.length" class="text-center py-3 text-muted">
                  {{ emptyMessage }}
                </td>
              </tr>
            }

            @for (row of table.getRowModel().rows; track row.id) {
              <tr>
                @for (cell of row.getVisibleCells(); track cell.id) {
                  <td>
                    @if (cell.column.id === 'select') {
                      <input type="checkbox"
                             class="form-check-input form-check-input-light fs-14"
                             [checked]="cell.row.getIsSelected()"
                             (change)="cell.row.toggleSelected($any($event.target).checked)"/>
                    }
                    @if (cell.column.id === 'actions' && deleteUser) {
                      <div class="d-flex  gap-1 align-items-center">
                        <button type="button" class="btn btn-primary waves-effect btn-xs edit-btn"
                        >Edit
                        </button>
                        <button type="button" class="btn btn-danger waves-effect btn-xs delete-btn"
                                (click)="deleteUser(getId(cell))">Delete
                        </button>

                      </div>

                    } @else {
                      <ng-container
                        *flexRender="cell.column.columnDef.cell; props: cell.getContext(); let cell">
                        {{ cell }}
                      </ng-container>

                    }

                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    `,
    styles: ``
})
export class TanstackTable<T> {
    @Input() table!: Table<T>;
    @Input() className = '';
    @Input() deleteUser?: (id: number) => void;
    @Input() emptyMessage: string | undefined = 'Nothing found.';
    @Input() showHeaders = true;

    get columns() {
        return this.table.getAllColumns();
    }

    getId(cell: Cell<any, unknown>): number {
        return cell.row.original.id;
    }
}
