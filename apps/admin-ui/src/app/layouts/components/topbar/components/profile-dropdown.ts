import {Component} from '@angular/core';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-profile-dropdown',
  imports: [NgbDropdownModule],
  template: `
    <div ngbDropdown>
      <button type="button" ngbDropdownToggle title="drlantern@getwebora.com" data-bs-toggle="dropdown"
              class="btn-system no-arrow bg-transparent d-flex flex-shrink-0 align-items-center justify-content-center"
              aria-label="Open Profile Dropdown">
        <img src="/assets/img/demo/avatars/avatar-admin.png" class="profile-image profile-image-md rounded-circle"
             alt="Sunny A.">
      </button>

      <div ngbDropdownMenu class="dropdown-menu dropdown-menu-animated">
        <div class="notification-header rounded-top mb-2">
          <div class="d-flex flex-row align-items-center mt-1 mb-1 color-white">
                <span class="status status-success d-inline-block me-2">
                    <img src="/assets/img/demo/avatars/avatar-admin.png" class="profile-image rounded-circle"
                         alt="Sunny A.">
                </span>
            <div class="info-card-text">
              <div class="fs-lg text-truncate text-truncate-lg">Sunny A.</div>
              <span class="text-truncate text-truncate-md opacity-80 fs-sm">sunnya&#64;sadim.com</span>
            </div>
          </div>
        </div>

        <div class="dropdown-divider m-0"></div>

        <a href="#" class="dropdown-item" data-action="app-reset" role="button">
          <span data-i18n="drpdwn.reset_layout">Reset Layout</span>
        </a>
        <a href="#" class="dropdown-item" data-action="toggle-swap" data-toggleclass="open"
           data-target="aside.js-drawer-settings" role="button">
          <span data-i18n="drpdwn.settings">Settings</span>
        </a>
        <a href="#" class="dropdown-item d-block d-sm-block d-md-block d-lg-none" data-action="toggle-swap"
           data-toggleclass="open" data-target="aside.js-app-drawer" role="button">
          <span data-i18n="drpdwn.settings">Virtual Assistant</span>
        </a>

        <div class="dropdown-divider m-0"></div>

        <a href="javascript:void(0)" class="dropdown-item d-flex justify-content-between align-items-center"
         (click)="toggleFullscreen()">
          <span data-i18n="drpdwn.fullscreen">Fullscreen</span>
          <b class="text-muted fs-nano px-2 rounded font-monospace align-self-center border">F11</b>
        </a>
        <a href="javascript:void(0)" class="dropdown-item d-flex justify-content-between align-items-center" (click)="print()"
           role="button">
          <span>Print</span>
          <span class="text-muted fs-nano px-2 rounded font-monospace align-self-center border">
                <svg width="15" height="15">
                    <path
                      d="M4.505 4.496h2M5.505 5.496v5M8.216 4.496l.055 5.993M10 7.5c.333.333.5.667.5 1v2M12.326 4.5v5.996M8.384 4.496c1.674 0 2.116 0 2.116 1.5s-.442 1.5-2.116 1.5M3.205 9.303c-.09.448-.277 1.21-1.241 1.203C1 10.5.5 9.513.5 8V7c0-1.57.5-2.5 1.464-2.494.964.006 1.134.598 1.24 1.342M12.553 10.5h1.953"
                      stroke-width="1.2" stroke="currentColor" fill="none" stroke-linecap="square"></path>
                </svg>
                + P
            </span>
        </a>

        <div class="dropdown-multilevel dropdown-multilevel-left">
          <div class="dropdown-item d-flex justify-content-between align-items-center">
            <span data-i18n="drpdwn.language">Language</span>
            <i class="sa sa-chevron-right"></i>
          </div>
          <div class="dropdown-menu">
            <a href="javascript:void(0)" class="dropdown-item">Français</a>
            <a href="javascript:void(0)" class="dropdown-item selected">English (US)</a>
            <a href="javascript:void(0)" class="dropdown-item">Español</a>
            <a href="javascript:void(0)" class="dropdown-item">Русский язык</a>
            <a href="javascript:void(0)" class="dropdown-item">日本語</a>
            <a href="javascript:void(0)" class="dropdown-item">中文</a>
          </div>
        </div>

        <div class="dropdown-divider m-0"></div>

        <a class="dropdown-item py-3 fw-500 d-flex justify-content-between" href="/auth/login">
          <span class="text-danger" data-i18n="drpdwn.page-logout">Logout</span>
          <span class="d-block text-truncate text-truncate-sm">&#64;sunnyahmed</span>
        </a>
      </div>
    </div>
  `,
  styles: ``
})
export class ProfileDropdown {
  print() {
    window.print();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
}
