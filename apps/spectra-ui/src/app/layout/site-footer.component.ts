import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { footerColumns } from './site-nav';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'spectra-site-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="site-footer" role="contentinfo">
      <div class="site-footer-inner">
        <div class="footer-grid">
          @for (col of footerColumns; track col.title) {
            <div class="footer-col">
              <h2 class="footer-heading">{{ col.title }}</h2>
              <ul class="footer-list">
                @for (link of col.links; track link.path + (link.fragment ?? '')) {
                  <li>
                    <a
                      [routerLink]="link.path"
                      [fragment]="link.fragment ?? undefined"
                      class="footer-link"
                      >{{ link.label }}</a
                    >
                  </li>
                }
              </ul>
            </div>
          }
        </div>
        @if (sandboxUiUrl) {
          <p class="footer-sandbox-row">
            <a [href]="sandboxUiUrl" class="footer-sandbox" target="_blank" rel="noopener noreferrer">Open Sandbox</a>
            — try the authenticated developer UI.
          </p>
        }
        <p class="footer-meta">© {{ year }} CAMP Systems International, Inc.</p>
      </div>
    </footer>
  `,
  styles: `
    .site-footer {
      margin-top: auto;
      background: var(--spectra-color-navy);
      color: #c8d2e0;
      padding: 2.5rem 0 2rem;
      border-top: 1px solid rgb(255 255 255 / 0.08);
    }

    .site-footer-inner {
      max-width: var(--spectra-max-width);
      margin: 0 auto;
      padding: 0 1.25rem;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
      gap: 2rem 1.5rem;
    }

    .footer-heading {
      margin: 0 0 0.75rem;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
    }

    .footer-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .footer-list li {
      margin-bottom: 0.4rem;
    }

    .footer-link {
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.95rem;
    }

    .footer-link:hover {
      color: #fff;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .footer-sandbox-row {
      margin: 1.5rem 0 0;
      font-size: 0.95rem;
      color: #94a3b8;
    }

    .footer-sandbox {
      font-weight: 600;
      color: #fdba74;
      text-decoration: none;
    }

    .footer-sandbox:hover {
      color: #fed7aa;
      text-decoration: underline;
    }

    .footer-meta {
      margin: 1.25rem 0 0;
      padding-top: 1.5rem;
      border-top: 1px solid rgb(255 255 255 / 0.1);
      font-size: 0.85rem;
      color: #94a3b8;
    }
  `,
})
export class SiteFooterComponent {
  protected readonly footerColumns = footerColumns;
  protected readonly sandboxUiUrl = environment.sandboxUiUrl;
  protected readonly year = new Date().getFullYear();
}
