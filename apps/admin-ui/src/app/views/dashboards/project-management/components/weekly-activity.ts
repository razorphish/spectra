import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {weeklyActivityChartOptions} from '@/app/views/dashboards/project-management/data';

@Component({
  selector: 'app-weekly-activity',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title>Weekly <span class="fw-light"><i>Activity</i></span></h2>
      <div class="panel-content" card-content>
        <app-apexchart [getOptions]="weeklyActivityChartOptions"/>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class WeeklyActivity {

  protected readonly weeklyActivityChartOptions = weeklyActivityChartOptions;
}
