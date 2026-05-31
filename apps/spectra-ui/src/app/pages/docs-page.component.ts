import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { docsNavItems } from '../layout/site-nav';
import { environment } from '../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-docs-page',
  template: `
    <div class="spectra-page docs-page">
      <h1>API Documentation</h1>
      <p class="lede">
        Guides for discovering Spectra APIs, using the developer sandbox, and integrating your systems. Use the
        header menu to jump to a section.
      </p>

      @for (item of docsNavItems; track item.fragment) {
        <section class="doc-section" [id]="item.fragment">
          <h2>{{ item.label }}</h2>
          @if (item.fragment === 'get-started-with-sandbox') {
            @if (sandboxUiUrl) {
              <p class="sandbox-lead">
                <a [href]="sandboxUiUrl" class="sandbox-link" target="_blank" rel="noopener noreferrer"
                  >Open Spectra Sandbox</a
                >
                — authenticated developer UI (<code>sandbox-ui</code>).
              </p>
            } @else {
              <p class="stub">Configure <code>sandboxUiUrl</code> in this environment to enable the Sandbox link.</p>
            }
          }
          @if (item.fragment === 'integrations') {
            <p>
              <strong>Integrations</strong> are server-to-server OAuth2 clients you register in the Spectra developer
              sandbox. Each integration has a <code>client_id</code> and <code>client_secret</code> used with the
              <code>client_credentials</code> grant to obtain access tokens for calling Spectra APIs from your backends
              and automation — without an interactive user login.
            </p>
            <p>
              Tokens are minted by Spectra's auth service and are separate from end-user sessions (for example Auth0
              access tokens used in the sandbox UI). You choose a display name, optional description, and which
              <strong>scopes</strong> the client is allowed to request; those scopes limit what the issued token can do
              at the API edge.
            </p>
            <p>
              Create and manage integrations from the developer dashboard after you sign in to the sandbox. Legacy
              <em>sandbox applications</em> (redirect-based OAuth clients) may be shown or hidden by your organization's
              settings; integrations are the supported path for machine-to-machine API access.
            </p>
          }
          @if (item.fragment !== 'integrations') {
            <p class="stub">Content coming soon.</p>
          }
        </section>
      }
    </div>
  `,
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

    .sandbox-link:hover {
      color: var(--spectra-color-accent-hover);
      text-decoration: underline;
    }

    .lede a {
      color: var(--spectra-color-link);
    }
  `,
})
export class DocsPageComponent implements AfterViewInit {
  protected readonly docsNavItems = docsNavItems;
  protected readonly sandboxUiUrl = environment.sandboxUiUrl;

  private readonly router = inject(Router);

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
