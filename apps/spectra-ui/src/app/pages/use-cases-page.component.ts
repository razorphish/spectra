import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'spectra-use-cases-page',
  template: `
    <div class="spectra-page">
      <h1>Use Cases</h1>
      <p class="lede">Placeholder page. Content will describe how organizations and developers use Spectra.</p>
    </div>
  `,
})
export class UseCasesPageComponent {}
