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
  PricingProfile,
} from '@/app/core/services/admin-sandbox-ai-api.service';

/** Parse the policy textarea into a JSON object, or throw a friendly error. */
function parsePolicy(raw: string): Record<string, unknown> {
  const text = raw.trim();
  if (!text) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Policy must be valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Policy must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

/** Illustrative policy shape shown in the create modal. */
const POLICY_EXAMPLE = `{
  "currency": "USD",
  "models": {
    "claude-opus-4-8": { "inputPer1k": 0.015, "outputPer1k": 0.075 },
    "claude-sonnet-4-6": { "inputPer1k": 0.003, "outputPer1k": 0.015 }
  },
  "minimumCharge": 0,
  "markupPct": 20
}`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'app-pricing-profiles-list-page',
  imports: [DatePipe, FormsModule, NgbModalModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 class="h3 mb-1">Pricing profiles</h1>
          <p class="text-muted small mb-0">
            Requires Auth0 permission <code>platform:pricing_profiles:manage</code>.
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" (click)="openCreate()">Create</button>
      </div>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      <!-- List -->
      @if (loading()) {
        <p>Loading…</p>
      } @else if (items().length === 0) {
        <p class="text-muted">No pricing profiles yet.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Display name</th>
                <th>Policy</th>
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
                    <td colspan="2">
                      <textarea
                        class="form-control form-control-sm font-monospace"
                        rows="4"
                        [(ngModel)]="editPolicy"
                        [disabled]="saving()"
                      ></textarea>
                      @if (editError()) {
                        <div class="text-danger small mt-1">{{ editError() }}</div>
                      }
                    </td>
                    <td class="text-end text-nowrap">
                      <button type="button" class="btn btn-primary btn-sm me-1" [disabled]="saving()" (click)="saveEdit()">
                        {{ saving() ? 'Saving…' : 'Save' }}
                      </button>
                      <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="saving()" (click)="cancelEdit()">
                        Cancel
                      </button>
                    </td>
                  </tr>
                } @else {
                  <tr>
                    <td>{{ row.displayName }}</td>
                    <td><pre class="small mb-0">{{ formatPolicy(row.policy) }}</pre></td>
                    <td class="text-nowrap small text-muted">{{ row.updatedAt | date: 'short' }}</td>
                    <td class="text-end">
                      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="startEdit(row)">Edit</button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Create modal -->
    <ng-template #createTpl let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Create pricing profile</h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        @if (createError()) {
          <div class="alert alert-danger py-2">{{ createError() }}</div>
        }
        <div class="mb-3">
          <label class="form-label">Display name</label>
          <input class="form-control" [(ngModel)]="createName" [disabled]="creating()" />
        </div>
        <div class="mb-2">
          <label class="form-label d-flex justify-content-between align-items-center">
            <span>Policy (JSON)</span>
            <button type="button" class="btn btn-link btn-sm p-0" [disabled]="creating()" (click)="useExample()">
              Use example
            </button>
          </label>
          <textarea
            class="form-control font-monospace small"
            rows="6"
            [(ngModel)]="createPolicy"
            [disabled]="creating()"
          ></textarea>
        </div>
        <details class="small">
          <summary class="text-muted">Example policy</summary>
          <pre class="small bg-light border rounded p-2 mt-2 mb-0">{{ policyExample }}</pre>
        </details>
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
export class PricingProfilesListPage {
  private readonly api = inject(AdminSandboxAiApiService);
  private readonly modal = inject(NgbModal);

  private readonly createTpl = viewChild<TemplateRef<unknown>>('createTpl');
  readonly policyExample = POLICY_EXAMPLE;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<PricingProfile[]>([]);

  // Create form
  createName = '';
  createPolicy = '{}';
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  // Inline edit
  readonly editingId = signal<string | null>(null);
  editName = '';
  editPolicy = '{}';
  readonly saving = signal(false);
  readonly editError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listPricingProfiles().subscribe({
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

  formatPolicy(policy: Record<string, unknown>): string {
    return JSON.stringify(policy ?? {}, null, 2);
  }

  openCreate(): void {
    const tpl = this.createTpl();
    if (!tpl) return;
    this.createName = '';
    this.createPolicy = '{}';
    this.createError.set(null);
    this.modal.open(tpl, { size: 'lg', scrollable: true });
  }

  useExample(): void {
    this.createPolicy = this.policyExample;
  }

  create(modal: NgbActiveModal): void {
    const displayName = this.createName.trim();
    if (!displayName) {
      this.createError.set('Display name is required.');
      return;
    }
    let policy: Record<string, unknown>;
    try {
      policy = parsePolicy(this.createPolicy);
    } catch (e) {
      this.createError.set(e instanceof Error ? e.message : 'Invalid policy.');
      return;
    }
    this.createError.set(null);
    this.creating.set(true);
    this.api.createPricingProfile({ displayName, policy }).subscribe({
      next: (row) => {
        this.items.set([row, ...this.items()]);
        this.createName = '';
        this.createPolicy = '{}';
        this.creating.set(false);
        modal.close();
      },
      error: () => {
        this.creating.set(false);
        this.createError.set('Create failed.');
      },
    });
  }

  startEdit(row: PricingProfile): void {
    this.editingId.set(row.id);
    this.editName = row.displayName;
    this.editPolicy = this.formatPolicy(row.policy);
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set(null);
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id) return;
    const displayName = this.editName.trim();
    if (!displayName) {
      this.editError.set('Display name is required.');
      return;
    }
    let policy: Record<string, unknown>;
    try {
      policy = parsePolicy(this.editPolicy);
    } catch (e) {
      this.editError.set(e instanceof Error ? e.message : 'Invalid policy.');
      return;
    }
    this.editError.set(null);
    this.saving.set(true);
    this.api.patchPricingProfile(id, { displayName, policy }).subscribe({
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
}
