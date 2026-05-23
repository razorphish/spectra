import { Component } from '@angular/core';
import {NgIcon} from '@ng-icons/core';

type TimelineItem ={
  year: number;
  title: string;
  description: string;
}

@Component({
  selector: 'app-journey',
  imports: [
    NgIcon
  ],
  template: `
    <section class="journey-section">
      <div class="container">
        <div class="row mb-5">

          <div class="col-lg-6 pt-5">
            <span class="text-primary small text-uppercase fw-bold mb-2 d-block">Innovation</span>
            <h2 class="h1 fw-bold mb-3">Our Journey and Future Vision</h2>
            <p class="text-muted mb-4">
              Explore the timeline of SmartAdmin WebApp's evolution. Witness our milestones and future aspirations.
            </p>

            <div class="d-flex gap-3">
              <a href="#features" class="btn btn-outline-dark">
                Learn More
              </a>
              <a href="#contact" class="btn btn-link text-dark text-decoration-none d-flex align-items-center">
                Contact Us
                <ng-icon name="faSolidArrowRight" class="ms-2"></ng-icon>
              </a>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="timeline">
              @for (item of timelineData; track $index) {
                <div  class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3 class="h2 fw-bold">{{ item.year }}</h3>
                    <h4 class="h5 fw-bold">{{ item.title }}</h4>
                    <p class="text-muted">{{ item.description }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>
      </div>
    </section>

  `,
  styles: ``
})
export class Journey {
  timelineData: TimelineItem[] = [
    {
      year: 2021,
      title: 'Launch Phase',
      description: 'SmartAdmin WebApp was officially launched. It revolutionized the way users manage their tasks.'
    },
    {
      year: 2022,
      title: 'Feature Expansion',
      description: 'New features were added based on user feedback. Enhanced functionality led to increased user satisfaction.'
    },
    {
      year: 2023,
      title: 'Global Reach',
      description: 'SmartAdmin WebApp expanded its user base globally. We are committed to continuous improvement and innovation.'
    },
    {
      year: 2024,
      title: 'Future Innovations',
      description: 'We are excited to unveil new features and enhancements. Join us as we shape the future of productivity.'
    }
  ];
}
