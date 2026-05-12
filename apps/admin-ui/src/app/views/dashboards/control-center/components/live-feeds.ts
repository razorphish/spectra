import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {getLiveFeedsChartOptions, statisticsData} from '@/app/views/dashboards/control-center/components/data';
import {StatisticWidgetWithChart} from '@/app/views/dashboards/control-center/components/statistic-widget-with-chart';
import {NgbProgressbarModule} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-live-feeds',
  imports: [
    PanelCard,
    Apexchart,
    NgbProgressbarModule,
    StatisticWidgetWithChart
  ],
  template: `
    <app-panel-card [panelLocked]="true">
      <h2 card-title> Live <span class="fw-light"><i>Feeds</i></span>
      </h2>
      <ng-content card-content>
        <div class="panel-content border-faded border-end-0 border-start-0 border-top-0 pt-0">
          <div class="row g-0">
            <div class="col-lg-7 col-xl-8">
              <app-apexchart [getOptions]="getLiveFeedsChartOptions"/>
            </div>
            <div class="col-lg-5 col-xl-4 ps-lg-3">


                @for (task of tasks; track $index) {
                <div class="d-flex mt-2">
                  {{ task.label }}
                  <span class="d-inline-block ms-auto">{{ task.value }}</span>
                </div>
                <ngb-progressbar
                  [value]="task.progress"
                  height="0.5rem"
                  [striped]="false"
                  [animated]="false"
                    [type]="task.color"
                  class="progress-sm mb-4 bg-opacity-75"/>
                }

              <div class="row no-gutters">
                <div class="col-6 pe-1">
                  <button type="button" class="btn btn-default btn-block">Generate PDF</button>
                </div>
                <div class="col-6 ps-1">
                  <button type="button" class="btn btn-default btn-block">Report a Bug</button>
                </div>
              </div>
            </div>

          </div>
        </div>
        <div class="panel-content p-0">
          <div class="row row-grid g-0">
            @for (item of statisticsData; track $index) {
              <div class="col-sm-12 col-md-6 col-lg-6 col-xl-6 col-xxl-3">
                <app-statistic-widget-with-chart [item]="item"/>
              </div>
            }

          </div>
        </div>
      </ng-content>
    </app-panel-card>

  `,
  styles: ``
})
export class LiveFeeds {

  protected readonly getLiveFeedsChartOptions = getLiveFeedsChartOptions;
  protected readonly statisticsData = statisticsData;

  tasks = [
    { label: 'My Tasks', value: '130 / 500', progress: 65, color: 'dark' },
    { label: 'Transferred', value: '440 TB', progress: 34, color: 'success' },
    { label: 'Resolved Issues', value: '77%', progress: 77, color: 'info' },
    { label: 'Testing Progress', value: '7 days', progress: 84, color: 'primary' }
  ];
}
