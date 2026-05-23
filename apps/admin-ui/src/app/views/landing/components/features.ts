import { Component } from '@angular/core';

@Component({
  selector: 'app-features',
  imports: [],
  template: `
    <section id="features" class="features-section">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="display-6 fw-700 mb-3">Powerful Features</h2>
          <p class="lead text-muted">Everything you need to manage your business efficiently</p>
        </div>

        <div class="row g-4">
          @for ( feature of features; track $index) {
          <div class="col-md-6 col-lg-4">
            <div class="feature-card">
              <div class="feature-image mb-4">
                <img
                  [src]="feature.image"
                  [alt]="feature.title"
                  class="img-fluid rounded-4"
                />
              </div>
              <h3 class="h4 fw-700 mb-3">{{ feature.title }}</h3>
              <p class="text-muted">{{ feature.description }}</p>
            </div>
          </div>
          }
        </div>
      </div>
    </section>

  `,
  styles: ``
})
export class Features {
  features = [
    {
      image: 'assets/img/landing/1.png',
      title: 'Smart Dashboard',
      description: 'Intuitive interface with real-time analytics and customizable widgets.'
    },
    {
      image: 'assets/img/landing/2.png',
      title: 'Advanced Analytics',
      description: 'Comprehensive reporting tools with AI-powered insights.'
    },
    {
      image: 'assets/img/landing/3.png',
      title: 'Workflow Automation',
      description: 'Streamline processes with intelligent automation tools.'
    }
  ];
}
