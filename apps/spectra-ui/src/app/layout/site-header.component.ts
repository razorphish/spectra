import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="site-header" role="banner">
      <div class="site-header-inner">
        <a routerLink="/" class="brand" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          Spectra
        </a>

        <button
          type="button"
          class="menu-toggle"
          (click)="menuOpen.update((v) => !v)"
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
              >{{ link.label }}</a
            >
          }

          <details class="nav-dropdown">
            <summary
              class="nav-summary"
              [attr.aria-current]="docsPathActive() ? 'page' : null"
              [class.active]="docsPathActive()"
            >
              API Documentation
            </summary>
            <ul class="nav-dropdown-panel" role="list">
              @for (item of docsNavItems; track item.fragment) {
                <li>
                  <a
                    [routerLink]="['/docs']"
                    [fragment]="item.fragment"
                    class="nav-dropdown-link"
                    (click)="closeMobileMenu()"
                    >{{ item.label }}</a
                  >
                </li>
              }
            </ul>
          </details>

          <details class="nav-dropdown">
            <summary
              class="nav-summary"
              [attr.aria-current]="dataPathActive() ? 'page' : null"
              [class.active]="dataPathActive()"
            >
              Data
            </summary>
            <ul class="nav-dropdown-panel" role="list">
              @for (item of dataNavItems; track item.fragment) {
                <li>
                  <a
                    [routerLink]="['/data']"
                    [fragment]="item.fragment"
                    class="nav-dropdown-link"
                    (click)="closeMobileMenu()"
                    >{{ item.label }}</a
                  >
                </li>
              }
            </ul>
          </details>

          @for (link of primaryNavLinksAfterDocs; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="active"
              class="nav-link"
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

    .brand {
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: 0.02em;
      color: #f8fafc;
      text-decoration: none;
      white-space: nowrap;
    }

    .brand:hover {
      color: #fff;
    }

    .brand.active {
      text-decoration: underline;
      text-underline-offset: 4px;
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
      list-style: none;
      cursor: pointer;
      padding: 0.5rem 0.65rem;
      border-radius: var(--spectra-radius-sm);
      color: #dbe4f0;
      font-weight: 500;
      font-size: 0.95rem;
      user-select: none;
    }

    .nav-summary::-webkit-details-marker {
      display: none;
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
      top: calc(100% + 0.15rem);
      min-width: 14rem;
      margin: 0;
      padding: 0.35rem 0;
      list-style: none;
      background: var(--spectra-color-card);
      border: 1px solid var(--spectra-color-border);
      border-radius: var(--spectra-radius-md);
      box-shadow: var(--spectra-shadow-md);
      z-index: 60;
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

  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
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
}
