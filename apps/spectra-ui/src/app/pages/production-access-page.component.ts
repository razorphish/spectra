import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-production-access-page',
  template: `
    <div class="spectra-page">
      <h1>Production Access</h1>
      <p class="lede">Placeholder page. Content will cover onboarding and production credentials.</p>
    </div>
  `,
})
export class ProductionAccessPageComponent {}
