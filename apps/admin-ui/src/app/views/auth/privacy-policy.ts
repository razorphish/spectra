import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-lg-10 col-xl-8">
        <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h1 class="h3 text-white mb-2">Privacy Policy</h1>
          <p class="text-white opacity-50 small mb-4">Spectra Admin — last updated May 12, 2026</p>
          <div
            class="text-white opacity-90 small legal-scroll pe-1"
            tabindex="0"
          >
            <h2 class="h6 text-white mt-0">1. Overview</h2>
            <p>
              This policy describes how Spectra may collect, use, and protect information when you use this
              administrative application. Practices may vary by deployment; your organization may provide additional
              notices.
            </p>
            <h2 class="h6 text-white">2. Information we process</h2>
            <p>
              Typical categories include account identifiers (such as email), authentication events, audit and security
              logs, and content you submit through the admin UI. Exact data categories depend on configuration and
              integrations enabled for your tenant.
            </p>
            <h2 class="h6 text-white">3. How we use information</h2>
            <p>
              We use information to operate and secure the service, authenticate users, troubleshoot issues, and comply
              with law or contractual obligations.
            </p>
            <h2 class="h6 text-white">4. Retention</h2>
            <p>
              Retention periods are determined by your organization’s policies and technical configuration. Contact your
              administrator for specifics.
            </p>
            <h2 class="h6 text-white">5. Your choices</h2>
            <p>
              Depending on your role and jurisdiction, you may have rights to access, correct, or delete certain personal
              data. Requests are generally handled through your organization’s Spectra administrator.
            </p>
            <h2 class="h6 text-white">6. Updates</h2>
            <p class="mb-0">
              We may revise this policy from time to time. Material changes will be reflected in the “last updated” date
              above or as otherwise required by applicable law.
            </p>
          </div>
          <div class="mt-4 d-flex flex-wrap gap-3 small">
            <a routerLink="/auth/register" class="text-decoration-underline text-white fw-500">Back to Register</a>
            <a routerLink="/auth/login" class="text-decoration-underline text-white opacity-75">Login</a>
            <a routerLink="/auth/terms-of-service" class="text-decoration-underline text-white opacity-75"
              >Terms of Service</a
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .legal-scroll {
      max-height: min(65vh, 28rem);
      overflow-y: auto;
    }
  `,
})
export class PrivacyPolicy {}
