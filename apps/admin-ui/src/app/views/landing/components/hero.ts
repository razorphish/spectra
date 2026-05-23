import { Component } from '@angular/core';
import { BackgroundAnimationComponent } from '@app/components/background-animation';

@Component({
  selector: 'app-hero',
  imports: [BackgroundAnimationComponent],
  template: `
    <section class="hero-section position-relative overflow-hidden">
      <div class="container" style="position: relative; z-index: 1;">
        <div class="row align-items-center">
          <div class="col-sm-12 col-md-10 col-lg-8 col-xl-7 col-xxl-6">
            <h1 class="eye-catcher-text display-2 fw-700 mb-5 text-gradient text-center text-md-start"
                data-text="SmartAdmin v5 built with AI">
              SmartAdmin v5 built with AI
            </h1>
            <p class="lead fw-bold text-center text-md-start mb-4">
              The world's first Admin WebApp built with Artificial Intelligence — AI-ready by design, Bootstrap 5,
              and built for serious development.
            </p>
            <div class="d-flex gap-3 justify-content-center justify-content-md-start">
              <a href="#features" class="btn btn-primary btn-lg px-4 py-2">Get started</a>
              <a href="#demo" class="btn btn-outline-light btn-lg px-4 py-2">Learn more</a>
            </div>
          </div>
        </div>
      </div>
      <app-background-animation/>
    </section>
  `,
  styles: ``,
})
export class Hero {}
