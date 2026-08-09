import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { take } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { BffAuthService } from '../core/bff-auth.service';

type AccountUser = { sub?: string; email?: string; name?: string };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-account',
  imports: [RouterLink],
  template: `
    <main class="spectra-page sandbox-account">
      <h1>Account</h1>
      <p class="lede">Profile from your identity provider.</p>
      @if (user(); as u) {
        <section class="spectra-probe">
          <p class="meta"><span class="label">Email</span> {{ u.email }}</p>
          <p class="meta"><span class="label">Subject</span> {{ u.sub }}</p>
          @if (u.name) {
            <p class="meta"><span class="label">Name</span> {{ u.name }}</p>
          }
        </section>
      } @else {
        <p>Loading…</p>
      }
      <p><a routerLink="/dashboard">Back to dashboard</a></p>
    </main>
  `,
  styles: [
    `
      .sandbox-account {
        max-width: 42rem;
        padding-top: 1rem;
      }
    `,
  ],
})
export class AccountPageComponent {
  private readonly auth = inject(AuthService, { optional: true });
  private readonly bffAuth = inject(BffAuthService);
  protected readonly user = signal<AccountUser | null | undefined>(undefined);

  constructor() {
    if (environment.bffAuth) {
      this.bffAuth.loadMe().subscribe((u) => this.user.set(u ?? null));
      return;
    }
    this.auth?.user$.pipe(take(1)).subscribe((u) => this.user.set(u ?? null));
  }
}
