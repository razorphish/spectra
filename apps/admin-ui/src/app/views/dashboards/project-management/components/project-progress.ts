import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {projectProgressChartOptions} from '@/app/views/dashboards/project-management/data';

@Component({
  selector: 'app-project-progress',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card [panelLocked]="true">
        <h2 card-title>Project <span class="fw-light"><i>Progress</i></span></h2>

        <div class="panel-content" card-content>
          <app-apexchart [getOptions]="projectProgressChartOptions"/>
        </div>
    </app-panel-card>
  `,
  styles: ``
})
export class ProjectProgress {

  protected readonly projectProgressChartOptions = projectProgressChartOptions;
}
