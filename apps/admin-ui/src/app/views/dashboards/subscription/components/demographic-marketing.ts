import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {demoGraphicChartOptions} from '@/app/views/dashboards/subscription/data';

@Component({
  selector: 'app-demographic-marketing',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title> Demographic <span class="fw-light"><i>Marketing</i></span>
      </h2>
      <div class="panel-content" card-content>
        <app-apexchart [getOptions]="demoGraphicChartOptions"/>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class DemographicMarketing {

  protected readonly demoGraphicChartOptions = demoGraphicChartOptions;
}
