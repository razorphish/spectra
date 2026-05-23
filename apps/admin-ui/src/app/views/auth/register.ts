import { Component, inject, Injector, OnInit } from '@angular/core';
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
  selector: 'app-register',
  imports: [RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-4">
        <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 class="text-center mb-4">Register</h2>
          <p class="text-center text-white opacity-50 mb-4">Keep it all together and you'll be free</p>
          @if (auth0EnvIncomplete) {
            <div class="alert alert-warning small mb-4" role="alert">
              Auth0 is enabled in <code class="text-dark">apps/admin-ui/.env</code> but the SPA is not fully
              configured. Set <code class="text-dark">ADMIN_UI_AUTH0_CLIENT_ID</code> to your Auth0 SPA Client ID,
              run <code class="text-dark">nx run admin-ui:env-sync</code>, then restart the dev server.
            </div>
          }
          @if (auth0RuntimeConfigured) {
            <div class="d-grid mb-3">
              <button
                type="button"
                class="btn btn-primary btn-lg bg-primary bg-opacity-75"
                (click)="signUpWithUniversalLogin()"
              >
                Create account with Auth0
              </button>
            </div>
            <p class="text-center small text-white opacity-75 mb-4">
              You will be redirected to Auth0 to sign up. Bookmarks can use
              <code class="text-white">/auth/register?auth0=signup</code> to skip this screen.
            </p>
            <p class="text-center small text-white opacity-75 mb-4">
              Already have an account?
              <a routerLink="/auth/login" [queryParams]="{ auth0: '1' }" class="text-white">Sign in</a>
            </p>
            <div class="divider small text-white opacity-25">or</div>
            <div class="d-grid gap-3 mt-3">
              <button
                type="button"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#4285F4; --bs-btn-border-color:#4285F4; --bs-btn-color:#FFFFFF;
                            --bs-btn-hover-bg:#357ae8; --bs-btn-hover-border-color:#357ae8; --bs-btn-hover-color:#FFFFFF;
                            --bs-btn-active-bg:#3367d6; --bs-btn-active-border-color:#3367d6; --bs-btn-active-color:#FFFFFF;"
                (click)="signUpWithSocial(AUTH0_SOCIAL.google)"
              >
                Sign up with Google
              </button>
              <button
                type="button"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#0078D4; --bs-btn-border-color:#0078D4; --bs-btn-color:#FFFFFF;
                            --bs-btn-hover-bg:#005A9E; --bs-btn-hover-border-color:#005A9E; --bs-btn-hover-color:#FFFFFF;
                            --bs-btn-active-bg:#004377; --bs-btn-active-border-color:#004377; --bs-btn-active-color:#FFFFFF;"
                (click)="signUpWithSocial(AUTH0_SOCIAL.microsoft)"
              >
                Sign up with Microsoft
              </button>
              <button
                type="button"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#D1D1D6; --bs-btn-border-color:#D1D1D6; --bs-btn-color:#000000;
                            --bs-btn-hover-bg:#C7C7CC; --bs-btn-hover-border-color:#C7C7CC; --bs-btn-hover-color:#000000;
                            --bs-btn-active-bg:#BABAC0; --bs-btn-active-border-color:#BABAC0; --bs-btn-active-color:#000000;"
                (click)="signUpWithSocial(AUTH0_SOCIAL.apple)"
              >
                Sign up with Apple
              </button>
            </div>
            <p class="text-center small text-white opacity-50 mt-4 mb-0">
              <a routerLink="/auth/terms-of-service" class="text-decoration-underline text-white">Terms</a>
              ·
              <a routerLink="/auth/privacy-policy" class="text-decoration-underline text-white">Privacy</a>
            </p>
          }
          @if (!auth0RuntimeConfigured && !auth0EnvIncomplete) {
            <div class="alert alert-info small mb-4" role="status">
              Auth0 is off in this build. This form is a <strong>non-functional</strong> placeholder for local UI
              only. Enable Auth0 in <code class="text-dark">apps/admin-ui/.env</code> for real sign-up.
            </div>
            <form>
              <div class="mb-3">
                <label for="reg-email" class="form-label">Email or Phone</label>
                <input
                  type="email"
                  class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                  id="reg-email"
                  disabled
                />
              </div>
              <div class="mb-3">
                <label for="reg-password" class="form-label">Password</label>
                <input
                  type="password"
                  class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                  id="reg-password"
                  disabled
                />
              </div>
              <div class="mb-3 d-grid">
                <button type="button" class="btn btn-secondary btn-lg" disabled>Register (disabled)</button>
              </div>
              <div class="opacity-75">
                Already have an account?
                <a routerLink="/auth/login" class="text-decoration-underline text-white fw-500">Login here</a>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class Register implements OnInit {
  readonly AUTH0_SOCIAL = AUTH0_SOCIAL;
  readonly auth0RuntimeConfigured = isAuth0RuntimeConfigured();
  readonly auth0EnvIncomplete = isAuth0EnvIncomplete();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminSession = inject(AdminSessionService);
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
          if (this.route.snapshot.queryParamMap.get('auth0') === 'signup') {
            this.signUpWithUniversalLogin();
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

  signUpWithUniversalLogin(): void {
    this.redirectToAuth0SignUp();
  }

  signUpWithSocial(connection: string): void {
    this.redirectToAuth0SignUp({ connection });
  }

  private redirectToAuth0SignUp(opts?: { connection?: string }): void {
    if (!this.auth0RuntimeConfigured) {
      return;
    }
    void Promise.resolve().then(() => {
      const auth = this.injector.get(AuthService, null, { optional: true });
      if (!auth) {
        return;
      }
      const authorizationParams: Record<string, string> = { screen_hint: 'signup' };
      if (opts?.connection) {
        authorizationParams['connection'] = opts.connection;
      }
      void auth.loginWithRedirect({
        appState: { target: '/dashboards/control-center' },
        authorizationParams,
      });
    });
  }
}
