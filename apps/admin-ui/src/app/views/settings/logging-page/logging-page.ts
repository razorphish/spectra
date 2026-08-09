import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbNavChangeEvent, NgbNavModule, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { PageBreadcrumb } from '@app/components/page-breadcrumb';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import {
  AdminIntegrationsApiService,
  type M2mTokenActivityResponseDto,
} from '@core/services/admin-integrations-api.service';
import {
  AdminLoggingApiService,
  type AdminLogDto,
  type AdminLogsPagination,
} from '@core/services/admin-logging-api.service';

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as const;

/**
 * Admin logging hub — wired to Spectra `admin-ui-api` (Vital Woman Reset–style
 * `LoggingTab` / `logs.router` / `LoggingSettingsTab`).
 */
@Component({
  selector: 'app-logging-page',
  imports: [PageBreadcrumb, FormsModule, NgbNavModule, NgbNavOutlet, DatePipe],
  templateUrl: './logging-page.html',
  styles: `
    .logging-page-nav .sa-icon {
      width: 1.125rem;
      height: 1.125rem;
    }
  `,
})
export class LoggingPage implements OnInit {
  private readonly api = inject(AdminLoggingApiService);
  private readonly integrationsApi = inject(AdminIntegrationsApiService);
  private readonly toastr = inject(ToastrService);

  activeId = 'logs';

  logs = signal<AdminLogDto[]>([]);
  pagination = signal<AdminLogsPagination | null>(null);
  logsError = signal<string | null>(null);
  logsLoading = signal(false);

  searchInput = '';
  moduleInput = '';
  userIdInput = '';
  startDateInput = '';
  endDateInput = '';
  page = 1;
  readonly pageSize = 20;

  loggingLevel = 'INFO';
  loggingOutput: 'both' | 'console' | 'database' = 'both';
  settingsLoading = signal(false);
  settingsError = signal<string | null>(null);

  m2mLoading = signal(false);
  m2mError = signal<string | null>(null);
  m2mActivity = signal<M2mTokenActivityResponseDto | null>(null);
  m2mWindowDays = 7;

  onNavChange(event: NgbNavChangeEvent): void {
    if (event.nextId === 'settings') {
      void this.loadSettings();
    }
    if (event.nextId === 'm2m') {
      void this.loadM2mActivity();
    }
  }

  ngOnInit(): void {
    void this.loadLogs();
  }

  async loadLogs(): Promise<void> {
    this.logsLoading.set(true);
    this.logsError.set(null);
    try {
      const res = await firstValueFrom(
        this.api.listLogs({
          page: this.page,
          pageSize: this.pageSize,
          search: this.searchInput.trim() || undefined,
          module: this.moduleInput.trim() || undefined,
          userId: this.userIdInput.trim() || undefined,
          startDate: this.startDateInput || undefined,
          endDate: this.endDateInput || undefined,
        }),
      );
      if (!res) return;
      this.logs.set(res.logs);
      this.pagination.set(res.pagination);
    } catch (e: unknown) {
      let msg = 'Failed to load logs';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string; error?: string } | null;
        msg = body?.message ?? body?.error ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.logsError.set(msg);
      this.logs.set([]);
      this.pagination.set(null);
    } finally {
      this.logsLoading.set(false);
    }
  }

  applyFilters(): void {
    this.page = 1;
    void this.loadLogs();
  }

  prevPage(): void {
    if (this.page <= 1) return;
    this.page -= 1;
    void this.loadLogs();
  }

  nextPage(): void {
    const p = this.pagination();
    if (!p || this.page >= p.totalPages) return;
    this.page += 1;
    void this.loadLogs();
  }

  async loadSettings(): Promise<void> {
    this.settingsLoading.set(true);
    this.settingsError.set(null);
    try {
      const res = await firstValueFrom(this.api.getLoggingSettings());
      if (!res) return;
      for (const s of res.settings) {
        if (s.key === 'logging_level' && typeof s.value === 'string') {
          this.loggingLevel = s.value;
        }
        if (s.key === 'logging_output' && typeof s.value === 'string') {
          const v = s.value.trim().toLowerCase();
          if (v === 'both' || v === 'console' || v === 'database') {
            this.loggingOutput = v;
          }
        }
      }
    } catch (e: unknown) {
      let msg = 'Failed to load logging settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.settingsError.set(msg);
    } finally {
      this.settingsLoading.set(false);
    }
  }

  async loadM2mActivity(): Promise<void> {
    this.m2mLoading.set(true);
    this.m2mError.set(null);
    try {
      const res = await firstValueFrom(this.integrationsApi.getM2mTokenActivity(this.m2mWindowDays));
      this.m2mActivity.set(res);
    } catch (e: unknown) {
      let msg = 'Failed to load M2M token activity';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.m2mError.set(msg);
      this.m2mActivity.set(null);
      if (e instanceof HttpErrorResponse && e.status === 403) {
        this.toastr.error(
          'Requires Auth0 API permission platform:integrations:read.',
          'M2M activity',
        );
      }
    } finally {
      this.m2mLoading.set(false);
    }
  }

  async saveSettings(): Promise<void> {
    this.settingsLoading.set(true);
    this.settingsError.set(null);
    try {
      await firstValueFrom(this.api.putLoggingSetting('logging_level', this.loggingLevel));
      await firstValueFrom(this.api.putLoggingSetting('logging_output', this.loggingOutput));
      this.toastr.success('Saved', 'Logging settings updated.');
    } catch (e: unknown) {
      let msg = 'Failed to save settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.settingsError.set(msg);
      this.toastr.error('Save failed', msg);
    } finally {
      this.settingsLoading.set(false);
    }
  }

  protected readonly logLevels = LOG_LEVELS;
  protected readonly loggingOutputs = [
    { value: 'both', label: 'Console and database' },
    { value: 'console', label: 'Console only' },
    { value: 'database', label: 'Database only' },
  ] as const;
}
