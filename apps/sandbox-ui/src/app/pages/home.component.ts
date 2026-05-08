import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'sandbox-home',
  template: `
    <main class="wrap">
      <h1>Developer portal</h1>
      <p>Authenticated sandbox: apps, OAuth credentials, scope requests, Try API.</p>
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
