import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbNavModule, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { PageBreadcrumb } from '@/app/components/page-breadcrumb';
import {
  AdminProductionAccessApiService,
  type EndpointApprovalItem,
  type ProductionAccessCustomApi,
  type ProductionAccessRequestDetail,
} from '@/app/core/services/admin-production-access-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-production-access-edit-page',
  imports: [DatePipe, JsonPipe, FormsModule, RouterLink, PageBreadcrumb, NgbNavModule, NgbNavOutlet, NgbModalModule],
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

            <li ngbNavItem="endpoint-approvals">
              <a ngbNavLink>Endpoint approvals</a>
              <ng-template ngbNavContent>
                <div class="pt-3">
                  <p class="text-muted small">
                    AI endpoint production approval requests for this org's custom endpoints.
                  </p>
                  @if (endpointApprovalsLoading()) {
                    <p>Loading…</p>
                  } @else {
                    <div class="table-responsive">
                      <table class="table table-sm table-hover">
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
                          @for (row of endpointApprovals(); track row.id) {
                            <tr>
                              <td>
                                <span class="badge {{ approvalStatusCls(row.statusId) }}">{{ approvalStatusLabel(row.statusId) }}</span>
                              </td>
                              <td class="font-monospace small">{{ row.endpointSlug ?? '—' }}</td>
                              <td class="font-monospace small text-muted">{{ row.id.slice(0, 8) }}…</td>
                              <td class="small text-nowrap text-muted">{{ row.createdAt | date: 'short' }}</td>
                              <td class="small text-nowrap text-muted">{{ row.updatedAt | date: 'short' }}</td>
                              <td class="text-end">
                                <a
                                  [routerLink]="['/platform/custom-endpoints', row.id]"
                                  class="btn btn-outline-secondary waves-effect btn-xs d-inline-flex align-items-center justify-content-center"
                                  title="Review"
                                  aria-label="Review"
                                >
                                  <i class="sa sa-pencil" aria-hidden="true"></i>
                                </a>
                              </td>
                            </tr>
                          } @empty {
                            <tr>
                              <td colspan="6" class="text-muted">No endpoint approval requests for this org.</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
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
                            <th class="text-end">Actions</th>
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
                              <td class="text-end">
                                <div class="d-flex gap-1 align-items-center justify-content-end flex-nowrap" role="group" [attr.aria-label]="'Actions for ' + api.slug">
                                  <button
                                    type="button"
                                    class="btn btn-secondary waves-effect btn-xs d-inline-flex align-items-center justify-content-center"
                                    title="View spec"
                                    aria-label="View spec"
                                    [disabled]="!api.spec"
                                    (click)="openSpecModal(api)"
                                  >
                                    <i class="sa sa-doc" aria-hidden="true"></i>
                                  </button>
                                  <button
                                    type="button"
                                    class="btn btn-warning waves-effect btn-xs d-inline-flex align-items-center justify-content-center"
                                    title="Test call"
                                    aria-label="Test call"
                                    [disabled]="!api.approvedProductionVersionId"
                                    (click)="openInvokeModal(api)"
                                  >
                                    <i class="sa sa-control-play" aria-hidden="true"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          } @empty {
                            <tr>
                              <td colspan="5" class="text-muted">No custom APIs for this org.</td>
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

    <!-- Spec viewer modal -->
    <ng-template #specTpl let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Spec — <code>{{ specApi()?.slug }}</code></h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <pre class="small bg-light p-3 rounded" style="max-height:60vh;overflow:auto">{{ specApi()?.spec | json }}</pre>
      </div>
    </ng-template>

    <!-- Test invoke modal -->
    <ng-template #invokeTpl let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Test call — <code>{{ invokeApi()?.slug }}</code></h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <label class="form-label small">Request body (JSON)</label>
        <textarea class="form-control form-control-sm font-monospace" rows="5" [(ngModel)]="invokeBody" [disabled]="invoking()"></textarea>
        @if (invokeError()) {
          <div class="alert alert-danger py-2 mt-2 small">{{ invokeError() }}</div>
        }
        @if (invokeResult() !== null) {
          <label class="form-label small mt-3">Response</label>
          <pre class="small bg-light p-3 rounded" style="max-height:40vh;overflow:auto">{{ invokeResult() | json }}</pre>
        }
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary btn-sm" (click)="modal.dismiss()">Close</button>
        <button type="button" class="btn btn-warning btn-sm" [disabled]="invoking()" (click)="runInvoke()">
          {{ invoking() ? 'Running…' : 'Run' }}
        </button>
      </div>
    </ng-template>
  `,
})
export class ProductionAccessEditPage {
  private readonly api = inject(AdminProductionAccessApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);
  private readonly modal = inject(NgbModal);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<ProductionAccessRequestDetail | null>(null);
  readonly saving = signal(false);
  readonly customApis = signal<ProductionAccessCustomApi[]>([]);
  readonly customApisLoading = signal(true);
  readonly endpointApprovals = signal<EndpointApprovalItem[]>([]);
  readonly endpointApprovalsLoading = signal(true);

  customerStatusMessage = '';
  staffInternalNotes = '';
  activeId = 'info';

  // Spec viewer
  readonly specApi = signal<ProductionAccessCustomApi | null>(null);

  // Invoke
  readonly invokeApi = signal<ProductionAccessCustomApi | null>(null);
  readonly invoking = signal(false);
  readonly invokeError = signal<string | null>(null);
  readonly invokeResult = signal<unknown>(null);
  invokeBody = '{}';

  private readonly specTpl = viewChild<TemplateRef<unknown>>('specTpl');
  private readonly invokeTpl = viewChild<TemplateRef<unknown>>('invokeTpl');

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

  openSpecModal(api: ProductionAccessCustomApi): void {
    const tpl = this.specTpl();
    if (!tpl) return;
    this.specApi.set(api);
    this.modal.open(tpl, { size: 'lg', scrollable: true });
  }

  openInvokeModal(api: ProductionAccessCustomApi): void {
    const tpl = this.invokeTpl();
    if (!tpl) return;
    this.invokeApi.set(api);
    this.invokeBody = '{}';
    this.invokeError.set(null);
    this.invokeResult.set(null);
    this.modal.open(tpl, { size: 'lg', scrollable: true });
  }

  runInvoke(): void {
    const api = this.invokeApi();
    if (!api) return;
    let body: unknown;
    try {
      body = JSON.parse(this.invokeBody || '{}');
    } catch {
      this.invokeError.set('Invalid JSON in request body.');
      return;
    }
    this.invoking.set(true);
    this.invokeError.set(null);
    this.invokeResult.set(null);
    this.api.invokeCustomApi(this.id, api.id, body).subscribe({
      next: (result) => {
        this.invokeResult.set(result);
        this.invoking.set(false);
      },
      error: (e: unknown) => {
        this.invoking.set(false);
        this.invokeError.set(e instanceof Error ? e.message : 'Invoke failed.');
      },
    });
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
    this.api.listEndpointApprovals(this.id).subscribe({
      next: (res) => {
        this.endpointApprovals.set(res.items);
        this.endpointApprovalsLoading.set(false);
      },
      error: () => {
        this.endpointApprovalsLoading.set(false);
      },
    });
  }

  private static readonly APPROVAL_STATUS: Record<string, { label: string; cls: string }> = {
    'a0000080-0000-4000-8000-000000000001': { label: 'Pending review', cls: 'text-bg-warning' },
    'a0000080-0000-4000-8000-000000000002': { label: 'Needs info', cls: 'text-bg-info' },
    'a0000080-0000-4000-8000-000000000003': { label: 'Awaiting user', cls: 'text-bg-secondary' },
    'a0000080-0000-4000-8000-000000000004': { label: 'Approved', cls: 'text-bg-success' },
    'a0000080-0000-4000-8000-000000000005': { label: 'Rejected', cls: 'text-bg-danger' },
  };

  approvalStatusLabel(id: string): string {
    return ProductionAccessEditPage.APPROVAL_STATUS[id]?.label ?? id.slice(0, 8);
  }

  approvalStatusCls(id: string): string {
    return ProductionAccessEditPage.APPROVAL_STATUS[id]?.cls ?? 'text-bg-secondary';
  }
}
