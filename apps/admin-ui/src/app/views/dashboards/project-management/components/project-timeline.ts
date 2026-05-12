import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {projectTimelineChartOptions} from '@/app/views/dashboards/project-management/data';

@Component({
  selector: 'app-project-timeline',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title>Project <span class="fw-light"><i>Timeline</i></span></h2>
      <div class="btn-group project-timeline-filters" card-toolbar>
        <button type="button" class="btn btn-xs btn-outline-default"  [class.active]="view === 'tasks'"
                (click)="setView('tasks')">Tasks
        </button>
        <button type="button" class="btn btn-xs btn-outline-default"  [class.active]="view === 'phases'"
                (click)="setView('phases')">Project
          Phases
        </button>
      </div>
      <div class="panel-content" card-content>
        <app-apexchart [getOptions]="projectTimelineChartOptions" [series]="series"/>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class ProjectTimeline {

  view: 'tasks' | 'phases' = 'tasks';

  seriesTasks = [
    {
      name: 'Frontend',
      data: [
        { x: 'Design', y: [new Date('2023-03-05').getTime(), new Date('2023-03-15').getTime()] },
        { x: 'Testing', y: [new Date('2023-03-25').getTime(), new Date('2023-04-05').getTime()] },
        { x: 'Integration Testing', y: [new Date('2023-04-05').getTime(), new Date('2023-04-20').getTime()] }
      ]
    },
    {
      name: 'Backend',
      data: [
        { x: 'Development', y: [new Date('2023-03-10').getTime(), new Date('2023-03-30').getTime()] },
        { x: 'API Design', y: [new Date('2023-03-08').getTime(), new Date('2023-03-20').getTime()] },
        { x: 'Implementation', y: [new Date('2023-03-20').getTime(), new Date('2023-04-05').getTime()] }
      ]
    },
    {
      name: 'Database',
      data: [
        { x: 'Schema Design', y: [new Date('2023-03-10').getTime(), new Date('2023-03-25').getTime()] },
        { x: 'Data Migration', y: [new Date('2023-03-25').getTime(), new Date('2023-04-10').getTime()] },
        { x: 'Performance Testing', y: [new Date('2023-04-10').getTime(), new Date('2023-04-25').getTime()] }
      ]
    }
  ];

  seriesPhases = [
    {
      name: 'Project Phases',
      data: [
        { x: 'Research', y: [new Date('2023-03-01').getTime(), new Date('2023-03-05').getTime()], fillColor: '#4FC3F7' },
        { x: 'Design', y: [new Date('2023-03-06').getTime(), new Date('2023-03-10').getTime()], fillColor: '#4DB6AC' },
        { x: 'Development', y: [new Date('2023-03-11').getTime(), new Date('2023-03-25').getTime()], fillColor: '#FFB74D' },
        { x: 'Testing', y: [new Date('2023-03-26').getTime(), new Date('2023-04-10').getTime()], fillColor: '#F06292' },
        { x: 'Deployment', y: [new Date('2023-04-11').getTime(), new Date('2023-04-25').getTime()], fillColor: '#9575CD' }
      ]
    }
  ];


  get series() {
    return this.view === 'tasks' ? this.seriesTasks : this.seriesPhases;
  }

  setView(view: 'tasks' | 'phases') {
    this.view = view;
  }

  protected readonly projectTimelineChartOptions = projectTimelineChartOptions;
}
