import { Component } from '@angular/core';

@Component({
  selector: 'app-testimonial',
  imports: [],
  template: `
    <section class="testimonial-section">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="d-flex justify-content-center mb-3">
              <span class="fs-3">⭐⭐⭐⭐⭐</span>
            </div>
            <p class="lead mb-4">"SmartAdmin has transformed how we manage our business. The AI-powered insights have
              been game-changing for our decision-making process."</p>
            <div class="d-flex justify-content-center align-items-center gap-3">
              <img src="/assets/img/demo/avatars/avatar-a.png" alt="John Smith" class="rounded-circle" width="40">
              <span>John Smith, CEO at TechCorp</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: ``
})
export class Testimonial {

}
