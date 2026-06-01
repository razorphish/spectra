import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageBreadcrumb } from '@app/components/page-breadcrumb';
import {
  AdminIntegrationsApiService,
  type IntegrationDetailResponseDto,
  type TokenIssuanceItemDto,
} from '@core/services/admin-integrations-api.service';
import { NgbNavModule, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-integration-detail-page',
  standalone: true,
  imports: [PageBreadcrumb, RouterLink, DatePipe, JsonPipe, FormsModule, NgbNavModule, NgbNavOutlet],
  templateUrl: './integration-detail-page.html',
  styles: `
    .tiny-pre {
      font-size: 0.75rem;
      max-width: 14rem;
      max-height: 4rem;
      overflow: auto;
      margin: 0;
      white-space: pre-wrap;
    }
  `,
})
export class IntegrationDetailPage {
  private readonly api = inject(AdminIntegrationsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);

  readonly integrationId = signal('');
  readonly loading = signal(false);
  readonly detail = signal<IntegrationDetailResponseDto | null>(null);
  readonly issuanceLoading = signal(false);
  readonly issuanceItems = signal<TokenIssuanceItemDto[]>([]);
  readonly issuanceTotal = signal(0);
  readonly issuancePage = signal(1);
  readonly issuancePageSize = signal(50);
  fromDraft = '';
  toDraft = '';
  activeId = 'overview';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.integrationId.set(id);
    void this.loadDetail();
  }

  async loadDetail(): Promise<void> {
    const id = this.integrationId();
    if (!id) return;
    this.loading.set(true);
    try {
      const d = await firstValueFrom(this.api.getIntegration(id));
      this.detail.set(d);
      await this.loadIssuance();
    } catch (e) {
      this.toastError(e, 'Integration');
    } finally {
      this.loading.set(false);
    }
  }

  async loadIssuance(): Promise<void> {
    const id = this.integrationId();
    if (!id) return;
    this.issuanceLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.listTokenIssuance(id, {
          page: this.issuancePage(),
          pageSize: this.issuancePageSize(),
          from: this.fromDraft.trim() || undefined,
          to: this.toDraft.trim() || undefined,
        }),
      );
      this.issuanceItems.set(res.items);
      this.issuanceTotal.set(res.total);
    } catch (e) {
      this.toastError(e, 'Token issuance');
    } finally {
      this.issuanceLoading.set(false);
    }
  }

  issuanceTotalPages(): number {
    return Math.max(1, Math.ceil(this.issuanceTotal() / this.issuancePageSize()));
  }

  setIssuancePage(n: number): void {
    this.issuancePage.set(Math.max(1, n));
    void this.loadIssuance();
  }

  applyIssuanceFilters(): void {
    this.issuancePage.set(1);
    void this.loadIssuance();
  }

  async export(format: 'json' | 'csv'): Promise<void> {
    const id = this.integrationId();
    try {
      const blob = await firstValueFrom(this.api.downloadExport(id, format));
      const ext = format === 'json' ? 'json' : 'csv';
      const filename = `integration-${id}-audit.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      this.toastr.success('Download started', 'Export');
    } catch (e) {
      this.toastError(e, 'Export');
    }
  }

  private toastError(e: unknown, title: string): void {
    const msg =
      e instanceof HttpErrorResponse ?
        (typeof e.error?.['message'] === 'string' ? e.error['message'] : e.message)
      : e instanceof Error ? e.message
      : 'Request failed';
    if (e instanceof HttpErrorResponse && e.status === 403) {
      this.toastr.error(
        'Requires platform:integrations:read (list/detail) or platform:integrations:export (export).',
        'Forbidden',
      );
    } else {
      this.toastr.error(msg, title);
    }
  }
}
