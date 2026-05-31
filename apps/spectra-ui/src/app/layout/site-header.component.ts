import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SpectraBrandBarComponent } from '@spectra/shared-ui';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  dataNavItems,
  docsNavItems,
  primaryNavLinksAfterDocs,
  primaryNavLinksBeforeDocs,
} from './site-nav';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'spectra-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SpectraBrandBarComponent],
  template: `
    <header class="site-header" role="banner">
      <div class="site-header-inner">
        <spectra-brand-bar [homeRouterPath]="'/'" />

        <button
          type="button"
          class="menu-toggle"
          (click)="toggleMobileMenu()"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="primary-nav"
        >
          Menu
        </button>

        <nav
          id="primary-nav"
          class="primary-nav"
          [class.primary-nav-open]="menuOpen()"
          aria-label="Primary"
        >
          @for (link of primaryNavLinksBeforeDocs; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="active"
              class="nav-link"
              (click)="closeMobileMenu()"
              >{{ link.label }}</a
            >
          }

          <div
            class="nav-dropdown"
            (mouseenter)="onFlyoutEnter('docs')"
            (mouseleave)="onFlyoutLeave()"
          >
            <button
              type="button"
              class="nav-summary"
              id="nav-flyout-docs-trigger"
              aria-haspopup="true"
              [attr.aria-expanded]="activeFlyout() === 'docs'"
              aria-controls="nav-flyout-docs-panel"
              [attr.aria-current]="docsPathActive() ? 'page' : null"
              [class.active]="docsPathActive()"
              (click)="onFlyoutTriggerClick('docs', $event)"
            >
              API Documentation
            </button>
            @if (activeFlyout() === 'docs') {
              <ul
                id="nav-flyout-docs-panel"
                class="nav-dropdown-panel"
                role="list"
                aria-labelledby="nav-flyout-docs-trigger"
              >
                @for (item of docsNavItems; track item.fragment) {
                  <li>
                    <a
                      [routerLink]="['/docs']"
                      [fragment]="item.fragment"
                      class="nav-dropdown-link"
                      (click)="finalizeFlyoutNav()"
                      >{{ item.label }}</a
                    >
                  </li>
                }
              </ul>
            }
          </div>

          <div
            class="nav-dropdown"
            (mouseenter)="onFlyoutEnter('data')"
            (mouseleave)="onFlyoutLeave()"
          >
            <button
              type="button"
              class="nav-summary"
              id="nav-flyout-data-trigger"
              aria-haspopup="true"
              [attr.aria-expanded]="activeFlyout() === 'data'"
              aria-controls="nav-flyout-data-panel"
              [attr.aria-current]="dataPathActive() ? 'page' : null"
              [class.active]="dataPathActive()"
              (click)="onFlyoutTriggerClick('data', $event)"
            >
              Data
            </button>
            @if (activeFlyout() === 'data') {
              <ul
                id="nav-flyout-data-panel"
                class="nav-dropdown-panel"
                role="list"
                aria-labelledby="nav-flyout-data-trigger"
              >
                @for (item of dataNavItems; track item.fragment) {
                  <li>
                    <a
                      [routerLink]="['/data']"
                      [fragment]="item.fragment"
                      class="nav-dropdown-link"
                      (click)="finalizeFlyoutNav()"
                      >{{ item.label }}</a
                    >
                  </li>
                }
              </ul>
            }
          </div>

          @for (link of primaryNavLinksAfterDocs; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="active"
              class="nav-link"
              (click)="closeMobileMenu()"
              >{{ link.label }}</a
            >
          }

          @if (sandboxUiUrl) {
            <a
              class="sandbox-cta"
              [href]="sandboxUiUrl"
              target="_blank"
              rel="noopener noreferrer"
              (click)="closeMobileMenu()"
            >
              Sandbox
            </a>
          }
        </nav>
      </div>
    </header>
  `,
  styles: `
    .site-header {
      background: var(--spectra-color-navy);
      color: #e8edf4;
      box-shadow: var(--spectra-shadow-md);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .site-header-inner {
      position: relative;
      max-width: var(--spectra-max-width);
      margin: 0 auto;
      padding: 0 1.25rem;
      min-height: var(--spectra-header-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .menu-toggle {
      display: none;
      background: var(--spectra-color-navy-mid);
      color: #f8fafc;
      border: 1px solid rgb(255 255 255 / 0.2);
      border-radius: var(--spectra-radius-sm);
      padding: 0.45rem 0.75rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }

    .menu-toggle:hover {
      background: rgb(255 255 255 / 0.08);
    }

    .primary-nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
    }

    .nav-link {
      padding: 0.5rem 0.65rem;
      border-radius: var(--spectra-radius-sm);
      color: #dbe4f0;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
    }

    .nav-link:hover {
      background: rgb(255 255 255 / 0.08);
      color: #fff;
    }

    .nav-link.active {
      background: rgb(255 255 255 / 0.12);
      color: #fff;
    }

    .nav-dropdown {
      position: relative;
      border-radius: var(--spectra-radius-sm);
    }

    .nav-summary {
      display: inline-flex;
      align-items: center;
      font: inherit;
      font-family: inherit;
      cursor: pointer;
      padding: 0.5rem 0.65rem;
      border: none;
      background: transparent;
      border-radius: var(--spectra-radius-sm);
      color: #dbe4f0;
      font-weight: 500;
      font-size: 0.95rem;
      user-select: none;
      text-align: left;
    }

    .nav-summary::after {
      content: '';
      display: inline-block;
      margin-left: 0.35rem;
      border: 0.2rem solid transparent;
      border-top-color: currentColor;
      vertical-align: middle;
    }

    .nav-summary:hover {
      background: rgb(255 255 255 / 0.08);
      color: #fff;
    }

    .nav-summary.active {
      background: rgb(255 255 255 / 0.12);
      color: #fff;
    }

    .nav-dropdown-panel {
      position: absolute;
      left: 0;
      top: 100%;
      margin: 0;
      padding: 0.35rem 0;
      padding-top: 0.4rem;
      list-style: none;
      background: var(--spectra-color-card);
      border: 1px solid var(--spectra-color-border);
      border-radius: var(--spectra-radius-md);
      box-shadow: var(--spectra-shadow-md);
      z-index: 60;
      min-width: 14rem;
    }

    /* Invisible hover bridge so pointer does not leave the hitbox between trigger and panel. */
    .nav-dropdown-panel::before {
      content: '';
      position: absolute;
      top: -0.35rem;
      left: 0;
      right: 0;
      height: 0.35rem;
    }

    .nav-dropdown-link {
      display: block;
      padding: 0.45rem 1rem;
      color: var(--spectra-color-text);
      text-decoration: none;
      font-size: 0.9rem;
    }

    .nav-dropdown-link:hover {
      background: var(--spectra-color-surface);
      color: var(--spectra-color-link-hover);
    }

    .sandbox-cta {
      margin-left: 0.35rem;
      padding: 0.45rem 1rem;
      border-radius: var(--spectra-radius-sm);
      background: var(--spectra-color-accent);
      color: #fff !important;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      white-space: nowrap;
    }

    .sandbox-cta:hover {
      background: var(--spectra-color-accent-hover);
      color: #fff !important;
    }

    @media (max-width: 768px) {
      .menu-toggle {
        display: inline-block;
      }

      .primary-nav {
        display: none;
        position: absolute;
        left: 0;
        right: 0;
        top: 100%;
        flex-direction: column;
        align-items: stretch;
        padding: 0.75rem 1.25rem 1rem;
        background: var(--spectra-color-navy-mid);
        border-top: 1px solid rgb(255 255 255 / 0.12);
        gap: 0.15rem;
      }

      .primary-nav-open {
        display: flex;
      }

      .nav-dropdown-panel {
        position: static;
        border: none;
        box-shadow: none;
        background: transparent;
        padding-left: 0.5rem;
      }

      .nav-dropdown-link {
        color: #dbe4f0;
      }

      .nav-dropdown-link:hover {
        background: rgb(255 255 255 / 0.08);
        color: #fff;
      }

      .sandbox-cta {
        margin-left: 0;
        text-align: center;
      }
    }
  `,
})
export class SiteHeaderComponent {
  protected readonly primaryNavLinksBeforeDocs = primaryNavLinksBeforeDocs;
  protected readonly primaryNavLinksAfterDocs = primaryNavLinksAfterDocs;
  protected readonly docsNavItems = docsNavItems;
  protected readonly dataNavItems = dataNavItems;
  protected readonly sandboxUiUrl = environment.sandboxUiUrl;

  protected readonly menuOpen = signal(false);
  /** Only one flyout (docs vs data) may be open — mutual exclusion for hover + click. */
  protected readonly activeFlyout = signal<'docs' | 'data' | null>(null);

  private flyoutLeaveTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.clearFlyoutLeaveTimer());
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.afterNavigation());
  }

  protected docsPathActive(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/docs' || path.startsWith('/docs');
  }

  protected dataPathActive(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/data' || path.startsWith('/data');
  }

  protected closeMobileMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleMobileMenu(): void {
    this.menuOpen.update((open) => {
      const next = !open;
      if (next) {
        this.clearFlyoutLeaveTimer();
        this.activeFlyout.set(null);
      }
      return next;
    });
  }

  /** Desktop / fine pointer: open flyout on hover (exclusive — only one menu). */
  protected onFlyoutEnter(id: 'docs' | 'data'): void {
    this.clearFlyoutLeaveTimer();
    if (this.hoverFlyoutsEnabled()) {
      this.activeFlyout.set(id);
    }
  }

  /** Debounced so moving between trigger and panel (or adjacent menus) does not flicker closed. */
  protected onFlyoutLeave(): void {
    if (!this.hoverFlyoutsEnabled()) return;
    this.clearFlyoutLeaveTimer();
    this.flyoutLeaveTimer = setTimeout(() => {
      this.flyoutLeaveTimer = null;
      this.activeFlyout.set(null);
    }, 120);
  }

  /** Toggle flyout on trigger (touch / keyboard / click when hover is not used). */
  protected onFlyoutTriggerClick(id: 'docs' | 'data', event: MouseEvent): void {
    event.stopPropagation();
    this.clearFlyoutLeaveTimer();
    this.activeFlyout.update((cur) => (cur === id ? null : id));
  }

  protected finalizeFlyoutNav(): void {
    this.clearFlyoutLeaveTimer();
    this.activeFlyout.set(null);
    this.menuOpen.set(false);
  }

  private hoverFlyoutsEnabled(): boolean {
    return (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(hover: hover) and (pointer: fine)').matches
    );
  }

  private clearFlyoutLeaveTimer(): void {
    if (this.flyoutLeaveTimer) {
      clearTimeout(this.flyoutLeaveTimer);
      this.flyoutLeaveTimer = null;
    }
  }

  private afterNavigation(): void {
    this.clearFlyoutLeaveTimer();
    this.menuOpen.set(false);
    this.activeFlyout.set(null);
  }
}
