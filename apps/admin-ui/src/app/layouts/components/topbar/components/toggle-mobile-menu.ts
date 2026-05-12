import {Component, inject} from '@angular/core';
import {LayoutService} from '@core/services/layout-store.service';

@Component({
  selector: 'app-toggle-mobile-menu',
  imports: [],
  template: `
    <button class="mobile-menu-icon me-2 d-flex d-sm-flex d-md-flex d-lg-none flex-shrink-0" data-action="toggle-swap"
            (click)="toggleSidebar()">
      <svg class="sa-icon">
        <use href="/assets/icons/sprite.svg#menu"></use>
      </svg>
    </button>
  `,
  styles: ``
})
export class ToggleMobileMenu {
  private layoutService = inject(LayoutService);

  toggleSidebar() {
    const html = document.documentElement;
    html.classList.toggle('app-mobile-menu-open');
    this.layoutService.showBackdrop();
  }
}
