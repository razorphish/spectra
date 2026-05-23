import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-contact',
  imports: [
    RouterLink
  ],
  template: `
    <section id="contact" class="contact-section">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8 text-center">
            <h2 class="h1 fw-bold mb-3">Ready to Get Started?</h2>
            <p class="lead text-muted mb-4">Join thousands of businesses already using SmartAdmin to transform their
              workflow.</p>
            <div class="d-flex justify-content-center gap-3">
              <a [routerLink]="[]" class="btn btn-primary btn-lg px-4">Start Free Trial</a>
              <a [routerLink]="[]" class="btn btn-outline-dark btn-lg px-4">Contact Sales</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: ``
})
export class Contact {

}
