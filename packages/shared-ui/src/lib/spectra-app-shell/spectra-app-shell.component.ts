import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Full-height layout: sticky header row + scrollable main. Project header with class
 * `spectra-shell-header` and default content for the page body.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'spectra-app-shell',
  standalone: true,
  template: `
    <div class="spectra-app-shell">
      <header class="spectra-app-shell-bar">
        <ng-content select=".spectra-shell-header"></ng-content>
      </header>
      <main class="spectra-app-shell-body">
        <ng-content></ng-content>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }

    .spectra-app-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--spectra-color-surface);
    }

    .spectra-app-shell-bar {
      flex: 0 0 auto;
      min-height: var(--spectra-header-height);
      background: var(--spectra-color-navy);
      color: #e8edf4;
      box-shadow: var(--spectra-shadow-md);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .spectra-app-shell-body {
      flex: 1 1 auto;
      min-height: 0;
    }
  `,
})
export class SpectraAppShellComponent {}
