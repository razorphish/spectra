import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminSandboxAiApiService } from '@/app/core/services/admin-sandbox-ai-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-pricing-profiles-list-page',
  imports: [JsonPipe],
  template: `
    <div class="container-fluid py-4">
      <h1 class="h3 mb-3">Pricing profiles</h1>
      <p class="text-muted small">Requires <code>platform:pricing_profiles:manage</code>.</p>
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else {
        <ul>
          @for (row of items(); track $index) {
            <li><pre class="small mb-0">{{ row | json }}</pre></li>
          }
        </ul>
      }
    </div>
  `,
})
export class PricingProfilesListPage {
  private readonly api = inject(AdminSandboxAiApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<unknown[]>([]);

  constructor() {
    this.api.listPricingProfiles().subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load.');
      },
    });
  }
}
