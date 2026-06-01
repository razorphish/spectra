import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-production-access-page',
  imports: [RouterLink],
  template: `
    <div class="spectra-page">
      <h1>Production Access</h1>
      <p class="lede">
        Production Spectra APIs hold <strong>real customer data</strong>. Access is <strong>not</strong> self-serve by
        default: your organization completes the <strong>approval workflow on this Spectra site</strong> (production
        access request). <strong>Spectra staff</strong> review those requests and grant production credentials or
        elevated scopes using Spectra’s <strong>internal admin UI</strong> (operator tooling)—not via automatic
        self-serve.
      </p>
      <section class="spectra-probe pa-section">
        <h2>Environments (summary)</h2>
        <ul>
          <li>
            <strong>Developer sandbox</strong> — Synthetic or subset data for integration testing; use
            <a routerLink="/docs" fragment="get-started-with-sandbox">Get Started with Sandbox</a>.
          </li>
          <li>
            <strong>Staging</strong> — Real-shaped behavior with <strong>PII-cleaned</strong> datasets; use for
            pre-production validation.
          </li>
          <li><strong>Production</strong> — Real data; requires approval and least-privilege scopes.</li>
        </ul>
      </section>
      <section class="spectra-probe pa-section">
        <h2>What to prepare</h2>
        <p>
          Before requesting production access, complete integration testing against sandbox (and staging where
          available), document your security controls, and align on support contacts. API reference and auth patterns
          are described under <a routerLink="/docs">API Documentation</a>.
        </p>
      </section>
    </div>
  `,
  styles: `
    .pa-section {
      margin-top: 1.5rem;
      padding: 1.25rem 1.5rem;
    }
    .pa-section ul {
      margin: 0.5rem 0 0;
      padding-left: 1.25rem;
      line-height: 1.55;
    }
    .pa-section a {
      color: var(--spectra-color-link);
      font-weight: 600;
    }
  `,
})
export class ProductionAccessPageComponent {}
