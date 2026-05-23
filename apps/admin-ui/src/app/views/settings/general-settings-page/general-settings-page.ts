import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbNavModule, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { PageBreadcrumb } from '@app/components/page-breadcrumb';
import { AdminNavVisibilityApiService } from '@core/services/admin-nav-visibility-api.service';
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
  private readonly toastr = inject(ToastrService);
  private readonly navVisibility = inject(SidebarNavVisibilityService);

  activeId = 'template';

  /** Keys that are currently hidden (draft before save mirrors server after load). */
  readonly hiddenDraft = signal<Set<TemplateNavMenuKey>>(new Set());
  loading = signal(false);
  saveError = signal<string | null>(null);

  readonly keys = TEMPLATE_NAV_MENU_KEYS;
  readonly labels = TEMPLATE_NAV_MENU_LABELS;

  ngOnInit(): void {
    void this.load();
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
}
