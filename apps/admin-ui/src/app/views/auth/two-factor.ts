import { Component } from '@angular/core';

@Component({
  selector: 'app-two-factor',
  imports: [],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-4">

        <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 class="text-center mb-4">Two-Factor Authentication</h2>
          <p class="text-center text-white opacity-50 mb-4">
            Enter the 6-digit code sent to your email or phone
          </p>
          <form>
            <div class="mb-4">
              <label for="otp" class="form-label">Authentication Code</label>
              <input type="text" class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25 text-center" id="otp" placeholder="123456" maxlength="6" required>
            </div>
            <div class="mb-3 d-grid">
              <button type="submit" class="btn btn-primary btn-lg bg-primary bg-opacity-75">Verify</button>
            </div>
            <div class="text-center opacity-75">
              Didn't receive a code? <a href="#!" class="text-decoration-underline text-white fw-500">Resend</a>
            </div>
          </form>
        </div>


      </div>
    </div>
  `,
  styles: ``
})
export class TwoFactor {

}
