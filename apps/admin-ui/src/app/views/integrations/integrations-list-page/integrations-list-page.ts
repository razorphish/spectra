import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageBreadcrumb } from '@app/components/page-breadcrumb';
import {
  AdminIntegrationsApiService,
  type IntegrationListItemDto,
} from '@core/services/admin-integrations-api.service';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-integrations-list-page',
  standalone: true,
  imports: [PageBreadcrumb, FormsModule, RouterLink, DatePipe],
  templateUrl: './integrations-list-page.html',
})
export class IntegrationsListPage {
  private readonly api = inject(AdminIntegrationsApiService);
  private readonly toastr = inject(ToastrService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<IntegrationListItemDto[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(50);
  searchDraft = '';
  orgIdDraft = '';

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.api.listIntegrations({
          page: this.page(),
          pageSize: this.pageSize(),
          q: this.searchDraft.trim() || undefined,
          orgId: this.orgIdDraft.trim() || undefined,
        }),
      );
      this.items.set(res.items);
      this.total.set(res.total);
    } catch (e) {
      const msg =
        e instanceof HttpErrorResponse ?
          (typeof e.error?.['message'] === 'string' ? e.error['message'] : e.message)
        : e instanceof Error ? e.message
        : 'Request failed';
      this.error.set(msg);
      if (e instanceof HttpErrorResponse && e.status === 403) {
        this.toastr.error(
          'Your access token needs the Auth0 API permission platform:integrations:read (or dev bypass on admin-ui-api).',
          'Forbidden',
        );
      } else {
        this.toastr.error(msg, 'Integrations');
      }
    } finally {
      this.loading.set(false);
    }
  }

  setPage(n: number): void {
    this.page.set(Math.max(1, n));
    void this.load();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize()));
  }
}
