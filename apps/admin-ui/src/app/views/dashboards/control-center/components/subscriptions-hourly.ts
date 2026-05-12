import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {getSubscriptionsChartOptions} from '@/app/views/dashboards/control-center/components/data';

@Component({
  selector: 'app-subscriptions-hourly',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title> Subscriptions <span class="fw-light"><i>Hourly</i></span></h2>

      <div class="panel-content" card-content>
        <app-apexchart [getOptions]="getSubscriptionsChartOptions"/>
      </div>
    </app-panel-card>

  `,
  styles: ``
})
export class SubscriptionsHourly {

  protected readonly getSubscriptionsChartOptions = getSubscriptionsChartOptions;
}
