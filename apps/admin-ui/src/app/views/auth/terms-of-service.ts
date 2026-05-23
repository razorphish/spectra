import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-of-service',
  imports: [RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-lg-10 col-xl-8">
        <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h1 class="h3 text-white mb-2">Terms of Service</h1>
          <p class="text-white opacity-50 small mb-4">Spectra Admin — last updated May 12, 2026</p>
          <div
            class="text-white opacity-90 small legal-scroll pe-1"
            tabindex="0"
          >
            <h2 class="h6 text-white mt-0">1. Agreement</h2>
            <p>
              By accessing or using Spectra services and this administrative interface, you agree to be bound by these
              Terms of Service. If you do not agree, do not use the service.
            </p>
            <h2 class="h6 text-white">2. Accounts</h2>
            <p>
              You are responsible for safeguarding credentials used to access Spectra. You agree to notify your
              organization’s administrator promptly of any unauthorized use.
            </p>
            <h2 class="h6 text-white">3. Acceptable use</h2>
            <p>
              You will not misuse Spectra, including probing, scanning, or testing the vulnerability of any system
              without authorization, or interfering with other users’ access.
            </p>
            <h2 class="h6 text-white">4. Changes</h2>
            <p>
              We may update these terms from time to time. Continued use after changes constitutes acceptance of the
              revised terms.
            </p>
            <h2 class="h6 text-white">5. Contact</h2>
            <p class="mb-0">
              For questions about these terms, contact your Spectra account administrator or the team that manages this
              deployment.
            </p>
          </div>
          <div class="mt-4 d-flex flex-wrap gap-3 small">
            <a routerLink="/auth/register" class="text-decoration-underline text-white fw-500">Back to Register</a>
            <a routerLink="/auth/login" class="text-decoration-underline text-white opacity-75">Login</a>
            <a routerLink="/auth/privacy-policy" class="text-decoration-underline text-white opacity-75"
              >Privacy Policy</a
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
export class TermsOfService {}
