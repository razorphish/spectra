import {Component} from '@angular/core';
import {RouterOutlet} from "@angular/router";
import {Footer} from '../components/footer/footer';
import {Topbar} from '@layouts/components/topbar/topbar';
import {Sidenav} from '@layouts/components/sidenav/sidenav';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    Footer,
    Topbar,
    Sidenav,
  ],
  templateUrl: './main-layout.html',
  styles: ``
})
export class MainLayout {

}
