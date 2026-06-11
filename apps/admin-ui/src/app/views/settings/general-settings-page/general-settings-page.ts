import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbNavModule, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { PageBreadcrumb } from '@app/components/page-breadcrumb';
import { AdminAuthPlatformApiService } from '@core/services/admin-auth-platform-api.service';
import { AdminNavVisibilityApiService } from '@core/services/admin-nav-visibility-api.service';
import { AdminPlatformUiApiService } from '@core/services/admin-platform-ui-api.service';
import { SidebarNavVisibilityService } from '@core/services/sidebar-nav-visibility.service';
import {
  TEMPLATE_NAV_MENU_KEYS,
  TEMPLATE_NAV_MENU_LABELS,
  defaultHiddenTemplateNavKeys,
  type TemplateNavMenuKey,
} from '@core/template-nav-menu';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-general-settings-page',
  imports: [PageBreadcrumb, FormsModule, NgbNavModule, NgbNavOutlet],
  templateUrl: './general-settings-page.html',
  styles: `
    .general-settings-nav .sa-icon {
      width: 1.125rem;
      height: 1.125rem;
    }
  `,
})
export class GeneralSettingsPage implements OnInit {
  private readonly api = inject(AdminNavVisibilityApiService);
  private readonly authPlatform = inject(AdminAuthPlatformApiService);
  private readonly platformUiApi = inject(AdminPlatformUiApiService);
  private readonly toastr = inject(ToastrService);
  private readonly navVisibility = inject(SidebarNavVisibilityService);

  activeId = 'template';

  /** Keys that are currently hidden (draft before save mirrors server after load). */
  readonly hiddenDraft = signal<Set<TemplateNavMenuKey>>(new Set());
  loading = signal(false);
  saveError = signal<string | null>(null);

  readonly authLoading = signal(false);
  readonly authSaveError = signal<string | null>(null);
  jwtClockSkewDraft = signal(30);

  readonly platformLoading = signal(false);
  readonly platformSaveError = signal<string | null>(null);
  developerApplicationsUiDraft = signal(false);

  readonly sandboxAiLoading = signal(false);
  readonly sandboxAiSaveError = signal<string | null>(null);
  sandboxAiEndpointsEnabled = signal(false);
  sandboxAiPrecheckEnabled = signal(false);
  sandboxAiAutomationEnabled = signal(false);
  sandboxAiMachineAutoApprove = signal(false);

  readonly keys = TEMPLATE_NAV_MENU_KEYS;
  readonly labels = TEMPLATE_NAV_MENU_LABELS;

  ngOnInit(): void {
    void this.load();
    void this.loadAuthJwtSkew();
    void this.loadDeveloperPortalUi();
    void this.loadSandboxAi();
  }

  isVisible(key: TemplateNavMenuKey): boolean {
    return !this.hiddenDraft().has(key);
  }

  toggle(key: TemplateNavMenuKey, visible: boolean): void {
    const next = new Set(this.hiddenDraft());
    if (visible) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.hiddenDraft.set(next);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.saveError.set(null);
    try {
      const res = await firstValueFrom(this.api.getVisibility());
      const hidden = new Set<TemplateNavMenuKey>();
      for (const k of res.sidebarNavHiddenMenuKeys) {
        if ((TEMPLATE_NAV_MENU_KEYS as readonly string[]).includes(k)) {
          hidden.add(k as TemplateNavMenuKey);
        }
      }
      this.hiddenDraft.set(hidden);
    } catch (e: unknown) {
      let msg = 'Failed to load nav visibility';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.saveError.set(msg);
      this.hiddenDraft.set(new Set(defaultHiddenTemplateNavKeys()));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.loading.set(true);
    this.saveError.set(null);
    try {
      const body = { sidebarNavHiddenMenuKeys: [...this.hiddenDraft()] };
      const res = await firstValueFrom(this.api.putVisibility(body));
      const hidden = new Set<TemplateNavMenuKey>();
      for (const k of res.sidebarNavHiddenMenuKeys) {
        if ((TEMPLATE_NAV_MENU_KEYS as readonly string[]).includes(k)) {
          hidden.add(k as TemplateNavMenuKey);
        }
      }
      this.hiddenDraft.set(hidden);
      await this.navVisibility.refreshFromServer();
      this.toastr.success('Saved', 'Sidebar visibility updated.');
    } catch (e: unknown) {
      let msg = 'Failed to save';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.saveError.set(msg);
      this.toastr.error('Save failed', msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loadAuthJwtSkew(): Promise<void> {
    this.authLoading.set(true);
    this.authSaveError.set(null);
    try {
      const r = await firstValueFrom(this.authPlatform.get());
      this.jwtClockSkewDraft.set(r.jwtClockSkewSeconds);
    } catch (e: unknown) {
      let msg = 'Failed to load auth settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.authSaveError.set(msg);
    } finally {
      this.authLoading.set(false);
    }
  }

  setDeveloperApplicationsUi(enabled: boolean): void {
    this.developerApplicationsUiDraft.set(enabled);
  }

  async loadDeveloperPortalUi(): Promise<void> {
    this.platformLoading.set(true);
    this.platformSaveError.set(null);
    try {
      const r = await firstValueFrom(this.platformUiApi.get());
      this.developerApplicationsUiDraft.set(r.developerApplicationsUiEnabled);
    } catch (e: unknown) {
      let msg = 'Failed to load platform settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.platformSaveError.set(msg);
    } finally {
      this.platformLoading.set(false);
    }
  }

  async loadSandboxAi(): Promise<void> {
    this.sandboxAiLoading.set(true);
    this.sandboxAiSaveError.set(null);
    try {
      const r = await firstValueFrom(this.platformUiApi.getSandboxAi());
      this.sandboxAiEndpointsEnabled.set(r.endpointsEnabled);
      this.sandboxAiPrecheckEnabled.set(r.precheckEnabled);
      this.sandboxAiAutomationEnabled.set(r.approvalAutomationEnabled);
      this.sandboxAiMachineAutoApprove.set(r.machineAutoApproveEnabled);
    } catch (e: unknown) {
      let msg = 'Failed to load sandbox AI settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.sandboxAiSaveError.set(msg);
    } finally {
      this.sandboxAiLoading.set(false);
    }
  }

  async saveSandboxAi(): Promise<void> {
    this.sandboxAiLoading.set(true);
    this.sandboxAiSaveError.set(null);
    try {
      await firstValueFrom(
        this.platformUiApi.patchSandboxAi({
          endpointsEnabled: this.sandboxAiEndpointsEnabled(),
          precheckEnabled: this.sandboxAiPrecheckEnabled(),
          approvalAutomationEnabled: this.sandboxAiAutomationEnabled(),
          machineAutoApproveEnabled: this.sandboxAiMachineAutoApprove(),
        }),
      );
      await this.loadSandboxAi();
      this.toastr.success('Saved', 'Sandbox AI platform flags updated.');
    } catch (e: unknown) {
      let msg = 'Failed to save sandbox AI settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.sandboxAiSaveError.set(msg);
      this.toastr.error('Save failed', msg);
    } finally {
      this.sandboxAiLoading.set(false);
    }
  }

  async saveDeveloperPortalUi(): Promise<void> {
    this.platformLoading.set(true);
    this.platformSaveError.set(null);
    try {
      const v = this.developerApplicationsUiDraft();
      const res = await firstValueFrom(this.platformUiApi.patch({ developerApplicationsUiEnabled: v }));
      this.developerApplicationsUiDraft.set(res.developerApplicationsUiEnabled);
      this.toastr.success('Saved', 'Developer sandbox applications UI updated.');
    } catch (e: unknown) {
      let msg = 'Failed to save platform settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.platformSaveError.set(msg);
      this.toastr.error('Save failed', msg);
    } finally {
      this.platformLoading.set(false);
    }
  }

  setJwtSkew(v: unknown): void {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) this.jwtClockSkewDraft.set(n);
  }

  async saveAuthJwtSkew(): Promise<void> {
    this.authLoading.set(true);
    this.authSaveError.set(null);
    try {
      const v = this.jwtClockSkewDraft();
      const res = await firstValueFrom(this.authPlatform.patch({ jwtClockSkewSeconds: v }));
      this.jwtClockSkewDraft.set(res.jwtClockSkewSeconds);
      this.toastr.success('Saved', 'JWT clock skew updated.');
    } catch (e: unknown) {
      let msg = 'Failed to save auth settings';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null;
        msg = body?.message ?? e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      this.authSaveError.set(msg);
      this.toastr.error('Save failed', msg);
    } finally {
      this.authLoading.set(false);
    }
  }
}
