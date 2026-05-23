import { DatePipe } from '@angular/common';
import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { NgbActiveModal, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import type { MigrationRow } from '../migrations-ui.state';
import { MigrationsUiState } from '../migrations-ui.state';

@Component({
  selector: 'app-migrations-list-panel',
  templateUrl: './migrations-list-panel.html',
  imports: [DatePipe, NgbModalModule],
  styles: `
    .migrations-panel i.sa {
      font-size: 1rem;
      line-height: 1;
    }
    .migrations-panel .btn-sm i.sa {
      font-size: 0.95rem;
    }
    /* Tanstack delete-buttons row: btn-xs + waves-effect; icon-only hit target */
    .migrations-panel .migration-tn-actions .btn-xs {
      min-width: 1.85rem;
      padding-left: 0.35rem;
      padding-right: 0.35rem;
    }
    .migrations-panel .migration-tn-actions .btn-xs i.sa {
      font-size: 0.75rem;
      line-height: 1;
    }
    .migration-actions-col {
      min-width: 10.5rem;
    }
  `,
})
export class MigrationsListPanel {
  readonly state = inject(MigrationsUiState);
  private readonly modal = inject(NgbModal);

  private readonly viewSqlTpl = viewChild<TemplateRef<unknown>>('viewSqlTpl');
  private readonly rollbackTpl = viewChild<TemplateRef<unknown>>('rollbackTpl');
  private readonly deleteTpl = viewChild<TemplateRef<unknown>>('deleteTpl');
  private readonly runConfirmTpl = viewChild<TemplateRef<unknown>>('runConfirmTpl');

  async openViewSql(tag: string): Promise<void> {
    this.state.viewSqlTag.set(tag);
    await this.state.fetchSqlForTag(tag);
    const tpl = this.viewSqlTpl();
    if (!tpl) return;
    this.modal.open(tpl, { scrollable: true, size: 'lg' }).result.finally(() => {
      this.state.viewSqlTag.set(null);
      this.state.migrationSqlBody.set('');
      this.state.migrationSqlPath.set('');
    });
  }

  async openRollback(row: MigrationRow): Promise<void> {
    this.state.rollbackTarget.set(row);
    await this.state.fetchRollbackGuide(row.tag);
    const tpl = this.rollbackTpl();
    if (!tpl) return;
    this.modal.open(tpl, { scrollable: true, size: 'lg' }).result.finally(() => {
      this.state.rollbackTarget.set(null);
      this.state.rollbackBullets.set([]);
      this.state.rollbackSqlPreview.set(null);
    });
  }

  openDelete(row: MigrationRow): void {
    this.state.deleteTarget.set(row);
    const tpl = this.deleteTpl();
    if (!tpl) return;
    this.modal.open(tpl, { backdrop: 'static' }).result.finally(() => {
      this.state.deleteTarget.set(null);
    });
  }

  openRunConfirm(row: MigrationRow): void {
    this.state.runConfirmTarget.set(row);
    const tpl = this.runConfirmTpl();
    if (!tpl) return;
    this.modal.open(tpl, { backdrop: 'static' }).result.finally(() => {
      this.state.runConfirmTarget.set(null);
    });
  }

  confirmRunMigration(modal: NgbActiveModal): void {
    const row = this.state.runConfirmTarget();
    if (!row || row.status !== 'pending') {
      modal.dismiss();
      return;
    }
    void this.state.runSingleMigration(row);
    modal.close();
  }

  confirmDeleteRecord(modal: NgbActiveModal): void {
    void this.state.confirmDeleteMigrationRecord(() => modal.close());
  }
}
