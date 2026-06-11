import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageBreadcrumb } from '@/app/components/page-breadcrumb';
import {
  AdminProductionAccessApiService,
  type ProductionAccessRequestListItem,
} from '@/app/core/services/admin-production-access-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-production-access-list-page',
  imports: [DatePipe, RouterLink, PageBreadcrumb],
  template: `
    <div class="main-content">
      <div class="container-fluid py-4">
        <app-page-breadcrumb
          title="Production access"
          subTitle1="Platform"
          subText="Review tenant-submitted requests to enable production use for integrations (production access requests). Open a row for full detail. Requires a valid staff Auth0 access token for the admin API; these routes do not enforce an extra Auth0 API permission string (unlike e.g. Integrations). If production_access.staff_console_enabled is false in platform_settings, admin-ui-api returns 404 for this console."
        />
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Integration</th>
                <th>Submitted by</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/platform/production-access', row.id]"><code class="small">{{ row.id }}</code></a>
                  </td>
                  <td>
                    <span [attr.title]="row.statusId">{{ statusDisplay(row) }}</span>
                  </td>
                  <td>{{ integrationDisplay(row) }}</td>
                  <td>
                    <span [attr.title]="row.submittedByUserId">{{ submitterDisplay(row) }}</span>
                  </td>
                  <td>{{ row.createdAt | date: 'medium' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      </div>
    </div>
  `,
})
export class ProductionAccessListPage {
  private readonly api = inject(AdminProductionAccessApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<ProductionAccessRequestListItem[]>([]);

  /** Prefer catalog description; else title-case `name`; else raw id. */
  statusDisplay(row: ProductionAccessRequestListItem): string {
    const d = row.statusDescription?.trim();
    if (d) return d;
    const n = row.statusName?.trim();
    if (n) return n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return row.statusId;
  }

  integrationDisplay(row: ProductionAccessRequestListItem): string {
    return (
      row.integrationName?.trim() ||
      row.applicationName?.trim() ||
      row.integrationId ||
      row.applicationId ||
      '—'
    );
  }

  submitterDisplay(row: ProductionAccessRequestListItem): string {
    return row.submittedByEmail?.trim() || row.submittedByUserId;
  }

  constructor() {
    this.api.list().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.error.set(e instanceof Error ? e.message : 'Request failed');
      },
    });
  }
}
