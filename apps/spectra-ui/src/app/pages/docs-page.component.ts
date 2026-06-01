import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { docsNavItems } from '../layout/site-nav';
import { environment } from '../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-docs-page',
  imports: [RouterLink],
  templateUrl: './docs-page.component.html',
  styles: `
    .docs-page {
      padding-bottom: 4rem;
    }

    .doc-section {
      scroll-margin-top: calc(var(--spectra-header-height) + 1rem);
      margin-top: 2.5rem;
      padding: 1.25rem 1.5rem;
      background: var(--spectra-color-card);
      border: 1px solid var(--spectra-color-border);
      border-radius: var(--spectra-radius-md);
      box-shadow: var(--spectra-shadow-sm);
    }

    .doc-section h2 {
      margin: 0 0 0.5rem;
      font-size: 1.2rem;
      color: var(--spectra-color-navy);
    }

    .stub {
      margin: 0.35rem 0 0;
      color: var(--spectra-color-muted);
    }

    .sandbox-lead {
      margin: 0 0 0.5rem;
      color: var(--spectra-color-text);
    }

    .sandbox-link {
      font-weight: 600;
      color: var(--spectra-color-accent);
      text-decoration: none;
    }

    .sandbox-link:hover:not(.disabled) {
      color: var(--spectra-color-accent-hover);
      text-decoration: underline;
    }

    .sandbox-link.disabled {
      pointer-events: none;
      color: var(--spectra-color-muted);
      cursor: default;
    }

    .lede a {
      color: var(--spectra-color-link);
    }

    .doc-steps {
      margin: 0.5rem 0 1rem;
      padding-left: 1.25rem;
      color: var(--spectra-color-panel-text);
      line-height: 1.55;
    }

    .meta-line {
      margin: 0.75rem 0 0;
      font-size: 0.9rem;
      color: var(--spectra-color-text);
    }

    .meta-line .label {
      display: block;
      font-weight: 600;
      color: var(--spectra-color-muted);
      margin-bottom: 0.2rem;
    }
  `,
})
export class DocsPageComponent implements AfterViewInit {
  protected readonly docsNavItems = docsNavItems;
  protected readonly sandboxUiUrl = environment.sandboxUiUrl?.trim() || '';

  private readonly router = inject(Router);

  /** Non-empty when this build knows a gateway origin (e.g. local dev). */
  protected apiGatewayOrigin(): string {
    return environment.apiBaseUrl?.replace(/\/$/, '') ?? '';
  }

  /** OAuth 2.0 Authorization Server metadata on auth-api (RFC 8414). */
  protected oauthMetadataUrl(): string | null {
    const b = environment.authApiPublicBaseUrl?.trim();
    if (!b) return null;
    return `${b.replace(/\/$/, '')}/.well-known/oauth-authorization-server`;
  }

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.scrollToFragmentFromUrl());
  }

  ngAfterViewInit(): void {
    this.scrollToFragmentFromUrl();
  }

  private scrollToFragmentFromUrl(): void {
    const fragment = this.router.parseUrl(this.router.url).fragment;
    if (!fragment) return;
    queueMicrotask(() => {
      document.getElementById(fragment)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }
}
