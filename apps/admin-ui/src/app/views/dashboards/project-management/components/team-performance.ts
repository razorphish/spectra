import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {teamPerformanceChartOptions} from '@/app/views/dashboards/project-management/data';

@Component({
  selector: 'app-team-performance',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title>Team <span class="fw-light"><i>Performance</i></span></h2>
      <div class="panel-content" card-content>
        <app-apexchart [getOptions]="teamPerformanceChartOptions"/>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class TeamPerformance {

  protected readonly teamPerformanceChartOptions = teamPerformanceChartOptions;
}
