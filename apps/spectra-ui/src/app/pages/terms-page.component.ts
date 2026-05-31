import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-terms-page',
  template: `
    <div class="spectra-page">
      <h1>API Terms of Service</h1>
      <p class="lede">
        Placeholder terms for the Spectra public API and developer sandbox. Replace with
        finalized legal copy before production launch.
      </p>
      <p>
        By registering sandbox applications and using API credentials, you agree to use the
        APIs only as permitted, to protect client secrets, and to comply with applicable law
        and Spectra policies.
      </p>
    </div>
  `,
})
export class TermsPageComponent {}
