import { firstValueFrom } from 'rxjs';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  SandboxApplicationCreateBody,
  SandboxPortalService,
} from '../services/sandbox-portal.service';
import { environment } from '../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-application-form',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="spectra-page form-page">
      <h1>{{ editId() ? 'Edit application' : 'Add an application' }}</h1>
      <p class="lede">
        Redirect URIs must start with <code>http://</code> or <code>https://</code> and contain no
        fragments (<code>#</code>) or query strings (<code>?</code>).
      </p>

      @if (error()) {
        <p class="spectra-auth-error">{{ error() }}</p>
      }

      <label class="field">
        <span>Application name</span>
        <input type="text" name="appName" [(ngModel)]="name" required />
      </label>

      <label class="field">
        <span>Callback URLs / redirect URIs</span>
        <textarea
          rows="2"
          name="redirectDraft"
          [(ngModel)]="redirectDraft"
          (keydown)="onRedirectKeydown($event)"
          placeholder="Type a URL and press Space or Enter to add"
        ></textarea>
        <div class="chips">
          @for (c of redirectChips(); track c) {
            <span class="chip">
              {{ c }}
              <button type="button" class="chip-x" (click)="removeChip(c)" aria-label="Remove">×</button>
            </span>
          }
        </div>
      </label>

      <button type="button" class="toggle-opt" (click)="optionalOpen.update((v) => !v)">
        {{ optionalOpen() ? 'Hide' : 'Show' }} optional app information
      </button>

      @if (optionalOpen()) {
        <section class="optional-block">
          <label class="field">
            <span>Logo (image)</span>
            <input type="file" accept="image/*" (change)="onLogo($event)" />
            @if (logoUploadId()) {
              <p class="hint">Uploaded logo id: {{ logoUploadId() }}</p>
            }
          </label>
          <label class="field">
            <span>Application description</span>
            <textarea rows="3" name="desc" [(ngModel)]="description"></textarea>
          </label>
          <h3>Organization and policy info</h3>
          <label class="field">
            <span>Organization / company website URL</span>
            <input type="url" name="cw" [(ngModel)]="companyWebsiteUrl" />
          </label>
          <label class="field">
            <span>Privacy policy URL or URI</span>
            <input type="url" name="pp" [(ngModel)]="privacyPolicyUrl" />
          </label>
          <label class="field">
            <span>Terms of service URL or URI</span>
            <input type="url" name="tos" [(ngModel)]="applicationTosUrl" />
          </label>
          <label class="field">
            <span>Customer support email</span>
            <input type="email" name="se" [(ngModel)]="supportEmail" />
          </label>
          <label class="field">
            <span>Customer support phone number</span>
            <input type="tel" name="sp" [(ngModel)]="supportPhone" />
          </label>
          <label class="field">
            <span>App development contacts</span>
            <textarea rows="2" name="dc" [(ngModel)]="developmentContacts"></textarea>
            <span class="field-hint">
              This is typically an email address, or multiple email addresses separated by commas.
            </span>
          </label>
        </section>
      }

      <label class="inline">
        <input type="checkbox" name="tosAccept" [(ngModel)]="acceptTos" />
        <span>
          Yes, I have read and agree to the
          <a [href]="termsUrl" target="_blank" rel="noopener noreferrer">API Terms of Service</a>.
        </span>
      </label>

      <div class="actions">
        <button type="button" class="btn-primary" [disabled]="saving()" (click)="save()">
          {{ editId() ? 'Save changes' : 'Save application' }}
        </button>
        <a routerLink="/dashboard">Cancel</a>
      </div>
    </main>
  `,
  styles: [
    `
      .form-page {
        max-width: 40rem;
        padding-top: 1rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-top: 1rem;
      }
      .field span:first-child {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .field-hint {
        font-size: 0.85rem;
        color: var(--spectra-color-muted);
      }
      input[type='text'],
      input[type='url'],
      input[type='email'],
      input[type='tel'],
      textarea {
        font: inherit;
        padding: 0.45rem 0.55rem;
        border-radius: var(--spectra-radius-sm);
        border: 1px solid var(--spectra-color-border);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.35rem;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: var(--spectra-color-surface);
        border: 1px solid var(--spectra-color-border);
        border-radius: 999px;
        padding: 0.15rem 0.45rem;
        font-size: 0.85rem;
      }
      .chip-x {
        border: none;
        background: none;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
      }
      .toggle-opt {
        margin-top: 1rem;
        background: none;
        border: none;
        color: var(--spectra-color-link);
        cursor: pointer;
        text-decoration: underline;
        font: inherit;
        padding: 0;
      }
      .optional-block {
        margin-top: 0.75rem;
        padding: 1rem;
        border: 1px solid var(--spectra-color-border);
        border-radius: var(--spectra-radius-md);
        background: var(--spectra-color-card);
      }
      .inline {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        margin-top: 1.25rem;
      }
      .actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .btn-primary {
        padding: 0.55rem 1.15rem;
        border-radius: var(--spectra-radius-sm);
        background: var(--spectra-color-accent);
        color: #fff;
        border: none;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ApplicationFormPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly editId = signal<string | null>(null);
  protected readonly orgId = signal<string | null>(null);
  protected readonly redirectChips = signal<string[]>([]);
  protected readonly optionalOpen = signal(false);
  protected readonly logoUploadId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  name = '';
  redirectDraft = '';
  description = '';
  companyWebsiteUrl = '';
  privacyPolicyUrl = '';
  applicationTosUrl = '';
  supportEmail = '';
  supportPhone = '';
  developmentContacts = '';
  acceptTos = false;

  protected readonly termsUrl = `${environment.spectraMarketingUrl?.replace(/\/$/, '') || ''}/terms`;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.editId.set(id);
    this.api.session().subscribe({
      next: (s) => this.orgId.set(s.orgId),
      error: () => this.error.set('Could not load session'),
    });
    if (id) {
      this.api.getApplication(id).subscribe({
        next: (a) => {
          this.name = a.name;
          this.redirectChips.set([...a.redirectUris]);
          this.description = a.description ?? '';
          this.companyWebsiteUrl = a.companyWebsiteUrl ?? '';
          this.privacyPolicyUrl = a.privacyPolicyUrl ?? '';
          this.applicationTosUrl = a.applicationTosUrl ?? '';
          this.supportEmail = a.supportEmail ?? '';
          this.supportPhone = a.supportPhone ?? '';
          this.developmentContacts = a.developmentContacts ?? '';
          this.logoUploadId.set(a.logoUploadId);
          this.acceptTos = Boolean(a.spectraTosAcceptedAt);
        },
        error: () => this.error.set('Could not load application'),
      });
    }
  }

  protected onRedirectKeydown(ev: KeyboardEvent): void {
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    ev.preventDefault();
    const piece = this.redirectDraft.trim();
    if (!piece) return;
    const err = this.validateUri(piece);
    if (err) {
      this.error.set(err);
      return;
    }
    this.error.set(null);
    this.redirectChips.update((list) => (list.includes(piece) ? list : [...list, piece]));
    this.redirectDraft = '';
  }

  protected removeChip(c: string): void {
    this.redirectChips.update((list) => list.filter((x) => x !== c));
  }

  private validateUri(u: string): string | null {
    if (!/^https?:\/\//i.test(u)) return 'Each redirect URI must start with http:// or https://.';
    if (u.includes('#')) return 'Redirect URIs must not contain #.';
    if (u.includes('?')) return 'Redirect URIs must not contain ?.';
    try {
      // eslint-disable-next-line no-new
      new URL(u);
    } catch {
      return 'Invalid URL.';
    }
    return null;
  }

  protected async onLogo(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const oid = this.orgId();
    if (!file || !oid) return;
    this.error.set(null);
    try {
      const init = await firstValueFrom(
        this.api.initUpload({
          orgId: oid,
          bytesExpected: file.size,
          contentType: file.type || 'application/octet-stream',
          filename: file.name,
        }),
      );
      const put = await fetch(init.presignedPutUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Length': String(file.size),
        },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      this.logoUploadId.set(init.uploadId);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Logo upload failed');
    }
  }

  protected save(): void {
    this.error.set(null);
    const chips = this.redirectChips();
    if (!this.name.trim()) {
      this.error.set('Application name is required.');
      return;
    }
    if (chips.length === 0) {
      this.error.set('Add at least one redirect URI.');
      return;
    }
    if (!this.editId() && !this.acceptTos) {
      this.error.set('You must accept the API Terms of Service.');
      return;
    }
    const body: SandboxApplicationCreateBody = {
      name: this.name.trim(),
      redirectUris: chips,
      acceptSpectraTos: this.editId() ? true : this.acceptTos,
      description: this.description || undefined,
      companyWebsiteUrl: this.companyWebsiteUrl || undefined,
      privacyPolicyUrl: this.privacyPolicyUrl || undefined,
      applicationTosUrl: this.applicationTosUrl || undefined,
      supportEmail: this.supportEmail || undefined,
      supportPhone: this.supportPhone || undefined,
      developmentContacts: this.developmentContacts || undefined,
      logoUploadId: this.logoUploadId() ?? undefined,
    };
    this.saving.set(true);
    const id = this.editId();
    if (id) {
      this.api.updateApplication(id, body).subscribe({
        next: () => {
          this.saving.set(false);
          void this.router.navigate(['/applications', id]);
        },
        error: (e) => {
          this.saving.set(false);
          this.setHttpError(e);
        },
      });
    } else {
      this.api.createApplication(body).subscribe({
        next: (r) => {
          this.saving.set(false);
          try {
            sessionStorage.setItem(`spectra_sandbox_client_secret:${r.id}`, r.clientSecret);
          } catch {
            /* ignore */
          }
          void this.router.navigate(['/applications', r.id]);
        },
        error: (e) => {
          this.saving.set(false);
          this.setHttpError(e);
        },
      });
    }
  }

  private setHttpError(e: unknown): void {
    const err = e as { error?: { message?: string } };
    this.error.set(err?.error?.message ?? 'Request failed');
  }
}
