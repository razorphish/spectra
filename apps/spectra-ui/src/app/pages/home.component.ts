import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'spectra-home',
  template: `
    <main class="wrap">
      <h1>Spectra</h1>
      <p>Public docs, marketing, and developer discovery (Blue Button–style IA).</p>
    </main>
  `,
  styles: [
    `
      .wrap {
        font-family: system-ui, sans-serif;
        max-width: 42rem;
        margin: 3rem auto;
        padding: 0 1rem;
      }
    `,
  ],
})
export class HomeComponent {}
