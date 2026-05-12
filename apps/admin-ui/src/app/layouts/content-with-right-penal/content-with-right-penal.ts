import {Component} from '@angular/core';
import {Footer} from "@layouts/components/footer/footer";
import {Sidenav} from "@layouts/components/sidenav/sidenav";
import {Topbar} from "@layouts/components/topbar/topbar";

@Component({
  selector: 'app-content-with-right-penal',
  imports: [
    Footer,
    Sidenav,
    Topbar
  ],
  templateUrl: './content-with-right-penal.html',
  styles: ``
})
export class ContentWithRightPenal {

}
