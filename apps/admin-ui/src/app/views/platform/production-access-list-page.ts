import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild, type TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { PageBreadcrumb } from '@/app/components/page-breadcrumb';
import {
  AdminProductionAccessApiService,
  type ProductionAccessRequestListItem,
} from '@/app/core/services/admin-production-access-api.service';

type PendingAction = { kind: 'approve' | 'revoke'; row: ProductionAccessRequestListItem };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-production-access-list-page',
  imports: [DatePipe, FormsModule, RouterLink, PageBreadcrumb],
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
          <table class="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Integration</th>
                <th>Submitted by</th>
                <th>Created</th>
                <th class="text-end">Actions</th>
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
                  <td class="text-end">
                    <div
                      class="d-flex gap-1 align-items-center justify-content-end flex-nowrap"
                      role="group"
                      [attr.aria-label]="'Actions for request ' + row.id"
                    >
                      <a
                        class="btn btn-primary waves-effect btn-xs d-inline-flex align-items-center justify-content-center"
                        title="Edit request"
                        aria-label="Edit request"
                        [routerLink]="['/platform/production-access', row.id, 'edit']"
                      >
                        <i class="sa sa-pencil" aria-hidden="true"></i>
                      </a>
                      <button
                        type="button"
                        class="btn btn-success waves-effect btn-xs d-inline-flex align-items-center justify-content-center"
                        title="Approve request"
                        aria-label="Approve request"
                        [disabled]="row.statusName === 'approved'"
                        (click)="openConfirm('approve', row)"
                      >
                        <i class="sa sa-check" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-danger waves-effect btn-xs d-inline-flex align-items-center justify-content-center"
                        title="Revoke request"
                        aria-label="Revoke request"
                        [disabled]="row.statusName === 'rejected'"
                        (click)="openConfirm('revoke', row)"
                      >
                        <i class="sa sa-ban" aria-hidden="true"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-muted">No production access requests.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      </div>
    </div>

    <ng-template #confirmModal let-modal>
      @if (pending(); as p) {
        <div class="modal-header border-bottom-0">
          <h5 class="modal-title">
            {{ p.kind === 'approve' ? 'Approve' : 'Revoke' }} production access
          </h5>
          <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
        </div>
        <div class="modal-body">
          <p class="mb-2">
            {{ p.kind === 'approve' ? 'Approve' : 'Revoke' }} the request for
            <strong>{{ integrationDisplay(p.row) }}</strong>
            (submitted by {{ submitterDisplay(p.row) }})?
          </p>
          <label class="form-label small" for="par-note">Note to customer (optional)</label>
          <textarea
            id="par-note"
            class="form-control form-control-sm"
            rows="3"
            [(ngModel)]="noteDraft"
            [placeholder]="
              p.kind === 'approve'
                ? 'e.g. Approved — production credentials issued.'
                : 'e.g. Revoked pending additional security review.'
            "
          ></textarea>
        </div>
        <div class="modal-footer border-top-0">
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="modal.dismiss()">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-success]="p.kind === 'approve'"
            [class.btn-danger]="p.kind === 'revoke'"
            [disabled]="submitting()"
            (click)="confirm()"
          >
            {{ submitting() ? 'Working…' : p.kind === 'approve' ? 'Approve' : 'Revoke' }}
          </button>
        </div>
      }
    </ng-template>
  `,
})
export class ProductionAccessListPage {
  private readonly api = inject(AdminProductionAccessApiService);
  private readonly modalService = inject(NgbModal);
  private readonly toastr = inject(ToastrService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<ProductionAccessRequestListItem[]>([]);
  readonly pending = signal<PendingAction | null>(null);
  readonly submitting = signal(false);
  noteDraft = '';

  private readonly confirmModal = viewChild.required<TemplateRef<unknown>>('confirmModal');

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

  openConfirm(kind: 'approve' | 'revoke', row: ProductionAccessRequestListItem): void {
    this.noteDraft = '';
    this.pending.set({ kind, row });
    this.modalService.open(this.confirmModal(), { backdrop: 'static' });
  }

  confirm(): void {
    const p = this.pending();
    if (!p) return;
    this.submitting.set(true);
    const note = this.noteDraft;
    const req$ =
      p.kind === 'approve' ? this.api.approve(p.row.id, note) : this.api.revoke(p.row.id, note);
    req$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.toastr.success(
          `Request ${p.kind === 'approve' ? 'approved' : 'revoked'}.`,
          'Production access',
        );
        this.modalService.dismissAll();
        this.reload();
      },
      error: (e: unknown) => {
        this.toastr.error(e instanceof Error ? e.message : 'Request failed', 'Production access');
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
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

  constructor() {
    this.reload();
  }
}
