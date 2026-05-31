import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Left side of the Spectra chrome: logo, wordmark, Aviate tagline, and home link (internal route or external URL).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'spectra-brand-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="spectra-brand-bar">
      @if (homeRouterPath(); as path) {
        <a
          [routerLink]="path"
          class="spectra-brand-bar-link"
          [attr.aria-label]="ariaLabel()"
          routerLinkActive="spectra-brand-bar-link-active"
          [routerLinkActiveOptions]="{ exact: routerLinkExact() }"
        >
          <img [src]="logoSrc()" alt="" class="spectra-brand-bar-logo" width="28" height="28" />
          <span class="spectra-brand-bar-titles">
            <span class="spectra-brand-bar-text">Spectra</span>
            <span class="spectra-brand-bar-tagline">An Aviate-based developer platform</span>
          </span>
        </a>
      } @else if (homeHref(); as href) {
        <a [href]="href" class="spectra-brand-bar-link" [attr.aria-label]="ariaLabel()">
          <img [src]="logoSrc()" alt="" class="spectra-brand-bar-logo" width="28" height="28" />
          <span class="spectra-brand-bar-titles">
            <span class="spectra-brand-bar-text">Spectra</span>
            <span class="spectra-brand-bar-tagline">An Aviate-based developer platform</span>
          </span>
        </a>
      } @else {
        <span class="spectra-brand-bar-static" role="img" [attr.aria-label]="ariaLabel()">
          <img [src]="logoSrc()" alt="" class="spectra-brand-bar-logo" width="28" height="28" />
          <span class="spectra-brand-bar-titles">
            <span class="spectra-brand-bar-text">Spectra</span>
            <span class="spectra-brand-bar-tagline">An Aviate-based developer platform</span>
          </span>
        </span>
      }
    </div>
  `,
  styles: `
    .spectra-brand-bar {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .spectra-brand-bar-link,
    .spectra-brand-bar-static {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: inherit;
      min-width: 0;
    }

    .spectra-brand-bar-titles {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
      min-width: 0;
      line-height: 1.15;
    }

    .spectra-brand-bar-tagline {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.72;
      white-space: nowrap;
    }

    .spectra-brand-bar-link:hover .spectra-brand-bar-text {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .spectra-brand-bar-link-active .spectra-brand-bar-text {
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .spectra-brand-bar-logo {
      flex-shrink: 0;
      display: block;
    }

    .spectra-brand-bar-text {
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
  `,
})
export class SpectraBrandBarComponent {
  /** When set, brand uses SPA navigation (e.g. `'/'` in spectra-ui). Takes precedence over homeHref. */
  readonly homeRouterPath = input<string | null>(null);
  /** External or absolute URL for the marketing / discovery app (e.g. sandbox linking to spectra-ui). */
  readonly homeHref = input<string | null>(null);
  readonly logoSrc = input('assets/spectra/logo.svg');
  readonly ariaLabel = input('Spectra home');
  /** When using homeRouterPath, pass `true` for the marketing home route `'/'`. */
  readonly routerLinkExact = input(true);
}
