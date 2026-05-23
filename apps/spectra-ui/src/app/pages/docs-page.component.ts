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
        Placeholder hub aligned with
        <a href="https://bluebutton.cms.gov/" rel="noopener noreferrer" target="_blank">CMS Blue Button</a>
        API Documentation navigation. Use the header menu to jump to a section.
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
          <p class="stub">Content coming soon.</p>
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
