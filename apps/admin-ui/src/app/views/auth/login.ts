import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-4">
        <div id="regular-login" class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 class="text-center mb-4">Login</h2>
          <p class="text-center text-white opacity-50 mb-4">Keep it all together and you'll be free</p>
          <form (submit)="$event.preventDefault(); signIn()">
            <div class="mb-3">
              <label for="email" class="form-label">Email or Phone</label>
              <input
                type="email"
                class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                id="email"
                required=""
              />
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <input
                  type="password"
                  class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                  id="password"
                  required=""
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
            <div class="d-grid mb-3">
              <button type="button" id="switchToToken" class="btn btn-dark bg-opacity-50 border-dark btn-lg">
                Login Using Token
              </button>
            </div>
          </form>
        </div>
        <div id="token-login" class="login-card d-none p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 class="text-center mb-4">Login</h2>
          <p class="text-center text-white opacity-50 mb-4">Keep it all together and you'll be free</p>
          <form>
            <div class="d-grid mb-3">
              <button
                type="submit"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#4285F4; --bs-btn-border-color:#4285F4; --bs-btn-color:#FFFFFF;
                            --bs-btn-hover-bg:#357ae8; --bs-btn-hover-border-color:#357ae8; --bs-btn-hover-color:#FFFFFF;
                            --bs-btn-active-bg:#3367d6; --bs-btn-active-border-color:#3367d6; --bs-btn-active-color:#FFFFFF;"
              >
                Sign In Using Google
              </button>
            </div>
            <div class="d-grid mb-3">
              <button
                type="submit"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#0078D4; --bs-btn-border-color:#0078D4; --bs-btn-color:#FFFFFF;
                            --bs-btn-hover-bg:#005A9E; --bs-btn-hover-border-color:#005A9E; --bs-btn-hover-color:#FFFFFF;
                            --bs-btn-active-bg:#004377; --bs-btn-active-border-color:#004377; --bs-btn-active-color:#FFFFFF;"
              >
                Sign In Using Microsoft
              </button>
            </div>
            <div class="d-grid mb-3">
              <button
                type="submit"
                class="btn btn-lg bg-opacity-75"
                style="--bs-btn-bg:#D1D1D6; --bs-btn-border-color:#D1D1D6; --bs-btn-color:#000000;
                            --bs-btn-hover-bg:#C7C7CC; --bs-btn-hover-border-color:#C7C7CC; --bs-btn-hover-color:#000000;
                            --bs-btn-active-bg:#BABAC0; --bs-btn-active-border-color:#BABAC0; --bs-btn-active-color:#000000;"
              >
                Sign In Using Apple
              </button>
            </div>
            <div class="divider small text-white opacity-25">or</div>

            <div class="d-grid mb-3">
              <button type="button" id="switchToRegular" class="btn btn-dark bg-opacity-50 border-dark btn-lg">
                Sign In Using Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class Login {
  private readonly auth = inject(AuthService, { optional: true });

  private readonly auth0Ready =
    environment.auth0.enabled &&
    !!environment.auth0.domain &&
    !!environment.auth0.clientId;

  signIn(): void {
    if (this.auth0Ready && this.auth) {
      void this.auth.loginWithRedirect();
      return;
    }
    console.debug(
      '[admin-ui] Auth0 disabled or not configured — add domain/clientId and set auth0.enabled to use Universal Login.',
    );
  }
}
