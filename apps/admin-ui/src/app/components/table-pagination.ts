import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [CommonModule,NgbDropdownModule],
  template: `
    <div
      class="row align-items-center text-center text-sm-start"
      [ngClass]="showInfo ? 'justify-content-between' : 'justify-content-end'"
    >
      @if (showInfo || showPageLimit) {
        <div
          class="col-sm-6 d-flex align-items-center justify-content-sm-start justify-content-center gap-2 order-1 order-sm-0">

          @if (showPageLimit) {
            <div ngbDropdown>
              <a class="btn btn-sm btn-outline-secondary pe-2 ps-2 py-1 no-arrow"
                 ngbDropdownToggle>
                {{ pageSize }} <i class="sa sa-chevron-down"></i>
              </a>
              <ul ngbDropdownMenu>
                @for (size of [10, 15, 25, 50, 100]; track size) {
                  <li (click)="onPageSizeChange.emit(size)">
                    <a class="dropdown-item cursor-pointer" [class.active]="size === pageSize">{{ size }}</a>
                  </li>
                }
              </ul>
            </div>
          }

          <div class="text-muted small">
            Showing {{ start }} to {{ end }} of {{ totalItems }} {{ itemsName }}
          </div>
        </div>
      }

      <div
        class="col-xs-12 col-sm-6 d-flex align-items-center justify-content-sm-end justify-content-center mb-4 mb-sm-0">
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item">
              <button class="page-link" (click)="setPageIndex.emit(0)" [disabled]="pageIndex === 0">
                «
              </button>
            </li>
            <li class="page-item st-prev-page">
              <button
                class="page-link btn btn-sm"
                (click)="previousPage.emit()"
                [disabled]="!canPreviousPage"
                aria-label="Previous page"
                type="button"
              >
                <span class="d-none d-sm-none d-md-inline-block">Prev</span> <span
                class="d-inline-block d-sm-inline-block d-md-none">‹</span>
              </button>
            </li>

            @for (p of pages; track $index) {
              @if (p === 'ellipsis') {
                <li class="page-item disabled">
                  <span class="page-link">...</span>
                </li>
              } @else {
                <li class="page-item" [class.active]="pageIndex === p">
                  <button class="page-link" (click)="setPageIndex.emit(p)">
                    {{ p + 1 }}
                  </button>
                </li>
              }
            }

            <li class="page-item st-next-page">
              <button
                class="page-link btn btn-sm"
                (click)="nextPage.emit()"
                [disabled]="!canNextPage"
                aria-label="Next page"
                type="button"
              >
                <span class="d-none d-sm-none d-md-inline-block">Next</span> <span
                class="d-inline-block d-sm-inline-block d-md-none">›</span>
              </button>
            </li>

            <li class="page-item">
              <button class="page-link" (click)="setPageIndex.emit(pageCount - 1)" [disabled]="pageIndex === pageCount - 1">
                »
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  `,
})
export class TablePagination {
  @Input() totalItems!: number;
  @Input() start!: number;
  @Input() end!: number;
  @Input() itemsName: string = 'items';
  @Input() showInfo: boolean = false;
  @Input() pageSize: number = 10;
  @Input() canPreviousPage: boolean = false;
  @Input() pageCount!: number;
  @Input() pageIndex!: number;
  @Input() canNextPage: boolean = false;
  @Input() showPageLimit: boolean = true;
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() setPageIndex = new EventEmitter<number>();
  @Output() onPageSizeChange = new EventEmitter<number>();


  get pages(): (number | 'ellipsis')[] {
    return this.getPageNumbers(this.pageCount, this.pageIndex);
  }

  private getPageNumbers(pageCount: number, pageIndex: number): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = [];
    if (pageCount <= 4) {
      for (let i = 0; i < pageCount; i++) pages.push(i);
    } else {
      pages.push(0);

      if (pageIndex > 3) {
        pages.push('ellipsis');
      }

      for (let i = Math.max(1, pageIndex - 1); i <= Math.min(pageCount - 2, pageIndex + 1); i++) {
        pages.push(i);
      }

      if (pageIndex < pageCount - 4) {
        pages.push('ellipsis');
      }

      pages.push(pageCount - 1);
    }
    return pages;
  }
}
