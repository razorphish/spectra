import { DatePipe } from '@angular/common';
import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { NgbActiveModal, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { MigrationsUiState } from '../migrations-ui.state';

@Component({
  selector: 'app-migrations-info-panel',
  templateUrl: './migrations-info-panel.html',
  imports: [DatePipe, NgbModalModule],
  styles: `
    .migrations-panel .sa-icon {
      width: 1.125rem;
      height: 1.125rem;
    }
    .letter-spacing-1 {
      letter-spacing: 0.05em;
    }
  `,
})
export class MigrationsInfoPanel {
  readonly state = inject(MigrationsUiState);
  private readonly modal = inject(NgbModal);

  private readonly reconcileTpl = viewChild<TemplateRef<unknown>>('reconcileTpl');

  openReconcileConfirm(): void {
    const tpl = this.reconcileTpl();
    if (!tpl) return;
    this.modal.open(tpl, { backdrop: 'static', size: 'lg' });
  }

  confirmReconcile(modal: NgbActiveModal): void {
    void this.state.reconcile(() => modal.close());
  }
}
