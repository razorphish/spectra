import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import {
  AdminSandboxAiApiService,
  AiLlmModel,
  AiLlmModelInput,
} from '@/app/core/services/admin-sandbox-ai-api.service';

/** Stable seed id of the "active" catalog status (spectra.catalog). */
const ACTIVE_STATUS_ID = 'a0000001-0000-4000-8000-000000000002';

/** Parse the max-tokens field into a positive integer, null (blank), or throw. */
function parseMaxTokens(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('Max tokens must be a positive whole number.');
  }
  return n;
}

/** Common providers surfaced as autocomplete hints (free-text still allowed). */
const PROVIDER_HINTS = ['anthropic', 'openai', 'google', 'azure-openai', 'bedrock'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-sandbox-ai-models-list-page',
  imports: [DatePipe, FormsModule, NgbModalModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 class="h3 mb-1">Sandbox AI models</h1>
          <p class="text-muted small mb-0">
            LLM rows used by sandbox custom-endpoint generation. Requires Auth0 permission
            <code>platform:sandbox_ai_models:manage</code>.
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" (click)="openCreate()">
          <i class="bi bi-plus-lg me-1"></i>Create
        </button>
      </div>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      @if (loading()) {
        <p>Loading…</p>
      } @else if (items().length === 0) {
        <p class="text-muted">No AI models yet.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Display name</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Max tokens</th>
                <th>Secret ref</th>
                <th>Status</th>
                <th>Updated</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.id) {
                @if (editingId() === row.id) {
                  <tr>
                    <td>
                      <input class="form-control form-control-sm" [(ngModel)]="editName" [disabled]="saving()" />
                    </td>
                    <td>
                      <input class="form-control form-control-sm" [(ngModel)]="editProvider" [disabled]="saving()" list="providerHints" />
                    </td>
                    <td>
                      <input class="form-control form-control-sm" [(ngModel)]="editModelName" [disabled]="saving()" />
                    </td>
                    <td>
                      <input class="form-control form-control-sm" [(ngModel)]="editMaxTokens" [disabled]="saving()" placeholder="—" />
                    </td>
                    <td>
                      <input class="form-control form-control-sm font-monospace" [(ngModel)]="editSecretRef" [disabled]="saving()" placeholder="env:…" />
                    </td>
                    <td colspan="2">
                      <input class="form-control form-control-sm" [(ngModel)]="editApiBaseUrl" [disabled]="saving()" placeholder="API base URL (optional)" />
                      @if (editError()) {
                        <div class="text-danger small mt-1">{{ editError() }}</div>
                      }
                    </td>
                    <td class="text-end text-nowrap">
                      <button type="button" class="btn btn-primary btn-sm me-1" [disabled]="saving()" (click)="saveEdit()" title="Save" aria-label="Save">
                        @if (saving()) {
                          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        } @else {
                          <i class="bi bi-check-lg"></i>
                        }
                      </button>
                      <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="saving()" (click)="cancelEdit()" title="Cancel" aria-label="Cancel">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </td>
                  </tr>
                } @else {
                  <tr>
                    <td>{{ row.displayName }}</td>
                    <td>{{ row.provider }}</td>
                    <td class="font-monospace small">{{ row.modelName }}</td>
                    <td class="small">{{ row.maxTokens ?? '—' }}</td>
                    <td class="font-monospace small">{{ row.secretRef || '—' }}</td>
                    <td>
                      @if (isActive(row)) {
                        <span class="badge text-bg-success">Active</span>
                      } @else {
                        <span class="badge text-bg-secondary">Inactive</span>
                      }
                    </td>
                    <td class="text-nowrap small text-muted">{{ row.updatedAt | date: 'short' }}</td>
                    <td class="text-end">
                      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="startEdit(row)" title="Edit" aria-label="Edit">
                        <i class="bi bi-pencil"></i>
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <datalist id="providerHints">
      @for (p of providerHints; track p) {
        <option [value]="p"></option>
      }
    </datalist>

    <!-- Create modal -->
    <ng-template #createTpl let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Create AI model</h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        @if (createError()) {
          <div class="alert alert-danger py-2">{{ createError() }}</div>
        }
        <div class="mb-3">
          <label class="form-label">Display name</label>
          <input class="form-control" [(ngModel)]="createName" [disabled]="creating()" placeholder="Claude Opus 4.8" />
        </div>
        <div class="row g-2 mb-3">
          <div class="col">
            <label class="form-label">Provider</label>
            <input class="form-control" [(ngModel)]="createProvider" [disabled]="creating()" list="providerHints" placeholder="anthropic" />
          </div>
          <div class="col">
            <label class="form-label">Model name</label>
            <input class="form-control font-monospace" [(ngModel)]="createModelName" [disabled]="creating()" placeholder="claude-opus-4-8" />
          </div>
        </div>
        <div class="row g-2 mb-3">
          <div class="col">
            <label class="form-label">Max tokens <span class="text-muted small">(optional)</span></label>
            <input class="form-control" [(ngModel)]="createMaxTokens" [disabled]="creating()" placeholder="e.g. 8192" />
          </div>
          <div class="col">
            <label class="form-label">Secret ref <span class="text-muted small">(optional)</span></label>
            <input class="form-control font-monospace" [(ngModel)]="createSecretRef" [disabled]="creating()" placeholder="env:ANTHROPIC_API_KEY" />
          </div>
        </div>
        <div class="mb-2">
          <label class="form-label">API base URL <span class="text-muted small">(optional)</span></label>
          <input class="form-control" [(ngModel)]="createApiBaseUrl" [disabled]="creating()" placeholder="https://api.anthropic.com" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="creating()" (click)="modal.dismiss()">
          Cancel
        </button>
        <button type="button" class="btn btn-primary btn-sm" [disabled]="creating()" (click)="create(modal)">
          {{ creating() ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </ng-template>
  `,
})
export class SandboxAiModelsListPage {
  private readonly api = inject(AdminSandboxAiApiService);
  private readonly modal = inject(NgbModal);

  private readonly createTpl = viewChild<TemplateRef<unknown>>('createTpl');
  readonly providerHints = PROVIDER_HINTS;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<AiLlmModel[]>([]);

  // Create form
  createName = '';
  createProvider = '';
  createModelName = '';
  createMaxTokens = '';
  createSecretRef = '';
  createApiBaseUrl = '';
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  // Inline edit
  readonly editingId = signal<string | null>(null);
  editName = '';
  editProvider = '';
  editModelName = '';
  editMaxTokens = '';
  editSecretRef = '';
  editApiBaseUrl = '';
  readonly saving = signal(false);
  readonly editError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
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

  isActive(row: AiLlmModel): boolean {
    return row.statusId === ACTIVE_STATUS_ID;
  }

  openCreate(): void {
    const tpl = this.createTpl();
    if (!tpl) return;
    this.createName = '';
    this.createProvider = '';
    this.createModelName = '';
    this.createMaxTokens = '';
    this.createSecretRef = '';
    this.createApiBaseUrl = '';
    this.createError.set(null);
    this.modal.open(tpl, { size: 'lg', scrollable: true });
  }

  create(modal: NgbActiveModal): void {
    const body = this.buildInput(
      this.createName,
      this.createProvider,
      this.createModelName,
      this.createMaxTokens,
      this.createSecretRef,
      this.createApiBaseUrl,
      this.createError,
    );
    if (!body) return;
    this.creating.set(true);
    this.api.createModel(body).subscribe({
      next: (row) => {
        this.items.set([row, ...this.items()]);
        this.creating.set(false);
        modal.close();
      },
      error: () => {
        this.creating.set(false);
        this.createError.set('Create failed.');
      },
    });
  }

  startEdit(row: AiLlmModel): void {
    this.editingId.set(row.id);
    this.editName = row.displayName;
    this.editProvider = row.provider;
    this.editModelName = row.modelName;
    this.editMaxTokens = row.maxTokens == null ? '' : String(row.maxTokens);
    this.editSecretRef = row.secretRef ?? '';
    this.editApiBaseUrl = row.apiBaseUrl ?? '';
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set(null);
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id) return;
    const body = this.buildInput(
      this.editName,
      this.editProvider,
      this.editModelName,
      this.editMaxTokens,
      this.editSecretRef,
      this.editApiBaseUrl,
      this.editError,
    );
    if (!body) return;
    this.saving.set(true);
    this.api.patchModel(id, body).subscribe({
      next: (row) => {
        this.items.set(this.items().map((x) => (x.id === row.id ? row : x)));
        this.saving.set(false);
        this.editingId.set(null);
      },
      error: () => {
        this.saving.set(false);
        this.editError.set('Save failed.');
      },
    });
  }

  /** Validate + assemble the create/edit payload; sets `errSig` and returns null on failure. */
  private buildInput(
    name: string,
    provider: string,
    modelName: string,
    maxTokensRaw: string,
    secretRef: string,
    apiBaseUrl: string,
    errSig: { set: (v: string | null) => void },
  ): AiLlmModelInput | null {
    const displayName = name.trim();
    const prov = provider.trim();
    const model = modelName.trim();
    if (!displayName || !prov || !model) {
      errSig.set('Display name, provider, and model name are required.');
      return null;
    }
    let maxTokens: number | null;
    try {
      maxTokens = parseMaxTokens(maxTokensRaw);
    } catch (e) {
      errSig.set(e instanceof Error ? e.message : 'Invalid max tokens.');
      return null;
    }
    errSig.set(null);
    return {
      displayName,
      provider: prov,
      modelName: model,
      apiBaseUrl: apiBaseUrl.trim(),
      maxTokens,
      secretRef: secretRef.trim(),
    };
  }
}
