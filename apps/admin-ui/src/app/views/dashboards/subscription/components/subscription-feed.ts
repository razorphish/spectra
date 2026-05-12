import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {NgbProgressbar} from '@ng-bootstrap/ng-bootstrap';
import {Apexchart} from '@app/components/apexchart';
import {getSubscriptionChartOptions} from '@/app/views/dashboards/subscription/data';

type Metric = {
  label: string
  value: number
  variant?: string
}

@Component({
  selector: 'app-subscription-feed',
  imports: [
    PanelCard,
    NgbProgressbar,
    Apexchart
  ],
  template: `
    <app-panel-card containerClass="border-faded border-start-0 border-end-0 border-bottom-0" [panelLocked]="true">
      <h2 card-title> Subscription <span class="fw-light"><i>Feed</i></span>
      </h2>

      <div card-content class="panel-content p-0">
        <div class="row row-grid g-0">
          <div class="col-sm-4 p-3" style="background: var(--app-nav-item-active-bg);">
            @for (metric of metrics; track $index; let first = $first) {
              <div class="d-flex {{first ? 'mt-3' : '' }}">
                <span class="h6 m-0 fw-300">{{ metric.label }}</span>
                <span class="h6 d-inline-block ms-auto">{{ metric.value }}%</span>
              </div>
              <ngb-progressbar [value]="metric.value" [type]="metric.variant ? metric.variant : 'primary'"
                               class="mb-4 border shadow-inset-3"
                               [striped]="true"/>
            }
          </div>
          <div class="col-sm-8 p-3 bg-subtlelight-fade">
            <app-apexchart [getOptions]="getSubscriptionChartOptions"/>
            <div id="subscription-chart"></div>
          </div>
        </div>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class SubscriptionFeed {
   metrics: Metric[] = [
    { label: 'Conversion Rate', value: 65 },
    { label: 'Completion Rate', value: 50 },
    { label: 'Retention Rate', value: 75 },
    { label: 'Engagement Rate', value: 84 },
    { label: 'Marketing Budget', value: 97, variant: 'danger' },
  ]
  protected readonly getSubscriptionChartOptions = getSubscriptionChartOptions;
}
