import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-app-logo',
  imports: [
    RouterLink
  ],
  template: `
    <a routerLink="/dashboards/control-center" class="app-logo flex-shrink-0" data-prefix="v5.2.0"
       data-action="playsound" data-soundpath="media/sound/" data-soundfile="sawhisp.mp3">

      <svg class="custom-logo">
        <use href="/assets/img/app-logo.svg#custom-logo"></use>
      </svg>
    </a>
  `,
  styles: ``
})
export class AppLogo {

}
