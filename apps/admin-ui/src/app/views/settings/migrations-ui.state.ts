import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AdminMigrationsApiService, type MigrationsInventoryDto } from '@core/services/admin-migrations-api.service';

export type MigrationRowStatus = 'applied' | 'pending';

export interface MigrationRow {
  idx: number;
  tag: string;
  hash?: string;
  status: MigrationRowStatus;
  when: Date | null;
}

/**
 * Settings → Migrations — backed by admin-ui-api + `spectra.__drizzle_migrations`
 * and `packages/database/drizzle/meta/_journal.json`.
 */
@Injectable()
export class MigrationsUiState {
  private readonly toastr = inject(ToastrService);
  private readonly api = inject(AdminMigrationsApiService);

  searchQuery = signal('');

  status = signal({
    totalApplied: 0,
    totalAvailable: 0,
    pending: 0,
    lastMigrationAt: null as Date | null,
    paths: {
      migrationsFolder: 'packages/database/drizzle',
      journalPath: 'packages/database/drizzle/meta/_journal.json',
      snapshotFolder: 'packages/database/drizzle/meta',
    },
  });

  checkStatus = signal<{
    isValid: boolean;
    method: string;
    hasGaps: boolean;
    pendingCount: number;
    message: string | null;
    orphanDbHashes: string[];
  } | null>(null);

  allMigrations = signal<MigrationRow[]>([]);

  filteredMigrations = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = this.allMigrations();
    if (!q) return rows;
    return rows.filter(
      (r) => r.tag.toLowerCase().includes(q) || String(r.idx).includes(q),
    );
  });

  runPendingBusy = signal(false);
  runAllBusy = signal(false);
  refreshing = signal(false);
  loadError = signal<string | null>(null);

  viewSqlTag = signal<string | null>(null);
  migrationSqlPath = signal('');
  migrationSqlBody = signal('');
  sqlModalLoading = signal(false);

  rollbackTarget = signal<MigrationRow | null>(null);
  rollbackBullets = signal<string[]>([]);
  rollbackSqlPreview = signal<string | null>(null);
  rollbackLoading = signal(false);

  deleteTarget = signal<MigrationRow | null>(null);
  runConfirmTarget = signal<MigrationRow | null>(null);

  runSingleTag = signal<string | null>(null);
  deleteRecordBusy = signal(false);

  async loadInitial(): Promise<void> {
    await this.refresh(false);
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  private applyInventory(inv: MigrationsInventoryDto): void {
    this.loadError.set(null);
    this.status.set({
      totalApplied: inv.status.totalApplied,
      totalAvailable: inv.status.totalAvailable,
      pending: inv.status.pending,
      lastMigrationAt: inv.status.lastMigrationAt ? new Date(inv.status.lastMigrationAt) : null,
      paths: inv.paths,
    });
    this.checkStatus.set({
      isValid: inv.check.isValid,
      method: inv.check.method,
      hasGaps: inv.check.hasGaps,
      pendingCount: inv.check.pendingCount,
      message: inv.check.message,
      orphanDbHashes: inv.check.orphanDbHashes,
    });
    this.allMigrations.set(
      [...inv.rows]
        .sort((a, b) => b.idx - a.idx)
        .map((r) => ({
        idx: r.idx,
        tag: r.tag,
        hash: r.hash,
        status: r.status,
        when: r.when ? new Date(r.when) : null,
      })),
    );
  }

  private errMessage(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error;
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
        return (body as { message: string }).message;
      }
      return e.message || `HTTP ${e.status}`;
    }
    if (e && typeof e === 'object' && 'error' in e) {
      const err = (e as { error?: { message?: string } }).error;
      if (err?.message) return err.message;
    }
    return e instanceof Error ? e.message : 'Request failed';
  }

  async refresh(showSuccessToast = true): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    this.loadError.set(null);
    try {
      const inv = await firstValueFrom(this.api.getInventory());
      this.applyInventory(inv);
      if (showSuccessToast) {
        this.toastr.success('Journal and database state are up to date.', 'Migrations');
      }
    } catch (e) {
      const msg = this.errMessage(e);
      this.loadError.set(msg);
      this.toastr.error(msg, 'Migrations');
    } finally {
      this.refreshing.set(false);
    }
  }

  async fetchSqlForTag(tag: string): Promise<void> {
    this.sqlModalLoading.set(true);
    this.migrationSqlPath.set('');
    this.migrationSqlBody.set('');
    try {
      const res = await firstValueFrom(this.api.getSql(tag));
      this.migrationSqlPath.set(res.path);
      this.migrationSqlBody.set(res.sql);
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Migration SQL');
    } finally {
      this.sqlModalLoading.set(false);
    }
  }

  async fetchRollbackGuide(tag: string): Promise<void> {
    this.rollbackLoading.set(true);
    this.rollbackBullets.set([]);
    this.rollbackSqlPreview.set(null);
    try {
      const res = await firstValueFrom(this.api.getRollbackGuide(tag));
      this.rollbackBullets.set(res.bullets);
      this.rollbackSqlPreview.set(res.sqlPreview);
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Rollback guide');
    } finally {
      this.rollbackLoading.set(false);
    }
  }

  async runPending(): Promise<void> {
    if (this.runPendingBusy()) return;
    this.runPendingBusy.set(true);
    try {
      const { inventory } = await firstValueFrom(this.api.runMigrations('pending'));
      this.applyInventory(inventory);
      this.toastr.success('Migrations applied (pending batch).', 'Run Pending');
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Run Pending');
    } finally {
      this.runPendingBusy.set(false);
    }
  }

  async runAll(): Promise<void> {
    if (this.runAllBusy()) return;
    this.runAllBusy.set(true);
    try {
      const { inventory } = await firstValueFrom(this.api.runMigrations('all'));
      this.applyInventory(inventory);
      this.toastr.success('Drizzle migrate completed for pending files.', 'Run All');
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Run All');
    } finally {
      this.runAllBusy.set(false);
    }
  }

  check(): void {
    const chk = this.checkStatus();
    if (!chk) {
      void this.refresh(false);
      return;
    }
    if (chk.isValid) {
      this.toastr.success(chk.message ?? chk.method, 'Migration status: valid');
    } else {
      this.toastr.warning(
        chk.message ?? `Issues: gaps=${chk.hasGaps}, pending=${chk.pendingCount}`,
        'Migration check',
      );
    }
  }

  async runSingleMigration(row: MigrationRow): Promise<void> {
    if (row.status !== 'pending' || this.runSingleTag() !== null) return;
    this.runSingleTag.set(row.tag);
    try {
      const { inventory } = await firstValueFrom(this.api.runMigrations('single', row.tag));
      this.applyInventory(inventory);
      this.toastr.success(`Ran migration batch including "${row.tag}".`, 'Run migration');
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Run migration');
    } finally {
      this.runSingleTag.set(null);
    }
  }

  async copyMigrationTag(tag: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(tag);
      this.toastr.success(tag, 'Copied');
    } catch {
      this.toastr.error('Could not copy migration tag.', 'Clipboard unavailable');
    }
  }

  async confirmDeleteMigrationRecord(onDone: () => void): Promise<void> {
    const row = this.deleteTarget();
    if (!row || this.deleteRecordBusy()) return;
    this.deleteRecordBusy.set(true);
    const tag = row.tag;
    try {
      const { inventory } = await firstValueFrom(this.api.deleteMigrationRecord(tag));
      this.applyInventory(inventory);
      this.toastr.success(
        `Removed migration record for "${tag}". You can re-apply that file after fixing the database.`,
        'Migration record deleted',
      );
      onDone();
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Delete migration record');
    } finally {
      this.deleteRecordBusy.set(false);
    }
  }
}
