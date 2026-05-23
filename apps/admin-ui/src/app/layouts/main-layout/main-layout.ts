import { afterNextRender, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../components/footer/footer';
import { Topbar } from '@layouts/components/topbar/topbar';
import { Sidenav } from '@layouts/components/sidenav/sidenav';
import { SidebarNavVisibilityService } from '@core/services/sidebar-nav-visibility.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Footer, Topbar, Sidenav],
  templateUrl: './main-layout.html',
  styles: ``,
})
export class MainLayout {
  constructor() {
    const vis = inject(SidebarNavVisibilityService);
    afterNextRender(() => void vis.ensureLoaded());
  }
}
