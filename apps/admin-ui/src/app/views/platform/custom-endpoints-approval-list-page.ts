import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AdminSandboxAiApiService,
  ProductionRequest,
} from '@/app/core/services/admin-sandbox-ai-api.service';

const STATUS: Record<string, { label: string; cls: string }> = {
  'a0000080-0000-4000-8000-000000000001': { label: 'Pending review', cls: 'text-bg-warning' },
  'a0000080-0000-4000-8000-000000000002': { label: 'Needs info', cls: 'text-bg-info' },
  'a0000080-0000-4000-8000-000000000003': { label: 'Awaiting user', cls: 'text-bg-secondary' },
  'a0000080-0000-4000-8000-000000000004': { label: 'Approved', cls: 'text-bg-success' },
  'a0000080-0000-4000-8000-000000000005': { label: 'Rejected', cls: 'text-bg-danger' },
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-custom-endpoints-approval-list-page',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="container-fluid py-4">
      <div class="mb-3">
        <h1 class="h3 mb-1">Custom endpoint approvals</h1>
        <p class="text-muted small mb-0">Requires <code>platform:custom_endpoints:review</code>.</p>
      </div>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else if (items().length === 0) {
        <p class="text-muted">No approval requests.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Status</th>
                <th>Endpoint</th>
                <th>Request ID</th>
                <th>Submitted</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.id) {
                <tr>
                  <td>
                    <span class="badge {{ statusCls(row.statusId) }}">{{ statusLabel(row.statusId) }}</span>
                  </td>
                  <td class="font-monospace small">{{ row.endpointSlug ?? '—' }}</td>
                  <td class="font-monospace small text-muted">{{ row.id.slice(0, 8) }}…</td>
                  <td class="small text-nowrap text-muted">{{ row.createdAt | date: 'short' }}</td>
                  <td class="small text-nowrap text-muted">{{ row.updatedAt | date: 'short' }}</td>
                  <td class="text-end">
                    <a
                      [routerLink]="['/platform/custom-endpoints', row.id]"
                      class="btn btn-outline-secondary btn-sm"
                    >View</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class CustomEndpointsApprovalListPage {
  private readonly api = inject(AdminSandboxAiApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<ProductionRequest[]>([]);

  constructor() {
    this.api.listProductionRequests().subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load (check permissions and admin-ui-api).');
      },
    });
  }

  statusLabel(id: string): string {
    return STATUS[id]?.label ?? id.slice(0, 8);
  }

  statusCls(id: string): string {
    return STATUS[id]?.cls ?? 'text-bg-secondary';
  }
}
