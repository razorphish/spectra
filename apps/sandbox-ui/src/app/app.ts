import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'sandbox-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'sandbox-ui';
}
