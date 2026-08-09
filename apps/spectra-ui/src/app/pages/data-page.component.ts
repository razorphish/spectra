import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { dataNavItems } from '../layout/site-nav';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-data-page',
  imports: [RouterLink],
  template: `
    <div class="spectra-page data-page">
      <h1>Data</h1>
      <p class="lede">
        How Spectra platform data is organized, which environments hold real vs synthetic information, and where to
        find the HTTP contract. Use the header menu to jump to a section.
      </p>

      @for (item of dataNavItems; track item.fragment) {
        <section class="data-section" [id]="item.fragment">
          <h2>{{ item.label }}</h2>
          @switch (item.fragment) {
            @case ('overview') {
              <p>
                Spectra APIs expose domain entities (flights, bookings, corridors, etc.—exact catalogs are in
                <a routerLink="/docs" fragment="explore-the-api">OpenAPI</a>). Responses are scoped to your
                organization via the access token you present.
              </p>
              <p>
                <strong>Sandbox</strong> uses <strong>synthetic or subset</strong> data for safe integration testing.
                <strong>Staging</strong> uses <strong>PII-cleaned</strong> real-shaped datasets. <strong>Production</strong>
                holds real customer data and requires an approved access path — see
                <a routerLink="/production-access">Production Access</a>.
              </p>
            }
            @case ('understanding-the-data') {
              <p>
                Prefer reading <strong>read-only</strong> operations first when learning a resource. Pagination,
                sorting, and filters are defined per operation in the public <code>openapi.json</code> catalog.
              </p>
              <p>
                When modeling your integration, map Spectra resource IDs and timestamps to your internal systems
                early; do not rely on undocumented fields.
              </p>
            }
            @case ('resources') {
              <p>
                <a routerLink="/docs">API Documentation</a> — authentication, errors, and environment matrix.<br />
                <a routerLink="/docs" fragment="consuming-the-data">Consuming the Data</a> — API usage patterns.<br />
                Repository: <code>docs/sandbox-local-development.md</code> — local stack and OpenAPI merge.
              </p>
            }
            @default {
              <p class="stub">Unknown section.</p>
            }
          }
        </section>
      }
    </div>
  `,
  styles: `
    .data-page {
      padding-bottom: 4rem;
    }

    .data-section {
      scroll-margin-top: calc(var(--spectra-header-height) + 1rem);
      margin-top: 2.5rem;
      padding: 1.25rem 1.5rem;
      background: var(--spectra-color-card);
      border: 1px solid var(--spectra-color-border);
      border-radius: var(--spectra-radius-md);
      box-shadow: var(--spectra-shadow-sm);
    }

    .data-section h2 {
      margin: 0 0 0.5rem;
      font-size: 1.2rem;
      color: var(--spectra-color-navy);
    }

    .data-section p {
      margin: 0.5rem 0 0;
      line-height: 1.55;
      color: var(--spectra-color-panel-text);
    }

    .data-section a {
      color: var(--spectra-color-link);
      font-weight: 600;
    }

    .stub {
      margin: 0;
      color: var(--spectra-color-muted);
    }
  `,
})
export class DataPageComponent implements AfterViewInit {
  protected readonly dataNavItems = dataNavItems;

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
