import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminProductionAccessApiService } from '@/app/core/services/admin-production-access-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-production-access-detail-page',
  imports: [RouterLink, JsonPipe],
  template: `
    <div class="container-fluid py-4">
      <p class="mb-2">
        <a routerLink="/platform/production-access">← Back to list</a>
      </p>
      <h1 class="h3 mb-3">Production access request</h1>
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else {
        <pre class="bg-light p-3 rounded small overflow-auto">{{ row() | json }}</pre>
      }
    </div>
  `,
})
export class ProductionAccessDetailPage {
  private readonly api = inject(AdminProductionAccessApiService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly row = signal<Record<string, unknown> | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('Missing id');
      return;
    }
    this.api.get(id).subscribe({
      next: (r) => {
        this.row.set(r);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.error.set(e instanceof Error ? e.message : 'Request failed');
      },
    });
  }
}
