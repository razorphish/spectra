import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-custom-endpoints-shell',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class CustomEndpointsShellPageComponent {}
