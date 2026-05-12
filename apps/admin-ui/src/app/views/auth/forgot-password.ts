import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [
    RouterLink
  ],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-6">

        <div id="regular-login" class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 class="text-center mb-4">Forgot Password</h2>
          <p class="text-center text-white opacity-50 mb-4">Confirmation email will be sent to your email address</p>
          <form>
            <div class="mb-3">
              <label for="email" class="form-label">Email or Phone</label>
              <input type="email" class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25" id="email" required="">
            </div>
            <div class="text-end">
              <button type="button" id="switchToToken" class="btn btn-warning bg-opacity-50 border-dark btn-lg">
                Reset Password
              </button>
            </div>
          </form>
        </div>

        <div id="token-login" class="login-card d-none p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <div class="d-flex flex-column align-items-center justify-content-center gap-3">
            <h2 class="text-center mb-4">Sent Email</h2>
            <p class="text-center text-white mb-4">Please check your email for the reset password link</p>
            <div class="d-grid">
              <a routerLink="/auth/login" class="btn btn-dark bg-opacity-50 border-dark btn-lg">
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class ForgotPassword {

}
