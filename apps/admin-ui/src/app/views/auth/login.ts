import { Component, inject, Injector, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { take } from 'rxjs';
import {
  isAuth0EnvIncomplete,
  isAuth0RuntimeConfigured,
} from '../../core/auth/auth0-env';
import { AdminSessionService } from '../../core/services/admin-session.service';

/** Default Auth0 database connection names; enable matching social connections in the Auth0 dashboard. */
const AUTH0_SOCIAL = {
  google: 'google-oauth2',
  microsoft: 'windowslive',
  apple: 'apple',
} as const;

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-4">
        <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 class="text-center mb-4">Login</h2>
          <p class="text-center text-white opacity-50 mb-4">Keep it all together and you'll be free</p>
          @if (auth0EnvIncomplete) {
            <div class="alert alert-warning small mb-4" role="alert">
              Auth0 is enabled in <code class="text-dark">apps/admin-ui/.env</code> but the SPA is not fully
              configured. Set <code class="text-dark">ADMIN_UI_AUTH0_CLIENT_ID</code> to your Auth0 SPA Client ID,
              run <code class="text-dark">nx run admin-ui:env-sync</code>, then restart the dev server. Until then,
              sign-in is blocked (dev email/password is disabled when Auth0 is requested).
            </div>
          }
          @if (auth0RuntimeConfigured) {
            <div class="d-grid mb-3">
              <button
                type="button"
                class="btn btn-primary btn-lg bg-primary bg-opacity-75"
                (click)="signInWithUniversalLogin()"
              >
                Continue with Auth0
              </button>
            </div>
            <p class="text-center small text-white opacity-75 mb-4">
              You will be redirected to Auth0 to sign in. Bookmarks can use
              <code class="text-white">/auth/login?auth0=1</code> to skip this screen.
            </p>
            <p class="text-center small text-white opacity-75 mb-4">
              Need an account?
              <a routerLink="/auth/register" [queryParams]="{ auth0: 'signup' }" class="text-white fw-500"
                >Create one with Auth0</a
              >
            </p>
            <div class="text-center mb-4">
              <a routerLink="/auth/forgot-password" class="text-decoration-none small text-white"
                >Forgot Password?</a
              >
            </div>
            <div class="divider small text-white opacity-25">or</div>
            <div class="d-grid gap-3 mt-3">
              <button
                type="button"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#4285F4; --bs-btn-border-color:#4285F4; --bs-btn-color:#FFFFFF;
                            --bs-btn-hover-bg:#357ae8; --bs-btn-hover-border-color:#357ae8; --bs-btn-hover-color:#FFFFFF;
                            --bs-btn-active-bg:#3367d6; --bs-btn-active-border-color:#3367d6; --bs-btn-active-color:#FFFFFF;"
                (click)="signInWithSocial(AUTH0_SOCIAL.google)"
              >
                Continue with Google
              </button>
              <button
                type="button"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#0078D4; --bs-btn-border-color:#0078D4; --bs-btn-color:#FFFFFF;
                            --bs-btn-hover-bg:#005A9E; --bs-btn-hover-border-color:#005A9E; --bs-btn-hover-color:#FFFFFF;
                            --bs-btn-active-bg:#004377; --bs-btn-active-border-color:#004377; --bs-btn-active-color:#FFFFFF;"
                (click)="signInWithSocial(AUTH0_SOCIAL.microsoft)"
              >
                Continue with Microsoft
              </button>
              <button
                type="button"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#D1D1D6; --bs-btn-border-color:#D1D1D6; --bs-btn-color:#000000;
                            --bs-btn-hover-bg:#C7C7CC; --bs-btn-hover-border-color:#C7C7CC; --bs-btn-hover-color:#000000;
                            --bs-btn-active-bg:#BABAC0; --bs-btn-active-border-color:#BABAC0; --bs-btn-active-color:#000000;"
                (click)="signInWithSocial(AUTH0_SOCIAL.apple)"
              >
                Continue with Apple
              </button>
            </div>
          }
          @if (!auth0RuntimeConfigured && !auth0EnvIncomplete) {
            <form [formGroup]="loginForm" (ngSubmit)="onEmailPasswordSubmit()">
              <div class="mb-3">
                <label for="email" class="form-label">Email or Phone</label>
                <input
                  type="email"
                  class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                  id="email"
                  formControlName="email"
                />
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <div class="input-group">
                  <input
                    type="password"
                    class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                    id="password"
                    formControlName="password"
                  />
                </div>
              </div>
              <div class="d-grid mb-3">
                <button type="submit" class="btn btn-primary btn-lg bg-primary bg-opacity-75">Sign In</button>
              </div>
              <div class="text-center mb-4">
                <a routerLink="/auth/forgot-password" class="text-decoration-none small text-white"
                  >Forgot Password?</a
                >
              </div>
              <div class="divider small text-white opacity-25">or</div>
              <p class="text-center small text-white opacity-50 mb-3 mt-3">
                Configure Auth0 in <code class="text-white">environment</code> to use social sign-in.
              </p>
              <div class="d-grid gap-3">
                <button type="button" class="btn btn-lg bg-opacity-75" disabled
                  style="--bs-btn-bg:#4285F4; --bs-btn-border-color:#4285F4; --bs-btn-color:#FFFFFF;">
                  Continue with Google
                </button>
                <button type="button" class="btn btn-lg bg-opacity-75" disabled
                  style="--bs-btn-bg:#0078D4; --bs-btn-border-color:#0078D4; --bs-btn-color:#FFFFFF;">
                  Continue with Microsoft
                </button>
                <button type="button" class="btn btn-lg bg-opacity-75" disabled
                  style="--bs-btn-bg:#D1D1D6; --bs-btn-border-color:#D1D1D6; --bs-btn-color:#000000;">
                  Continue with Apple
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class Login implements OnInit {
  /** Exposed for template — default Auth0 connection names for social IdPs. */
  readonly AUTH0_SOCIAL = AUTH0_SOCIAL;

  /** Universal Login + social buttons (Auth0 SDK registered). */
  readonly auth0RuntimeConfigured = isAuth0RuntimeConfigured();

  /** `ADMIN_UI_AUTH0_ENABLED` without domain + client id — block dev bypass. */
  readonly auth0EnvIncomplete = isAuth0EnvIncomplete();

  readonly loginForm = new FormGroup({
    email: new FormControl('admin@local.test', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('dev-password', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminSession = inject(AdminSessionService);
  /** Defer AuthService resolution: eager `inject(AuthService)` breaks without `provideAuth0` and can cycle with `Router`. */
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    if (this.auth0RuntimeConfigured) {
      void Promise.resolve().then(() => {
        const auth = this.injector.get(AuthService, null, { optional: true });
        auth?.isAuthenticated$.pipe(take(1)).subscribe((ok) => {
          if (ok) {
            void this.router.navigateByUrl('/dashboards/control-center', { replaceUrl: true });
            return;
          }
          if (this.route.snapshot.queryParamMap.get('auth0') === '1') {
            this.signInWithUniversalLogin();
          }
        });
      });
      return;
    }
    if (this.auth0EnvIncomplete) {
      return;
    }
    if (this.adminSession.isLoggedIn()) {
      void this.router.navigateByUrl('/dashboards/control-center', { replaceUrl: true });
    }
  }

  /** Email/password submit: pseudo-login when Auth0 is off; otherwise Universal Login. */
  onEmailPasswordSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    if (isAuth0EnvIncomplete()) {
      return;
    }
    if (!this.auth0RuntimeConfigured) {
      this.adminSession.setLoggedIn();
      void this.router.navigateByUrl('/dashboards/control-center');
    }
  }

  /** Universal Login (hosted Auth0 page) via SDK — use for buttons/links instead of raw authorize URLs. */
  signInWithUniversalLogin(): void {
    this.redirectToAuth0();
  }

  /** Universal Login restricted to a social connection (must exist on the Auth0 tenant). */
  signInWithSocial(connection: string): void {
    this.redirectToAuth0({ connection });
  }

  private redirectToAuth0(opts?: { connection?: string }): void {
    if (!this.auth0RuntimeConfigured) {
      console.debug(
        '[admin-ui] Auth0 disabled or not configured — add domain/clientId and set auth0.enabled to use Universal Login.',
      );
      return;
    }
    // Same pattern as `main-layout-auth.guard`: defer past sync router work so `AuthService`/`Router` do not circularly resolve during `Login` creation.
    void Promise.resolve().then(() => {
      const auth = this.injector.get(AuthService, null, { optional: true });
      if (!auth) {
        console.debug('[admin-ui] AuthService is not registered; enable Auth0 in environment and app.config.');
        return;
      }
      if (opts?.connection) {
        auth.loginWithRedirect({
          appState: { target: '/dashboards/control-center' },
          authorizationParams: { connection: opts.connection },
        }).subscribe({
          error: (e) => console.error('[admin-ui] Auth0 loginWithRedirect failed', e),
        });
        return;
      }
      auth.loginWithRedirect({
        appState: { target: '/dashboards/control-center' },
      }).subscribe({
        error: (e) => console.error('[admin-ui] Auth0 loginWithRedirect failed', e),
      });
    });
  }
}
