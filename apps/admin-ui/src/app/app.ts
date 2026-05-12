import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import Waves from 'node-waves';
import { provideIcons } from '@ng-icons/core';
import * as fontAwesomeSolidIcons from '@ng-icons/font-awesome/solid';
import * as fontAwesomeBrandIcons from '@ng-icons/font-awesome/brands';
import * as fontAwesomeRegularIcons from '@ng-icons/font-awesome/regular';
import { Title } from '@angular/platform-browser';
import { filter, map, mergeMap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  viewProviders: [
    provideIcons({
      ...fontAwesomeSolidIcons,
      ...fontAwesomeBrandIcons,
      ...fontAwesomeRegularIcons,
    }),
  ],
})
export class App implements AfterViewInit, OnInit {
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  ngAfterViewInit(): void {
    Waves.attach('.waves-effect', ['waves-light']);
    Waves.init();
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute;
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        mergeMap((route) => route.data),
      )
      .subscribe((data) => {
        if (data['title']) {
          this.titleService.setTitle(
            `${data['title'] as string} | Spectra Admin`,
          );
        }
      });
  }
}
