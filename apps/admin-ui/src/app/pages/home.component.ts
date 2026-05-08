import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'admin-home',
  template: `
    <main class="wrap">
      <h1>Admin</h1>
      <p>Internal operations: approvals, migrations, RBAC-gated settings.</p>
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
