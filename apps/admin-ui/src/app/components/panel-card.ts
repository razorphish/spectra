import {ChangeDetectorRef, Component, inject, Input, TemplateRef} from '@angular/core';
import {NgbCollapseModule, NgbModal, NgbTooltipModule} from '@ng-bootstrap/ng-bootstrap';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-panel-card',
  imports: [NgbCollapseModule, CommonModule, NgbTooltipModule],
  template: `
    @if (isVisible) {
      <div
        class="panel panel-icon"
        [class.panel-fullscreen]="fullShow"
        [class.panel-locked]="panelLocked"
        [class.panel-refreshing]="isRefreshing"
      >
        <div class="panel-hdr">
          <ng-content select="[card-title]"></ng-content>

          @if (isRefreshable) {
            <div class="panel-toolbar">
              <button
                type="button"
                class="btn btn-xs btn-outline-default waves-effect waves-themed"
                (click)="handleRefresh()"
              >
                Refresh
              </button>
            </div>
          }

          @if (toolbox) {
            <div class="panel-toolbar">
              <button
                data-action="panel-collapse"
                ngbTooltip="Toggle"
                type="button"
                class="btn btn-panel"
                (click)="toggleCollapse()"
              >
                <svg class="sa-icon">
                  @if (isCollapsed) {
                    <use class="panel-expand-icon d-block" href="/assets/icons/sprite.svg#plus-circle"></use>
                  } @else {
                    <use class="panel-collapsed-icon" href="/assets/icons/sprite.svg#minus-circle"></use>
                  }
                </svg>
              </button>

              <button
                data-action="panel-fullscreen"
                ngbTooltip="Fullscreen"
                type="button"
                class="btn btn-panel"
                (click)="toggleFullscreen()"
              >
                <svg class="sa-icon">
                  <use href="/assets/icons/sprite.svg#stop-circle"></use>
                </svg>
              </button>

              <button
                data-action="panel-close"
                ngbTooltip="Close"
                type="button"
                class="btn btn-panel"
                (click)="openDeleteModal(deleteModal)"
              >
                <svg class="sa-icon">
                  <use href="/assets/icons/sprite.svg#x-circle"></use>
                </svg>
              </button>
            </div>
          }

          <ng-content select="[card-toolbar]"></ng-content>
        </div>

        <div [ngbCollapse]="isCollapsed" class="panel-container" [ngClass]="containerClass">
          <ng-content select="[card-content]"></ng-content>
        </div>

        <ng-template #deleteModal let-modal>
          <div class="modal-header border-bottom-0">
            <h4 class="modal-title text-white">Delete Panel?</h4>
            <button type="button" class="btn btn-system btn-system-light ms-auto" (click)="modal.dismiss()">
              <svg class="sa-icon sa-icon-2x">
                <use href="/assets/icons/sprite.svg#x"></use>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="alert alert-danger bg-danger border-danger text-white border-opacity-50 bg-opacity-10 mb-0">
              Are you sure you want to delete this panel?
            </div>
          </div>
          <div class="modal-footer border-top-0">
            <button type="button" class="btn btn-light" (click)="modal.dismiss()">No, cancel</button>
            <button type="button" class="btn btn-danger" (click)="handleClose()">Yes, delete</button>
          </div>
        </ng-template>
      </div>
    }
  `,
  styles: ``
})
export class PanelCard {
  @Input() panelLocked = false;
  @Input() toolbox = false;
  @Input() isRefreshable = false;
  @Input() containerClass?: string;

  private changeDetection = inject(ChangeDetectorRef);

  isCollapsed = false;
  isVisible = true;
  fullShow = false;
  isRefreshing = false;

  constructor(private modalService: NgbModal) {
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleFullscreen() {
    this.fullShow = !this.fullShow;
  }

  handleRefresh() {
    this.isRefreshing = true;
    setTimeout(() => {
      this.isRefreshing = false;
      this.changeDetection.markForCheck();
    }, 2000);
  }

  handleClose() {
    this.isVisible = false;
    this.modalService.dismissAll();
  }

  openDeleteModal(content: TemplateRef<any>) {
    this.modalService.open(content, {centered: true, modalDialogClass: 'bg-glass-dark'});
  }
}
