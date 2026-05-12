import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {getEfficiencyMetricsChartOptions, metricStatistics} from '@/app/views/dashboards/marketing/data';
import {MetricStatsWithChart} from '@/app/views/dashboards/marketing/components/metric-stats-with-chart';
import {Apexchart} from '@app/components/apexchart';

@Component({
  selector: 'app-efficiency-metrics',
  imports: [
    PanelCard,
    MetricStatsWithChart,
    Apexchart
  ],
  template: `
    <app-panel-card [isRefreshable]="true">
      <h2 card-title> Efficiency <span class="fw-light"><i>Metrics</i></span></h2>
      <div class="panel-content" card-content>
        <div class="p-3">
          <div class="row">
            @for (item of metricStatistics; track $index) {
              <app-metric-stats-with-chart
                [data]="item.data"
                [label]="item.label"
                [variant]="item.variant"
                [value]="item.value"
                class="col-6 col-xl-6 col-xxl-3 d-sm-flex align-items-center mb-3"
              />
            }
          </div>
        </div>
        <app-apexchart [getOptions]="getEfficiencyMetricsChartOptions"/>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class EfficiencyMetrics {

  protected readonly metricStatistics = metricStatistics;
  protected readonly getEfficiencyMetricsChartOptions = getEfficiencyMetricsChartOptions;
}
