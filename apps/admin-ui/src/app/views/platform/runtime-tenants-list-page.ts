import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminSandboxAiApiService } from '@/app/core/services/admin-sandbox-ai-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-runtime-tenants-list-page',
  imports: [RouterLink, JsonPipe],
  template: `
    <div class="container-fluid py-4">
      <h1 class="h3 mb-3">Runtime tenants</h1>
      <p class="text-muted small">Requires <code>platform:custom_endpoints:review</code>.</p>
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (loading()) {
        <p>Loading…</p>
      } @else {
        <ul>
          @for (row of items(); track row.id) {
            <li>
              <a [routerLink]="['/platform/runtime-tenants', row.id]"><code>{{ row.id }}</code></a>
              <pre class="small">{{ row | json }}</pre>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class RuntimeTenantsListPage {
  private readonly api = inject(AdminSandboxAiApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<{ id: string }[]>([]);

  constructor() {
    this.api.listRuntimeTenants().subscribe({
      next: (r) => {
        this.items.set(r.items as { id: string }[]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load.');
      },
    });
  }
}
