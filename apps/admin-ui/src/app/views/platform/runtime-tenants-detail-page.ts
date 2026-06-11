import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminSandboxAiApiService } from '@/app/core/services/admin-sandbox-ai-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-runtime-tenants-detail-page',
  imports: [JsonPipe, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <h1 class="h3 mb-3">Runtime tenant</h1>
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else {
        <pre class="small">{{ row() | json }}</pre>
        <div class="mt-3">
          <label class="form-label">External tenant ref (staff rebind)</label>
          <input class="form-control" [(ngModel)]="externalRefDraft" />
          <button type="button" class="btn btn-primary btn-sm mt-2" (click)="save()">Save</button>
        </div>
      }
    </div>
  `,
})
export class RuntimeTenantsDetailPage {
  private readonly api = inject(AdminSandboxAiApiService);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly row = signal<Record<string, unknown> | null>(null);
  externalRefDraft = '';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing id');
      this.loading.set(false);
      return;
    }
    this.api.listRuntimeTenants().subscribe({
      next: (r) => {
        const hit = (r.items as Record<string, unknown>[]).find((x) => x['id'] === id) ?? null;
        this.row.set(hit);
        this.externalRefDraft = (hit?.['externalTenantRef'] as string | undefined) ?? '';
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load.');
      },
    });
  }

  save(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.patchRuntimeTenant(id, { externalTenantRef: this.externalRefDraft || null }).subscribe({
      next: (p) => {
        this.row.set(p as Record<string, unknown>);
      },
      error: () => this.error.set('Save failed'),
    });
  }
}
