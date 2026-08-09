import { DatePipe, JsonPipe, LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AdminSandboxAiApiService,
  ProductionRequestDetail,
} from '@/app/core/services/admin-sandbox-ai-api.service';

const STATUS: Record<string, { label: string; cls: string }> = {
  'a0000080-0000-4000-8000-000000000001': { label: 'Pending review', cls: 'text-bg-warning' },
  'a0000080-0000-4000-8000-000000000002': { label: 'Needs info', cls: 'text-bg-info' },
  'a0000080-0000-4000-8000-000000000003': { label: 'Awaiting user', cls: 'text-bg-secondary' },
  'a0000080-0000-4000-8000-000000000004': { label: 'Approved', cls: 'text-bg-success' },
  'a0000080-0000-4000-8000-000000000005': { label: 'Rejected', cls: 'text-bg-danger' },
};

const TERMINAL = new Set([
  'a0000080-0000-4000-8000-000000000004', // approved
  'a0000080-0000-4000-8000-000000000005', // rejected
]);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-custom-endpoints-approval-detail-page',
  imports: [RouterLink, DatePipe, JsonPipe, LowerCasePipe, FormsModule],
  template: `
    <div class="container-fluid py-4" style="max-width: 900px">
      <a routerLink="/platform/custom-endpoints" class="text-muted small d-inline-block mb-3">
        ← Custom endpoint approvals
      </a>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else {
        @let d = detail()!;

        <!-- Header -->
        <div class="d-flex align-items-center gap-2 mb-4">
          <h1 class="h3 mb-0">{{ d.endpoint?.slug ?? d.request.endpointId }}</h1>
          @if (d.version) {
            <span class="text-muted small">rev&nbsp;{{ d.version.revision }}</span>
          }
          <span class="badge {{ statusCls(d.request.statusId) }}">{{ statusLabel(d.request.statusId) }}</span>
        </div>

        <!-- Request metadata -->
        <div class="card mb-3">
          <div class="card-body p-3">
            <h6 class="card-title text-muted mb-3">Request details</h6>
            <dl class="row small mb-0">
              <dt class="col-sm-3">Request ID</dt>
              <dd class="col-sm-9 font-monospace">{{ d.request.id }}</dd>
              <dt class="col-sm-3">Endpoint ID</dt>
              <dd class="col-sm-9 font-monospace">{{ d.request.endpointId }}</dd>
              <dt class="col-sm-3">Version ID</dt>
              <dd class="col-sm-9 font-monospace">{{ d.request.endpointVersionId }}</dd>
              <dt class="col-sm-3">Submitted</dt>
              <dd class="col-sm-9">{{ d.request.createdAt | date: 'medium' }}</dd>
              <dt class="col-sm-3">Updated</dt>
              <dd class="col-sm-9">{{ d.request.updatedAt | date: 'medium' }}</dd>
              @if (d.request.staffVisibleRejectionReason) {
                <dt class="col-sm-3">Staff reason</dt>
                <dd class="col-sm-9">{{ d.request.staffVisibleRejectionReason }}</dd>
              }
              @if (d.request.internalStaffNotes) {
                <dt class="col-sm-3">Internal notes</dt>
                <dd class="col-sm-9">{{ d.request.internalStaffNotes }}</dd>
              }
            </dl>
          </div>
        </div>

        <!-- Spec -->
        @if (d.version) {
          <details class="mb-3">
            <summary class="fw-semibold small py-2 cursor-pointer">Endpoint spec (rev {{ d.version.revision }})</summary>
            <div class="mt-2">
              @if (d.version.userPrompt) {
                <div class="mb-2">
                  <div class="text-muted small mb-1">User prompt</div>
                  <pre class="small bg-light border rounded p-2 mb-0">{{ d.version.userPrompt }}</pre>
                </div>
              }
              <div class="text-muted small mb-1">Spec JSON</div>
              <pre class="small bg-light border rounded p-2 mb-0">{{ d.version.spec | json }}</pre>
            </div>
          </details>
        }

        <!-- Precheck summary -->
        @if (d.request.precheckSummary) {
          <details class="mb-3">
            <summary class="fw-semibold small py-2 cursor-pointer">Precheck summary</summary>
            <pre class="small bg-light border rounded p-2 mt-2 mb-0">{{ d.request.precheckSummary | json }}</pre>
          </details>
        }

        <!-- Effective pricing -->
        <div class="card mb-4">
          <div class="card-body p-3">
            <h6 class="card-title text-muted mb-3">Effective pricing</h6>
            @if (d.effectivePricing.profileId) {
              <p class="small mb-1 text-muted">Profile ID: <code>{{ d.effectivePricing.profileId }}</code></p>
            } @else {
              <p class="small mb-1 text-muted">No profile assigned (platform default applies).</p>
            }
            <pre class="small bg-light border rounded p-2 mb-0">{{ d.effectivePricing.policy | json }}</pre>
          </div>
        </div>

        <!-- Actions -->
        <div class="card">
          <div class="card-body p-3">
            <h6 class="card-title text-muted mb-3">Actions</h6>

            @if (isTerminal(d.request.statusId)) {
              <p class="text-muted small mb-0">
                This request is already <strong>{{ statusLabel(d.request.statusId) | lowercase }}</strong>. No further action available.
              </p>
            } @else if (actionForm()) {
              <!-- Inline action form -->
              <div class="mb-3">
                <label class="form-label small">
                  {{ actionForm() === 'reject' ? 'Rejection reason' : 'Information needed' }}
                  <span class="text-danger">*</span>
                </label>
                <textarea
                  class="form-control form-control-sm"
                  rows="3"
                  [(ngModel)]="reasonText"
                  [disabled]="submitting()"
                  placeholder="Developer-visible explanation…"
                ></textarea>
              </div>
              @if (actionForm() === 'reject') {
                <div class="mb-3">
                  <label class="form-label small">Reason code (optional)</label>
                  <input
                    class="form-control form-control-sm"
                    [(ngModel)]="reasonCode"
                    [disabled]="submitting()"
                    placeholder="e.g. policy_violation"
                  />
                </div>
              }
              <div class="mb-3">
                <label class="form-label small">Internal staff notes (optional)</label>
                <textarea
                  class="form-control form-control-sm"
                  rows="2"
                  [(ngModel)]="staffNotes"
                  [disabled]="submitting()"
                  placeholder="Not shown to developer…"
                ></textarea>
              </div>
              @if (actionError()) {
                <div class="alert alert-danger py-2 small">{{ actionError() }}</div>
              }
              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-sm {{ actionForm() === 'reject' ? 'btn-danger' : 'btn-warning' }}"
                  [disabled]="submitting()"
                  (click)="submitForm()"
                >
                  {{ submitting() ? 'Submitting…' : (actionForm() === 'reject' ? 'Reject' : 'Request information') }}
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  [disabled]="submitting()"
                  (click)="cancelForm()"
                >Cancel</button>
              </div>
            } @else {
              <div class="d-flex gap-2 flex-wrap">
                <button type="button" class="btn btn-success btn-sm" (click)="approve()">Approve</button>
                <button type="button" class="btn btn-outline-danger btn-sm" (click)="openForm('reject')">Reject…</button>
                <button type="button" class="btn btn-outline-warning btn-sm" (click)="openForm('needs_information')">
                  Needs information…
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CustomEndpointsApprovalDetailPage {
  private readonly api = inject(AdminSandboxAiApiService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<ProductionRequestDetail | null>(null);

  readonly actionForm = signal<'reject' | 'needs_information' | null>(null);
  readonly submitting = signal(false);
  readonly actionError = signal<string | null>(null);

  reasonText = '';
  reasonCode = '';
  staffNotes = '';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing id');
      this.loading.set(false);
      return;
    }
    this.api.getProductionRequest(id).subscribe({
      next: (d) => {
        this.detail.set(d);
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

  isTerminal(id: string): boolean {
    return TERMINAL.has(id);
  }

  openForm(action: 'reject' | 'needs_information'): void {
    this.reasonText = '';
    this.reasonCode = '';
    this.staffNotes = '';
    this.actionError.set(null);
    this.actionForm.set(action);
  }

  cancelForm(): void {
    this.actionForm.set(null);
    this.actionError.set(null);
  }

  approve(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.submitting.set(true);
    this.actionError.set(null);
    this.api
      .patchProductionRequest(id, {
        action: 'approve',
        ...(this.staffNotes.trim() ? { internalStaffNotes: this.staffNotes.trim() } : {}),
      })
      .subscribe({
        next: () => window.location.reload(),
        error: () => {
          this.submitting.set(false);
          this.actionError.set('Approve failed.');
        },
      });
  }

  submitForm(): void {
    const action = this.actionForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (!action || !id) return;
    const reason = this.reasonText.trim();
    if (!reason) {
      this.actionError.set('Reason is required.');
      return;
    }
    this.submitting.set(true);
    this.actionError.set(null);
    this.api
      .patchProductionRequest(id, {
        action,
        staffVisibleRejectionReason: reason,
        ...(action === 'reject' && this.reasonCode.trim() ? { staffReasonCode: this.reasonCode.trim() } : {}),
        ...(this.staffNotes.trim() ? { internalStaffNotes: this.staffNotes.trim() } : {}),
      })
      .subscribe({
        next: () => window.location.reload(),
        error: () => {
          this.submitting.set(false);
          this.actionError.set('Submit failed.');
        },
      });
  }
}
