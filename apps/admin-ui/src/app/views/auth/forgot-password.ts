import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Accepts common phone shapes; requires 10–15 digits. */
function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[\d\s\-+().]+$/.test(trimmed)) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/** Treats whitespace-only as empty (unlike `Validators.required` on the raw value). */
function trimmedRequired(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    return v ? null : { required: true };
  };
}

function emailOrPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (!raw) {
      return null;
    }
    if (isValidEmail(raw) || isValidPhone(raw)) {
      return null;
    }
    return { emailOrPhone: true };
  };
}

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="row justify-content-center">
      <div class="col-11 col-md-8 col-lg-6 col-xl-6">
        @if (!showSentEmail()) {
          <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
            <h2 class="text-center mb-4">Forgot Password</h2>
            <p class="text-center text-white opacity-50 mb-4">
              Confirmation email will be sent to your email address
            </p>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="mb-3">
                <label for="forgot-email-or-phone" class="form-label">Email or Phone</label>
                <input
                  id="forgot-email-or-phone"
                  type="text"
                  autocomplete="username"
                  formControlName="emailOrPhone"
                  class="form-control form-control-lg text-white bg-dark border-light border-opacity-25 bg-opacity-25"
                  [class.is-invalid]="emailOrPhone.invalid && emailOrPhoneShowErrors()"
                />
                @if (emailOrPhone.errors?.['required'] && emailOrPhoneShowErrors()) {
                  <div class="invalid-feedback d-block">Enter your email address or phone number.</div>
                }
                @if (emailOrPhone.errors?.['emailOrPhone'] && emailOrPhoneShowErrors()) {
                  <div class="invalid-feedback d-block">
                    Enter a valid email address or a phone number with at least 10 digits.
                  </div>
                }
              </div>
              <div class="text-end">
                <button type="submit" class="btn btn-warning bg-opacity-50 border-dark btn-lg">Reset Password</button>
              </div>
            </form>
          </div>
        } @else {
          <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
            <div class="d-flex flex-column align-items-center justify-content-center gap-3">
              <h2 class="text-center mb-4">Sent Email</h2>
              <p class="text-center text-white mb-4">Please check your email for the reset password link</p>
              <div class="d-grid">
                <a routerLink="/auth/login" class="btn btn-dark bg-opacity-50 border-dark btn-lg">Back to Login</a>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: ``,
})
export class ForgotPassword {
  readonly showSentEmail = signal(false);
  private readonly submitAttempted = signal(false);

  readonly form = new FormGroup({
    emailOrPhone: new FormControl('', {
      nonNullable: true,
      validators: [trimmedRequired(), emailOrPhoneValidator()],
    }),
  });

  get emailOrPhone(): FormControl<string> {
    return this.form.controls.emailOrPhone;
  }

  emailOrPhoneShowErrors(): boolean {
    const c = this.emailOrPhone;
    return c.invalid && (c.touched || c.dirty || this.submitAttempted());
  }

  onSubmit(): void {
    this.submitAttempted.set(true);
    this.emailOrPhone.markAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.showSentEmail.set(true);
  }
}
