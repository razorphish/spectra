import { Component } from '@angular/core';
import {contacts} from '@/app/views/user-profile/data';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-contact',
  imports: [
    RouterLink
  ],
  template: `
    <div class="row">
      <div class="col-lg-8">
        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>My Contacts</h2>
            <div class="panel-toolbar">
              <div class="input-group mt-3">
                <input type="text" class="form-control form-control-sm" placeholder="Search contacts...">
                <button type="button" class="btn btn-outline-default btn-sm">
                  <svg class="sa-icon">
                    <use href="/assets/icons/sprite.svg#search"></use>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="d-flex flex-column gap-4">
                <div class="d-flex gap-2 border-bottom pb-3">
                  <button type="button" class="btn btn-sm btn-light waves-effect active">All</button>
                  <button type="button" class="btn btn-sm btn-light waves-effect">Favorites</button>
                  <button type="button" class="btn btn-sm btn-light waves-effect">Recent</button>
                </div>

                <div class="list-group">
                  @for (contact of contacts; track $index) {
                    <div class="list-group-item list-group-item-action d-flex align-items-center gap-3">
                      <img [src]="contact.avatar" class="rounded-circle" width="48" height="48"
                           alt="Sarah Johnson">
                      <div class="flex-grow-1">
                        <h6 class="mb-0">{{ contact.name }}</h6>
                        <small class="text-muted">{{ contact.role }}</small>
                      </div>
                      <div class="d-flex gap-2">
                        <button type="button" class="btn btn-icon btn-light waves-effect">
                          <svg class="sa-icon">
                            <use href="/assets/icons/sprite.svg#message-square"></use>
                          </svg>
                        </button>
                        <button type="button" class="btn btn-icon btn-light waves-effect">
                          <svg class="sa-icon">
                            <use href="/assets/icons/sprite.svg#star"></use>
                          </svg>
                        </button>
                        <button type="button" class="btn btn-icon btn-light waves-effect">
                          <svg class="sa-icon">
                            <use href="/assets/icons/sprite.svg#more-vertical"></use>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>Contact Information</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="d-flex flex-column gap-4">
                <div>
                  <h6 class="mb-2">Email</h6>
                  <div class="d-flex align-items-center">
                    <svg class="sa-icon me-2">
                      <use href="/assets/icons/sprite.svg#mail"></use>
                    </svg>
                    john.doe&commat;example.com
                  </div>
                </div>
                <div>
                  <h6 class="mb-2">Phone</h6>
                  <div class="d-flex align-items-center">
                    <svg class="sa-icon me-2">
                      <use href="/assets/icons/sprite.svg#phone"></use>
                    </svg>
                    +1 (555) 123-4567
                  </div>
                </div>
                <div>
                  <h6 class="mb-2">Location</h6>
                  <div class="d-flex align-items-center">
                    <svg class="sa-icon me-2">
                      <use href="/assets/icons/sprite.svg#map-pin"></use>
                    </svg>
                    San Francisco, CA
                  </div>
                </div>
                <div>
                  <h6 class="mb-2">Social Media</h6>
                  <div class="d-flex gap-2">
                    <a [routerLink]="[]" class="btn btn-icon btn-light waves-effect">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#linkedin"></use>
                      </svg>
                    </a>
                    <a [routerLink]="[]" class="btn btn-icon btn-light waves-effect">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#github"></use>
                      </svg>
                    </a>
                    <a [routerLink]="[]" class="btn btn-icon btn-light waves-effect">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#twitter"></use>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>Office Hours</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="d-flex flex-column gap-2">
                <div class="d-flex justify-content-between">
                  <span>Monday - Friday</span>
                  <span>9:00 AM - 5:00 PM</span>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Saturday</span>
                  <span>10:00 AM - 2:00 PM</span>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Sunday</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class Contact {

  protected readonly contacts = contacts;
}
