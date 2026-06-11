import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminSandboxAiApiService } from '@/app/core/services/admin-sandbox-ai-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-sandbox-ai-models-list-page',
  imports: [JsonPipe],
  template: `
    <div class="container-fluid py-4">
      <h1 class="h3 mb-3">Sandbox AI models</h1>
      <p class="text-muted small">Requires Auth0 permission <code>platform:sandbox_ai_models:manage</code>.</p>
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
export class SandboxAiModelsListPage {
  private readonly api = inject(AdminSandboxAiApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<unknown[]>([]);

  constructor() {
    this.api.listModels().subscribe({
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
}
