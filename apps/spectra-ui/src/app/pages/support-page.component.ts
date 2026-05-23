import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-support-page',
  template: `
    <div class="spectra-page">
      <h1>Support</h1>
      <p class="lede">Placeholder page. Content will list support channels and SLAs.</p>
    </div>
  `,
})
export class SupportPageComponent {}
