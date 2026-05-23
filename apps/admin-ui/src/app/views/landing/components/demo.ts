import { Component } from '@angular/core';

@Component({
  selector: 'app-demo',
  imports: [],
  template: `
    <section id="demo" class="demo-section">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="display-6 fw-700 mb-3">See It In Action</h2>
          <p class="lead text-muted">Experience the power of SmartAdmin firsthand</p>
        </div>
        <div class="row">
          <div class="col-lg-8 mx-auto">
            <div class="demo-window">
              <div class="demo-window-content">
                <img src="/assets/img/landing/4.png" alt="Dashboard Preview" class="img-fluid">
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: ``
})
export class Demo {

}
