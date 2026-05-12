import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';
import {BackgroundAnimationComponent} from '@app/components/background-animation';

@Component({
  selector: 'app-error-500',
  imports: [
    RouterLink,
    BackgroundAnimationComponent
  ],
  template: `
    <section class="hero-section position-relative overflow-hidden">
      <div class="container" style="position: relative; z-index: 1;">
        <div class="row justify-content-center">
          <div class="col-11 col-md-8 col-lg-6 col-xl-4">

            <div class="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4 text-center">
              <h1 class="display-1 fw-bold text-white mb-3">5 0 0</h1>
              <h4 class="text-white mb-2">Internal Server Error</h4>
              <p class="text-white opacity-50 mb-4">
                Oops! Something went wrong on our end. Please try again later.
              </p>

              <div class="mb-4">
                <a routerLink="/" class="btn btn-primary me-2">Back to Home</a>
                <a routerLink="[]" class="btn btn-warning">Report Issue</a>
              </div>

              <div class="opacity-50 text-white small">
                We’re working to fix the problem. Thank you for your patience.
              </div>
            </div>

          </div>
        </div>
      </div>

      <app-background-animation/>
    </section>
  `,
  styles: ``
})
export class Error500 {

}
