import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminSandboxAiApiService } from '@/app/core/services/admin-sandbox-ai-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-custom-endpoints-approval-detail-page',
  imports: [JsonPipe],
  template: `
    <div class="container-fluid py-4">
      <h1 class="h3 mb-3">Approval request</h1>
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else {
        <pre class="small">{{ payload() | json }}</pre>
        <div class="mt-3 d-flex gap-2">
          <button type="button" class="btn btn-success btn-sm" (click)="act('approve')">Approve</button>
          <button type="button" class="btn btn-outline-danger btn-sm" (click)="act('reject')">Reject</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="act('needs_information')">
            Needs information
          </button>
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
  readonly payload = signal<unknown>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing id');
      this.loading.set(false);
      return;
    }
    this.api.getProductionRequest(id).subscribe({
      next: (p) => {
        this.payload.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load.');
      },
    });
  }

  act(action: 'approve' | 'reject' | 'needs_information'): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const reason =
      action === 'approve' ? ''
      : window.prompt('Developer-visible reason (required for reject / needs information):') ?? '';
    if (action !== 'approve' && !reason.trim()) {
      this.error.set('Reason required.');
      return;
    }
    this.api
      .patchProductionRequest(id, {
        action,
        ...(action !== 'approve' ? { staffVisibleRejectionReason: reason.trim() } : {}),
      })
      .subscribe({
        next: () => window.location.reload(),
        error: () => this.error.set('Patch failed'),
      });
  }
}
