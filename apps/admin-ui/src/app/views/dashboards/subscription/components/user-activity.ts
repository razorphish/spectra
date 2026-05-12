import {Component} from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {userActivityOptions} from '@/app/views/dashboards/subscription/data';

@Component({
  selector: 'app-user-activity',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title> User <span class="fw-light"><i>Activity</i></span>
      </h2>
      <div class="panel-content" card-content>
        <app-apexchart [getOptions]="userActivityOptions"/>
      </div>

    </app-panel-card>
  `,
  styles: ``
})
export class UserActivity {

  protected readonly userActivityOptions = userActivityOptions;
}
