import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {taskStatusChartOptions} from '@/app/views/dashboards/project-management/data';

@Component({
  selector: 'app-task-status',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title>Task <span class="fw-light"><i>Status</i></span></h2>
      <div class="panel-content" card-content>
       <app-apexchart [getOptions]="taskStatusChartOptions"/>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class TaskStatus {

  protected readonly taskStatusChartOptions = taskStatusChartOptions;
}
