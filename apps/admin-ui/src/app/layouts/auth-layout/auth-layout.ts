import { Component } from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {BackgroundAnimationComponent} from '@app/components/background-animation';

@Component({
  selector: 'app-auth-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    BackgroundAnimationComponent
  ],
  templateUrl: './auth-layout.html',
  styles: ``
})
export class AuthLayout {

}
