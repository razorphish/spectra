import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { dataNavItems } from '../layout/site-nav';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-data-page',
  template: `
    <div class="spectra-page data-page">
      <h1>Data</h1>
      <p class="lede">
        Placeholder hub aligned with
        <a href="https://bluebutton.cms.gov/" rel="noopener noreferrer" target="_blank">Blue Button</a>
        Data navigation. Use the header menu to jump to a section.
      </p>

      @for (item of dataNavItems; track item.fragment) {
        <section class="data-section" [id]="item.fragment">
          <h2>{{ item.label }}</h2>
          <p class="stub">Content coming soon.</p>
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

    .stub {
      margin: 0;
      color: var(--spectra-color-muted);
    }

    .lede a {
      color: var(--spectra-color-link);
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
