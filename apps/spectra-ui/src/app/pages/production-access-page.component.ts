import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../environments/environment';

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
        default: your organization submits a <strong>production access request</strong> from the
        <strong>developer portal</strong> (sandbox), and <strong>Spectra staff</strong> review it in operator tooling.
        Status and follow-up messages are visible <strong>only while signed in</strong> to the portal—there is no
        public link to look up a request by token from this marketing site.
      </p>

      <section class="spectra-probe pa-section">
        <h2>Before you open the portal</h2>
        <ol class="pa-steps">
          <li>Finish integration testing against the <strong>developer sandbox</strong>.</li>
          <li>Have your <strong>sandbox M2M integration</strong> ready (client credentials flow).</li>
          <li>Know who will own production support contacts and security attestations.</li>
        </ol>
      </section>

      <section class="spectra-probe pa-section">
        <h2>Open the developer portal</h2>
        <p>
          Sign in to the sandbox portal, open your integration, and use <strong>Production API access</strong> to
          submit the questionnaire. Staff typically respond within
          <strong>{{ slaDays }} business days</strong> (subject to queue and completeness of your submission).
        </p>
        @if (sandboxUiUrl) {
          <p>
            <a class="pa-cta" [href]="sandboxUiUrl + '/dashboard'" rel="noopener noreferrer">Open developer portal</a>
          </p>
          <p class="hint small">
            Configure <code>sandboxUiUrl</code> at deploy time if this link is missing. The portal and Spectra APIs must
            share CORS / cookie rules per your environment documentation.
          </p>
        } @else {
          <p class="hint">
            The sandbox portal URL is not configured for this build. Your operator should set
            <code>sandboxUiUrl</code> in the Spectra UI environment so the button appears here.
          </p>
        }
      </section>

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
    .pa-steps {
      margin: 0.5rem 0 0;
      padding-left: 1.25rem;
      line-height: 1.6;
    }
    .pa-cta {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.55rem 1.1rem;
      border-radius: 0.375rem;
      background: var(--spectra-color-link);
      color: #fff !important;
      text-decoration: none !important;
      font-weight: 700;
    }
    .hint.small {
      font-size: 0.88rem;
      opacity: 0.9;
    }
  `,
})
export class ProductionAccessPageComponent {
  protected readonly sandboxUiUrl = (environment.sandboxUiUrl ?? '').replace(/\/$/, '');
  /** Default copy when platform SLA setting is not available on the static site. */
  protected readonly slaDays = 5;
}
