import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminNavVisibilityApiService } from './admin-nav-visibility-api.service';
import { defaultHiddenTemplateNavKeys } from '../template-nav-menu';

/**
 * Shared sidebar + route-guard visibility for template menu keys.
 * While `bootstrapLoading` is true, the sidenav shows the full tree (plan UX). Then applies hidden keys.
 * On GET failure after auth, falls back to default hidden (aligned with admin-ui-api GET semantics).
 */
@Injectable({ providedIn: 'root' })
export class SidebarNavVisibilityService {
  private readonly api = inject(AdminNavVisibilityApiService);

  /** True until the first successful or failed GET for nav visibility completes (initial load only). */
  readonly bootstrapLoading = signal(true);

  /** Keys currently hidden in the sidebar / blocked by guards (after initial load or refresh). */
  readonly hiddenKeys = signal<ReadonlySet<string>>(new Set());

  private ensurePromise: Promise<void> | null = null;

  /** Wait for the first visibility fetch (used by route guards and sidenav). */
  ensureLoaded(): Promise<void> {
    if (this.ensurePromise) {
      return this.ensurePromise;
    }
    this.ensurePromise = this.runInitialFetch();
    return this.ensurePromise;
  }

  /** Re-fetch after General settings save (does not flip bootstrap loading back to true). */
  async refreshFromServer(): Promise<void> {
    await this.fetchAndApply(false);
  }

  isHidden(menuKey: string): boolean {
    return this.hiddenKeys().has(menuKey);
  }

  private async runInitialFetch(): Promise<void> {
    await this.fetchAndApply(true);
  }

  private async fetchAndApply(isBootstrap: boolean): Promise<void> {
    if (isBootstrap) {
      this.bootstrapLoading.set(true);
    }
    try {
      const res = await firstValueFrom(this.api.getVisibility());
      this.hiddenKeys.set(new Set(res.sidebarNavHiddenMenuKeys));
    } catch (e: unknown) {
      this.hiddenKeys.set(new Set(defaultHiddenTemplateNavKeys()));
      if (e instanceof HttpErrorResponse && e.status === 401) {
        // keep default hidden; caller may redirect via auth layout
      }
    } finally {
      if (isBootstrap) {
        this.bootstrapLoading.set(false);
      }
    }
  }
}
