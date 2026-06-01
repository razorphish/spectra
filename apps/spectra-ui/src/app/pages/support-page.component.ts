import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-support-page',
  imports: [RouterLink],
  template: `
    <div class="spectra-page">
      <h1>Support</h1>
      <p class="lede">
        For API integration questions, start with <a routerLink="/docs">API Documentation</a> and the
        <a routerLink="/docs" fragment="get-started-with-sandbox">developer sandbox</a>. For account and contract
        topics, use your Spectra customer success channel.
      </p>
      <section class="spectra-probe sup-section">
        <h2>API availability</h2>
        <p>
          A <strong>dedicated API / developer status</strong> page is required for the public API program (gateway,
          auth mint, and related dependencies). Corporate marketing status alone is not sufficient — the exact URL and
          incident process will be published here when live.
        </p>
      </section>
      <section class="spectra-probe sup-section">
        <h2>Developer resources</h2>
        <ul>
          <li><a routerLink="/docs">API Documentation</a> — auth, environments, errors, and catalog boundaries.</li>
          <li>
            <a routerLink="/docs" fragment="explore-the-api">Explore the API</a> — public <code>/openapi.json</code> and
            <code>/docs</code> vs staff integration catalog.
          </li>
          <li><a routerLink="/production-access">Production Access</a> — approvals and environment expectations.</li>
        </ul>
      </section>
    </div>
  `,
  styles: `
    .sup-section {
      margin-top: 1.5rem;
      padding: 1.25rem 1.5rem;
    }
    .sup-section ul {
      margin: 0.5rem 0 0;
      padding-left: 1.25rem;
      line-height: 1.55;
    }
    .sup-section a {
      color: var(--spectra-color-link);
      font-weight: 600;
    }
  `,
})
export class SupportPageComponent {}
