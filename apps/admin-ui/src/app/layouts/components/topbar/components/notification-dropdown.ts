import { Component } from '@angular/core';
import {notifications} from '@layouts/components/topbar/components/data';
import {NgbDropdownModule, NgbNavModule} from '@ng-bootstrap/ng-bootstrap';
import {SimplebarAngularModule} from 'simplebar-angular';

@Component({
  selector: 'app-notification-dropdown',
  imports: [NgbNavModule, NgbDropdownModule, SimplebarAngularModule],
  template: `
    <div ngbDropdown class="d-inline-block">
      <button
        data-bs-toggle="dropdown"
        ngbDropdownToggle
        class="btn btn-system no-arrow"
        aria-label="Open Notifications"
      >
        <span class="badge badge-icon pos-top pos-end">{{ allNotifications.length }}</span>
        <svg class="sa-icon sa-icon-2x">
          <use href="/assets/icons/sprite.svg#bell"></use>
        </svg>
      </button>

      <div ngbDropdownMenu class="dropdown-menu-animated dropdown-xl dropdown-menu-end p-0">
        <div class="notification-header rounded-top mb-2">
          <h4 class="m-0">
            {{ allNotifications.length }} New <small class="mb-0 opacity-80">User Notifications</small>
          </h4>
        </div>

        <ul ngbNav #nav="ngbNav" [(activeId)]="activeTab" class="nav nav-tabs nav-tabs-clean" role="tablist">
          <li [ngbNavItem]="0">
            <ng-template ngbNavContent>
              <div class="d-flex h-100">
                <div class="px-4 d-flex flex-column align-items-center justify-content-center">

                  <svg class="sa-icon sa-icon-5x sa-icon-primary">
                    <use href="/assets/icons/sprite.svg#arrow-up-circle"></use>
                  </svg>
                  <span class="text-center fw-300" style="font-size: 1.25rem;">
                        Select a tab above
                    </span>
                  <div class="mb-0 py-3 text-center fs-md fw-300 text-muted">
                    This blank page helps protect your privacy.
                    To change this default message, <a href="#">update your settings</a>.
                  </div>
                </div>
              </div>
            </ng-template>
          </li>

          <li [ngbNavItem]="1">
            <a ngbNavLink class="px-4 fs-md fw-500">Messages</a>
            <ng-template ngbNavContent>
              <ngx-simplebar style="height: 100%">
                <ul class="notification">
                  @for (item of allNotifications; track $index) {
                    <li
                      class="alert alert-dismissable"
                      [class.unread]="item.unread"
                    >
                      <div class="d-flex align-items-center">
                    <span class="status me-2" [class]="'status-' + item.statusVariant">
                                <span class="profile-image rounded-circle d-inline-block"
                                      [style.backgroundImage]="'url(' + item.avatar + ')'"></span>
                    </span>
                        <span class="d-flex flex-column flex-1 ms-1">
                                <span class="name">{{ item.name }}</span>
                                <span class="msg-a fs-sm">{{ item.description }}</span>
                                <span class="fs-nano text-muted mt-1">{{ item.time }}</span>
                        </span>
                      </div>
                      <button type="button" class="btn-close" (click)="removeNotification($index)"
                              aria-label="Close" data-bs-dismiss="alert"></button>
                    </li>
                  }
                </ul>

                @if (allNotifications.length === 0) {
                  <div class="notification-empty-msg my-6 pt-6 text-center">
                    <svg class="sa-icon sa-icon-5x sa-icon-primary">
                      <use href="/assets/icons/sprite.svg#coffee"></use>
                    </svg>
                    <span>No new messages</span>
                  </div>
                }
              </ngx-simplebar>
            </ng-template>
          </li>

          <li [ngbNavItem]="2">
            <a ngbNavLink class="px-4 fs-md fw-500">Feeds</a>
            <ng-template ngbNavContent>
              <ngx-simplebar style="height: 100%">
                <ul class="notification">
                  <li class="unread alert alert-dismissable">
                    <div class="d-flex align-items-center show-child-on-hover">
                            <span class="d-flex flex-column flex-1">
                                <span class="name d-flex align-items-center">Administrator <span
                                  class="badge bg-success fw-n ms-1">UPDATE</span></span>
                                <span class="msg-a fs-sm">
                                    System updated to version <strong>5.0</strong> <a href="buildnotes.html">(build notes)</a>
                                </span>
                                <span class="fs-nano text-muted mt-1">5 mins ago</span>
                            </span>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </li>
                  <li class="alert alert-dismissable">
                    <div class="d-flex align-items-center show-child-on-hover">
                      <div class="d-flex flex-column flex-1">
                                <span class="name">
                                    Adison Lee <span class="fw-300 d-inline">replied to your video <a href="#"
                                                                                                      class="fw-400"> Cancer Drug</a> </span>
                                </span>
                        <span class="msg-a fs-sm mt-2">Bring to the table win-win survival strategies to ensure proactive domination. At the end of the day...</span>
                        <span class="fs-nano text-muted mt-1">10 minutes ago</span>
                      </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </li>
                  <li class="alert alert-dismissable">
                    <div class="d-flex align-items-center show-child-on-hover">
                      <div class="d-flex flex-column flex-1">
                                <span class="name">
                                    Troy Norman'<span class="fw-300">s new connections</span>
                                </span>
                        <div class="fs-sm d-flex align-items-center mt-2">
                          <span class="profile-image-md ms-1 rounded-circle d-inline-block"
                                [style.background-image]="'url(/assets/img/demo/avatars/avatar-a.png)'"
                                style="background-size: cover;"></span>
                          <span class="profile-image-md ms-1 rounded-circle d-inline-block"
                                [style.background-image]="'url(/assets/img/demo/avatars/avatar-b.png)'"
                                style=" background-size: cover;"></span>
                          <span class="profile-image-md ms-1 rounded-circle d-inline-block"
                                [style.background-image]="'url(/assets/img/demo/avatars/avatar-c.png)'"
                                style="background-size: cover;"></span>
                          <span class="profile-image-md ms-1 rounded-circle d-inline-block"
                                [style.background-image]="'url(/assets/img/demo/avatars/avatar-e.png)'"
                                style="background-size: cover;"></span>
                          <div data-hasmore="+3" class="rounded-circle profile-image-md ms-1">
                            <span class="profile-image-md ms-1 rounded-circle d-inline-block"
                                  [style.background-image]="'url(/assets/img/demo/avatars/avatar-h.png)'"
                                  style="background-size: cover;"></span>
                          </div>
                        </div>
                        <span class="fs-nano text-muted mt-1">55 minutes ago</span>
                      </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </li>
                  <li class="alert alert-dismissable">
                    <div class="d-flex align-items-center show-child-on-hover">
                      <div class="d-flex flex-column flex-1">
                        <span class="name">Dr John Cook <span class="fw-300">sent a <span
                          class="text-danger">new signal</span></span></span>
                        <span class="msg-a fs-sm mt-2">Nanotechnology immersion along the information highway will close the loop on focusing solely on the bottom line.</span>
                        <span class="fs-nano text-muted mt-1">10 minutes ago</span>
                      </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </li>
                  <li class="alert alert-dismissable">
                    <div class="d-flex align-items-center show-child-on-hover">
                      <div class="d-flex flex-column flex-1">
                        <span class="name">Lab Images <span class="fw-300">were updated!</span></span>
                        <div class="fs-sm d-flex align-items-center mt-1">
                          <a href="javascript:void(0)" class="ms-1 mt-1" title="Cell A-0012">
                            <span class="d-block img-share"
                                  [style.background-image]="'url(/assets/img/thumbs/pic-7.png)'"
                                  style="background-size: cover;"></span>
                          </a>
                          <a href="javascript:void(0)" class="ms-1 mt-1" title="Patient A-473 saliva">
                            <span class="d-block img-share"
                                  [style.background-image]="'url(/assets/img/thumbs/pic-8.png)'"
                                  style="background-size: cover;"></span>
                          </a>
                          <a href="javascript:void(0)" class="ms-1 mt-1" title="Patient A-473 blood cells">
                            <span class="d-block img-share"
                                  [style.background-image]="'url(/assets/img/thumbs/pic-11.png)'"
                                  style="background-size: cover;"></span>
                          </a>
                          <a href="javascript:void(0)" class="ms-1 mt-1" title="Patient A-473 Membrane O.C">
                            <span class="d-block img-share"
                                  [style.background-image]="'url(/assets/img/thumbs/pic-12.png)'"
                                  style="background-size: cover;"></span>
                          </a>
                        </div>
                        <span class="fs-nano text-muted mt-1">55 minutes ago</span>
                      </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </li>
                  <li class="alert alert-dismissable">
                    <div class="d-flex align-items-center show-child-on-hover">
                      <div class="d-flex flex-column flex-1 w-100">
                        <div class="name mb-2"> Lisa Lamar<span class="fw-300"> updated project</span>
                        </div>
                        <div class="row fs-b fw-300">
                          <div class="col text-start"> Progress</div>
                          <div class="col text-end fw-500"> 45%</div>
                        </div>
                        <div class="progress progress-sm d-flex mt-1">
                          <span class="progress-bar bg-primary progress-bar-striped" role="progressbar"
                                style="width: 45%" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100"></span>
                        </div>
                        <span class="fs-nano text-muted mt-1">2 hrs ago</span>
                      </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </li>
                </ul>
              </ngx-simplebar>
            </ng-template>
          </li>

          <li [ngbNavItem]="3">
            <a ngbNavLink class="px-4 fs-md fw-500">Events</a>
            <ng-template ngbNavContent>

              <div class="d-flex flex-column h-100">
                <div class="h-auto">
                  <table class="table-calendar m-0 w-100 h-100 border-0">
                    <tr>
                      <th colspan="7" class="pt-3 pb-2 px-3 text-center">
                        <div class="js-get-date h6 fw-600 mb-2">Fake Day, October 15th, 2090</div>
                      </th>
                    </tr>
                    <tr class="text-center">
                      <th>Sun</th>
                      <th>Mon</th>
                      <th>Tue</th>
                      <th>Wed</th>
                      <th>Thu</th>
                      <th>Fri</th>
                      <th>Sat</th>
                    </tr>
                    <tr>
                      <td class="text-muted bg-faded">30</td>
                      <td>1</td>
                      <td>2</td>
                      <td>3</td>
                      <td>4</td>
                      <td>5</td>
                      <td>
                        <svg class="sa-icon sa-icon-warning m-1 position-absolute pos-left pos-top"
                             style="--sa-icon-size: 0.85rem; --sa-fill-opacity: 0.5;">
                          <use href="/assets/icons/sprite.svg#star"></use>
                        </svg>
                        6
                      </td>
                    </tr>
                    <tr>
                      <td>7</td>
                      <td>8</td>
                      <td>9</td>
                      <td class="bg-primary-600 text-white pattern-0">10</td>
                      <td>11</td>
                      <td>12</td>
                      <td>13</td>
                    </tr>
                    <tr>
                      <td>14</td>
                      <td>15</td>
                      <td>16</td>
                      <td>17</td>
                      <td>18</td>
                      <td>19</td>
                      <td>20</td>
                    </tr>
                    <tr>
                      <td>21</td>
                      <td>
                        <svg class="sa-icon sa-icon-info m-1 position-absolute pos-left pos-top"
                             style="--sa-icon-size: 0.85rem; --sa-fill-opacity: 0.5;">
                          <use href="/assets/icons/sprite.svg#shield"></use>
                        </svg>
                        22
                      </td>
                      <td>23</td>
                      <td>24</td>
                      <td>25</td>
                      <td>26</td>
                      <td>27</td>
                    </tr>
                    <tr>
                      <td>28</td>
                      <td>29</td>
                      <td>30</td>
                      <td>31</td>
                      <td class="text-muted bg-faded">1</td>
                      <td class="text-muted bg-faded">2</td>
                      <td class="text-muted bg-faded">3</td>
                    </tr>
                  </table>
                </div>
                <ngx-simplebar style="max-height: 130px">
                  <div class="flex-1  shadow-inset-3 h-100">
                    <div class="p-2">
                      <div class="d-flex align-items-center text-left mb-3">
                        <div
                          class="width-5 text-primary align-self-start table-calendar-appointment-date fw-300 text-center">
                          15
                        </div>
                        <div class="flex-1">
                          <div class="d-flex flex-column">
                                    <span class="l-h-n fs-md fw-500">
                                        October 2020
                                    </span>
                            <span class="l-h-n fs-nano fw-400 text-secondary">
                                        Monday
                                    </span>
                          </div>
                          <div class="d-flex flex-column gap-2 mt-2">
                            <div>
                              <strong>2:30PM</strong> - Doctor's appointment
                            </div>
                            <div>
                              <strong>3:30PM</strong> - Report overview
                            </div>
                            <div>
                              <strong>4:30PM</strong> - Meeting with Donnah V.
                            </div>
                            <div>
                              <strong>5:30PM</strong> - Late Lunch
                            </div>
                            <div>
                              <strong>6:30PM</strong> - Report Compression
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ngx-simplebar>
              </div>
            </ng-template>
          </li>
        </ul>
        <div [ngbNavOutlet]="nav" class="tab-content tab-notification">
        </div>
        <div class="py-2 px-3 d-block rounded-bottom text-end">
          <a href="#" class="fs-xs fw-500 ms-auto">view all notifications</a>
        </div>
      </div>
    </div>

  `,
  styles: ``
})
export class NotificationDropdown {
  allNotifications = notifications;
  activeTab = 0;

  removeNotification(index: number) {
    this.allNotifications.splice(index, 1);
  }
}
