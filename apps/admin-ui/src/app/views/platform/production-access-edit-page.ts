import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgbNavModule, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { PageBreadcrumb } from '@/app/components/page-breadcrumb';
import {
  AdminProductionAccessApiService,
  type ProductionAccessCustomApi,
  type ProductionAccessRequestDetail,
} from '@/app/core/services/admin-production-access-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-production-access-edit-page',
  imports: [DatePipe, FormsModule, RouterLink, PageBreadcrumb, NgbNavModule, NgbNavOutlet],
  template: `
    <div class="main-content">
      <div class="container-fluid py-4">
        <app-page-breadcrumb
          title="Edit production access"
          subTitle1="Platform"
          subText="Update staff notes and the customer-visible status message for a production access request, and review the requesting org's custom APIs."
        />

        <p class="mt-2">
          <a routerLink="/platform/production-access" class="text-decoration-none">← Back to list</a>
        </p>

        @if (error()) {
          <div class="alert alert-danger">{{ error() }}</div>
        } @else if (loading()) {
          <p>Loading…</p>
        } @else if (detail(); as d) {
          <h5 class="mt-3 mb-0">{{ integrationDisplay(d) }}</h5>
          <p class="text-muted small mb-3">
            <code>{{ d.id }}</code>
            <span class="badge bg-secondary ms-2">{{ statusDisplay(d) }}</span>
          </p>

          <ul [(activeId)]="activeId" ngbNav #nav="ngbNav" class="nav nav-tabs-clean mt-2">
            <li ngbNavItem="info">
              <a ngbNavLink>Info</a>
              <ng-template ngbNavContent>
                <div class="pt-3 row g-3">
                  <div class="col-md-6">
                    <div class="card border shadow-sm">
                      <div class="card-header fw-semibold">Request</div>
                      <div class="card-body small">
                        <p><strong>Status:</strong> {{ statusDisplay(d) }}</p>
                        <p><strong>Integration / application:</strong> {{ integrationDisplay(d) }}</p>
                        <p><strong>Org:</strong> {{ d.orgName ?? d.orgId ?? '—' }}</p>
                        <p><strong>Submitted by:</strong> {{ submitterDisplay(d) }}</p>
                        <p><strong>Created:</strong> {{ d.createdAt | date: 'medium' }}</p>
                        <p class="mb-0"><strong>Updated:</strong> {{ d.updatedAt | date: 'medium' }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="card border shadow-sm">
                      <div class="card-header fw-semibold">Staff edits</div>
                      <div class="card-body">
                        <div class="mb-3">
                          <label class="form-label small" for="customer-msg">
                            Customer status message (customer-visible)
                          </label>
                          <textarea
                            id="customer-msg"
                            class="form-control form-control-sm"
                            rows="3"
                            [(ngModel)]="customerStatusMessage"
                          ></textarea>
                        </div>
                        <div class="mb-3">
                          <label class="form-label small" for="staff-notes">
                            Internal staff notes (not customer-visible)
                          </label>
                          <textarea
                            id="staff-notes"
                            class="form-control form-control-sm"
                            rows="4"
                            [(ngModel)]="staffInternalNotes"
                          ></textarea>
                        </div>
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          [disabled]="saving()"
                          (click)="save()"
                        >
                          {{ saving() ? 'Saving…' : 'Save changes' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ng-template>
            </li>

            <li ngbNavItem="custom-apis">
              <a ngbNavLink>Custom APIs</a>
              <ng-template ngbNavContent>
                <div class="pt-3">
                  <p class="text-muted small">
                    Custom API endpoints (<code>developer_ai_endpoints</code>) owned by this request's org.
                  </p>
                  @if (customApisLoading()) {
                    <p>Loading…</p>
                  } @else {
                    <div class="table-responsive">
                      <table class="table table-sm table-hover">
                        <thead>
                          <tr>
                            <th>Slug</th>
                            <th>Status</th>
                            <th>Approved version</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (api of customApis(); track api.id) {
                            <tr>
                              <td><code class="small">{{ api.slug }}</code></td>
                              <td>{{ api.statusName ?? api.statusId }}</td>
                              <td>
                                @if (api.approvedProductionVersionId) {
                                  <code class="small">{{ api.approvedProductionVersionId }}</code>
                                } @else {
                                  <span class="text-muted">—</span>
                                }
                              </td>
                              <td class="text-nowrap small">{{ api.createdAt | date: 'medium' }}</td>
                            </tr>
                          } @empty {
                            <tr>
                              <td colspan="4" class="text-muted">No custom APIs for this org.</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              </ng-template>
            </li>
          </ul>
          <div class="tab-content pt-2" [ngbNavOutlet]="nav"></div>
        }
      </div>
    </div>
  `,
})
export class ProductionAccessEditPage {
  private readonly api = inject(AdminProductionAccessApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<ProductionAccessRequestDetail | null>(null);
  readonly saving = signal(false);
  readonly customApis = signal<ProductionAccessCustomApi[]>([]);
  readonly customApisLoading = signal(true);

  customerStatusMessage = '';
  staffInternalNotes = '';
  activeId = 'info';

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  statusDisplay(d: ProductionAccessRequestDetail): string {
    const desc = d.statusDescription?.trim();
    if (desc) return desc;
    const n = d.statusName?.trim();
    if (n) return n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return d.statusId;
  }

  integrationDisplay(d: ProductionAccessRequestDetail): string {
    return (
      d.integrationName?.trim() ||
      d.applicationName?.trim() ||
      d.integrationId ||
      d.applicationId ||
      '—'
    );
  }

  submitterDisplay(d: ProductionAccessRequestDetail): string {
    return d.submittedByEmail?.trim() || d.submittedByUserId;
  }

  save(): void {
    this.saving.set(true);
    this.api
      .update(this.id, {
        customerStatusMessage: this.customerStatusMessage.trim() || null,
        staffInternalNotes: this.staffInternalNotes.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (row) => {
          this.detail.set(row);
          this.toastr.success('Changes saved.', 'Production access');
        },
        error: (e: unknown) => {
          this.toastr.error(e instanceof Error ? e.message : 'Save failed', 'Production access');
        },
      });
  }

  constructor() {
    if (!this.id) {
      this.loading.set(false);
      this.error.set('Missing id');
      return;
    }
    this.api.get(this.id).subscribe({
      next: (row) => {
        this.detail.set(row);
        this.customerStatusMessage = row.customerStatusMessage ?? '';
        this.staffInternalNotes = row.staffInternalNotes ?? '';
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.error.set(e instanceof Error ? e.message : 'Request failed');
      },
    });
    this.api.listCustomApis(this.id).subscribe({
      next: (res) => {
        this.customApis.set(res.items);
        this.customApisLoading.set(false);
      },
      error: () => {
        this.customApisLoading.set(false);
      },
    });
  }
}
