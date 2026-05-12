import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {dataStreamChartOptions} from '@/app/views/dashboards/subscription/data';

@Component({
  selector: 'app-data-stream',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title> Data <span class="fw-light"><i>Stream</i></span>
      </h2>
      <div card-content class="panel-content">
        <app-apexchart [getOptions]="dataStreamChartOptions"/>
      </div>

    </app-panel-card>
  `,
  styles: ``
})
export class DataStream {

  protected readonly dataStreamChartOptions = dataStreamChartOptions;
}
