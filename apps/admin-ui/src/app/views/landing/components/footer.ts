import {Component} from '@angular/core';
import {appName, currentYear} from '@/app/constants';
import {RouterLink} from '@angular/router';
import {NgIcon} from '@ng-icons/core';

type FooterLink = {
  label: string;
  url?: string;
}

type FooterLinkType ={
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    NgIcon
  ],
  template: `
    <footer class="footer py-5">
      <div class="container">

        <div class="row mb-5">
          <div class="col-auto">
            <img src="/assets/img/logo.svg" alt="Logo" class="mb-4" style="height: 32px;" />
          </div>
        </div>

        <div class="row g-4">
          @for ( section of footerSections; track $index) {
          <div class="col-6 col-md">
            <h6 class="fw-bold mb-3">{{ section.title }}</h6>
            <ul class="footer-links list-unstyled">
              @for ( link of section.links; track $index) {
              <li>
                <a [href]="link.url || '#'" class="text-decoration-none">
                  {{ link.label }}
                </a>
              </li>
              }
            </ul>
          </div>
          }
        </div>

        <hr class="my-4" />

        <div class="row align-items-center">
          <div class="col-md-6">
            <div class="d-flex align-items-center flex-wrap">
              <small class="text-muted">
                © {{ currentYear }} {{ appName }}. All rights reserved.
              </small>
              <div class="ms-4 d-flex flex-wrap">
                <a [routerLink]="[]" class="text-muted text-decoration-none small me-3">Privacy Policy</a>
                <a [routerLink]="[]" class="text-muted text-decoration-none small me-3">Terms of Service</a>
                <a [routerLink]="[]" class="text-muted text-decoration-none small">Cookie Settings</a>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="d-flex justify-content-md-end align-items-center gap-3">
              <a href="#" class="text-muted"><ng-icon name="faSolidFacebook"/></a>
              <a href="#" class="text-muted"><ng-icon name="faSolidInstagram"/></a>
              <a href="#" class="text-muted"><ng-icon name="faSolidTwitter"/></a>
              <a href="#" class="text-muted"><ng-icon name="faSolidLinkedin"/></a>
              <a href="#" class="text-muted"><ng-icon name="faSolidYoutube"/></a>
            </div>
          </div>
        </div>

      </div>
    </footer>

  `,
  styles: ``
})
export class Footer {
  footerSections: FooterLinkType[] = [
    {
      title: 'Quick Links',
      links: [
        {label: 'About Us'},
        {label: 'Contact Support'},
        {label: 'FAQs'},
        {label: 'Blog Posts'},
        {label: 'User Guides'}
      ]
    },
    {
      title: 'Resources',
      links: [
        {label: 'Community Forum'},
        {label: 'Support Center'},
        {label: 'System Status'},
        {label: 'Feedback'},
        {label: 'Careers'}
      ]
    },
    {
      title: 'Stay Connected',
      links: [
        {label: 'Social Media'},
        {label: 'Newsletter'},
        {label: 'Events'},
        {label: 'Webinars'},
        {label: 'Podcasts'}
      ]
    },
    {
      title: 'Legal Info',
      links: [
        {label: 'Privacy Notice'},
        {label: 'User Agreement'},
        {label: 'Cookie Policy'},
        {label: 'Terms & Conditions'},
        {label: 'Help Center'}
      ]
    },
    {
      title: 'Stay Updated',
      links: [
        {label: 'Follow Us Online'},
        {label: 'Join Our Community'},
        {label: 'Get Involved'},
        {label: 'Share Your Thoughts'},
        {label: 'Explore Our Blog'}
      ]
    }
  ];
  protected readonly currentYear = currentYear;
  protected readonly appName = appName;
}
