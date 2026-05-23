import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AdminMigrationsApiService } from '@core/services/admin-migrations-api.service';

@Component({
  selector: 'app-migrations-runner-settings-panel',
  templateUrl: './migrations-runner-settings-panel.html',
  styles: `
    .runner-panel .form-check-input {
      width: 2.75rem;
      height: 1.35rem;
    }
    .letter-spacing-1 {
      letter-spacing: 0.05em;
    }
  `,
})
export class MigrationsRunnerSettingsPanel {
  private readonly api = inject(AdminMigrationsApiService);
  private readonly toastr = inject(ToastrService);

  loading = signal(true);
  saving = signal(false);
  resetting = signal(false);

  /** Draft value for the toggle (use shared HTTP / legacy runner). */
  draftShared = signal(false);
  /** Last saved effective value from API. */
  effectiveShared = signal(false);
  fromDatabase = signal(false);
  environmentDefault = signal(false);

  readonly dirty = computed(() => this.draftShared() !== this.effectiveShared());

  constructor() {
    afterNextRender(() => {
      void this.load();
    });
  }

  private errMessage(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error;
      if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
      ) {
        return (body as { message: string }).message;
      }
      return e.message || `HTTP ${e.status}`;
    }
    return e instanceof Error ? e.message : 'Request failed';
  }

  setDraftShared(checked: boolean): void {
    this.draftShared.set(checked);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const cfg = await firstValueFrom(this.api.getRunnerConfig());
      this.effectiveShared.set(cfg.useSharedHttpClient);
      this.draftShared.set(cfg.useSharedHttpClient);
      this.fromDatabase.set(cfg.fromDatabase);
      this.environmentDefault.set(cfg.environmentDefault);
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Migration runner');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.saving() || !this.dirty()) return;
    this.saving.set(true);
    try {
      const cfg = await firstValueFrom(this.api.putRunnerConfig(this.draftShared()));
      this.effectiveShared.set(cfg.useSharedHttpClient);
      this.draftShared.set(cfg.useSharedHttpClient);
      this.fromDatabase.set(cfg.fromDatabase);
      this.environmentDefault.set(cfg.environmentDefault);
      this.toastr.success('Runner mode saved to platform settings.', 'Migration runner');
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Migration runner');
    } finally {
      this.saving.set(false);
    }
  }

  async useEnvironmentDefault(): Promise<void> {
    if (this.resetting()) return;
    if (!this.fromDatabase() && !this.dirty()) {
      return;
    }
    this.resetting.set(true);
    try {
      const cfg = await firstValueFrom(this.api.deleteRunnerConfig());
      this.effectiveShared.set(cfg.useSharedHttpClient);
      this.draftShared.set(cfg.useSharedHttpClient);
      this.fromDatabase.set(cfg.fromDatabase);
      this.environmentDefault.set(cfg.environmentDefault);
      this.toastr.success('Cleared override; using NODE_ENV default again.', 'Migration runner');
    } catch (e) {
      this.toastr.error(this.errMessage(e), 'Migration runner');
    } finally {
      this.resetting.set(false);
    }
  }

  discardDraft(): void {
    this.draftShared.set(this.effectiveShared());
  }
}
