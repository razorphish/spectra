import { Component } from '@angular/core';

@Component({
  selector: 'app-newsletter',
  imports: [],
  template: `
    <section class="newsletter-section">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-6">
            <h2 class="h1 fw-bold mb-3">Stay Updated with SmartAdmin</h2>
            <p class="text-muted mb-4">Join our newsletter for exclusive updates, helpful tips, and the latest news from SmartAdmin.</p>
            <form class="newsletter-form">
              <div class="d-flex flex-shrink mb-2">
                <input type="email" class="form-control" placeholder="Your Email Here" required>
                <button type="submit" class="btn btn-dark flex-shrink-0 px-4">Subscribe Now</button>
              </div>
              <small class="text-muted">By clicking Subscribe Now, you agree to our <a href="#" class="text-decoration-none">Terms and Conditions</a>.</small>
            </form>
          </div>

          <div class="col-lg-4 offset-lg-2">
            <img src="/assets/img/landing/5.png" alt="Newsletter" class="img-fluid rounded-4">
          </div>
        </div>
      </div>
    </section>
  `,
  styles: ``
})
export class Newsletter {

}
