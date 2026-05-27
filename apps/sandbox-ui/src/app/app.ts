import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';

@Component({
  imports: [RouterModule, AsyncPipe, JsonPipe],
  selector: 'sandbox-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly window = window;
  protected readonly auth0Configured = Boolean(
    environment.auth0.domain?.trim() && environment.auth0.clientId?.trim(),
  );
  protected readonly auth = inject(AuthService);
}
