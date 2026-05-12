import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [
    RouterLink
  ],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-4">

        <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 class="text-center mb-4">Register</h2>
          <p class="text-center text-white opacity-50 mb-4">Keep it all together and you'll be free</p>
          <form>
            <div class="mb-3">
              <label for="email" class="form-label">Email or Phone</label>
              <input type="email"
                     class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                     id="email" required="">
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <input type="password"
                       class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                       id="password" required="">
              </div>
            </div>
            <div class="mb-3">
              <label for="password-confirm" class="form-label">Confirm Password</label>
              <div class="input-group">
                <input type="password"
                       class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                       id="password-confirm" required="">
              </div>
            </div>
            <div class="mb-3">
              <div class="form-check">
                <input class="form-check-input bg-dark border-light border-opacity-25 bg-opacity-25" type="checkbox"
                       id="terms" required="">
                <label class="form-check-label" for="terms">I agree to the <a [routerLink]="[]"
                                                                              class="text-decoration-underline text-white fw-500">Terms
                  of Service</a> and <a [routerLink]="[]" class="text-decoration-underline text-white fw-500">Privacy Policy</a></label>
              </div>
            </div>
            <div class="mb-3 d-grid">
              <button type="submit" class="btn btn-primary btn-lg bg-primary bg-opacity-75">Register</button>
            </div>
            <div class="opacity-75">
              Already have an account? <a routerLink="/auth/login" class="text-decoration-underline text-white fw-500">Login
              here</a>
            </div>

          </form>
        </div>

      </div>
    </div>
  `,
  styles: ``
})
export class Register {

}
