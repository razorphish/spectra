import {Component, inject} from '@angular/core';
import {AppLogo} from '@app/components/app-logo';
import {LayoutService} from '@core/services/layout-store.service';
import {VirtualAssistant} from '@layouts/components/topbar/components/virtual-assistant';
import {ToggleSidenav} from '@layouts/components/topbar/components/toggle-sidenav';
import {NotificationDropdown} from '@layouts/components/topbar/components/notification-dropdown';
import {ToggleMobileMenu} from '@layouts/components/topbar/components/toggle-mobile-menu';
import {ProfileDropdown} from '@layouts/components/topbar/components/profile-dropdown';
import {ToggleFullscreen} from '@layouts/components/topbar/components/toggle-fullscreen';

@Component({
  selector: 'app-topbar',
  imports: [
    AppLogo,
    VirtualAssistant,
    ToggleSidenav,
    NotificationDropdown,
    ToggleMobileMenu,
    ProfileDropdown,
    ToggleFullscreen,
  ],
  templateUrl: './topbar.html',
  styles: ``
})
export class Topbar {
  layoutStore = inject(LayoutService);

  toggleTheme() {
    this.layoutStore.changeTheme(this.layoutStore.theme === 'light' ? 'dark' : 'light')
  }
}
