import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SiteFooterComponent } from './layout/site-footer.component';
import { SiteHeaderComponent } from './layout/site-header.component';

@Component({
  imports: [RouterModule, SiteHeaderComponent, SiteFooterComponent],
  selector: 'spectra-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'spectra-ui';
}
