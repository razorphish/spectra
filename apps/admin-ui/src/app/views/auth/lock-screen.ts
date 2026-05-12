import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-lock-screen',
  imports: [
    RouterLink
  ],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-4">

        <div class="login-card p-4 p-md-5 bg-dark bg-opacity-50 translucent-dark rounded-4 text-center">
          <div class="mb-4">
            <img src="/assets/img/demo/avatars/avatar-admin-xl.png" alt="User Avatar" class="rounded-circle border border-light border-opacity-25" width="72" height="72">
          </div>
          <h4 class="text-white mb-2">Welcome back, Sunny A.</h4>
          <p class="text-white opacity-50 mb-4">Enter your password or 2FA code to unlock your session</p>

          <form>
            <div class="mb-3 text-start">
              <label for="password" class="form-label">Password</label>
              <input type="password" class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25" id="password" placeholder="••••••••" required>
            </div>

            <div class="text-white opacity-50 my-2">OR</div>

            <div class="mb-3 text-start">
              <label for="otp" class="form-label">Authentication Code</label>
              <input type="text" class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25 text-center" id="otp" placeholder="123456" maxlength="6">
            </div>

            <div class="mb-3 d-grid">
              <button type="submit" class="btn btn-primary btn-lg bg-primary bg-opacity-75">Unlock</button>
            </div>

            <div class="opacity-75">
              Not you? <a routerLink="/auth/login" class="text-decoration-underline text-white fw-500">Switch Account</a>
            </div>
          </form>
        </div>

      </div>
    </div>
  `,
  styles: ``
})
export class LockScreen {

}
